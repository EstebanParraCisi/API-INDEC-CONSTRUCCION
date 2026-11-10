import type { Punto, Serie } from "./types";
import { partes, periodo, sumarMeses } from "./periodo";

/** Valor de la serie en un período (null si no existe o es "sin dato"). */
export function valorEn(serie: Pick<Serie, "datos">, p: string): number | null {
  const pt = serie.datos.find((d) => d.periodo === p);
  return pt && typeof pt.valor === "number" && Number.isFinite(pt.valor) ? pt.valor : null;
}

function ratio(a: number | null, b: number | null): number | null {
  if (a === null || b === null || b === 0) return null;
  return a / b - 1;
}

/** Variación mensual: v_t / v_{t-1} − 1 (proporción, 0.015 = 1,5%). */
export function varMensual(serie: Pick<Serie, "datos">, p: string): number | null {
  return ratio(valorEn(serie, p), valorEn(serie, sumarMeses(p, -1)));
}

/** Variación interanual: v_t / v_{t-12} − 1. */
export function varInteranual(serie: Pick<Serie, "datos">, p: string): number | null {
  return ratio(valorEn(serie, p), valorEn(serie, sumarMeses(p, -12)));
}

/** Valores de enero..mes(p) del año de p. Devuelve null si falta alguno: nunca se completa. */
function valoresDelAnioHasta(serie: Pick<Serie, "datos">, p: string): number[] | null {
  const { anio, mes } = partes(p);
  const out: number[] = [];
  for (let m = 1; m <= mes; m++) {
    const v = valorEn(serie, periodo(anio, m));
    if (v === null) return null;
    out.push(v);
  }
  return out;
}

/**
 * Acumulado del año contra el mismo período del año anterior.
 * - modo "promedio" (índices de volumen): promedio(ene..t, año) / promedio(ene..t, año−1) − 1
 * - modo "suma" (cantidades físicas): suma(ene..t, año) / suma(ene..t, año−1) − 1
 */
export function acumuladoVsAnioAnterior(serie: Pick<Serie, "datos">, p: string, modo: "promedio" | "suma"): number | null {
  const actual = valoresDelAnioHasta(serie, p);
  const anterior = valoresDelAnioHasta(serie, sumarMeses(p, -12));
  if (!actual || !anterior) return null;
  const agg = (xs: number[]) => {
    const s = xs.reduce((a, b) => a + b, 0);
    return modo === "suma" ? s : s / xs.length;
  };
  return ratio(agg(actual), agg(anterior));
}

/** Acumulado de precios en el año: v_t / v_{dic año anterior} − 1. */
export function acumuladoPrecios(serie: Pick<Serie, "datos">, p: string): number | null {
  const { anio } = partes(p);
  return ratio(valorEn(serie, p), valorEn(serie, periodo(anio - 1, 12)));
}

/** Acumulado según la naturaleza de la serie (la regla de §5 del plan). */
export function acumulado(serie: Pick<Serie, "datos" | "naturaleza">, p: string): number | null {
  switch (serie.naturaleza) {
    case "volumen":
      return acumuladoVsAnioAnterior(serie, p, "promedio");
    case "cantidad":
      return acumuladoVsAnioAnterior(serie, p, "suma");
    case "precio":
      return acumuladoPrecios(serie, p);
    case "nivel":
      return acumuladoVsAnioAnterior(serie, p, "promedio");
  }
}

/** Deflactar: valor_real_t = valor_nominal_t / IPC_t × IPC_base. */
export function deflactar(nominal: Pick<Serie, "datos">, ipc: Pick<Serie, "datos">, base: string): Punto[] {
  const ipcBase = valorEn(ipc, base);
  return nominal.datos.map((d) => {
    const i = valorEn(ipc, d.periodo);
    const valor = d.valor !== null && i !== null && ipcBase !== null && i !== 0 ? (d.valor / i) * ipcBase : null;
    return { periodo: d.periodo, valor };
  });
}

/** Divide una serie por otra período a período (p.ej. pesos → dólares). */
export function dividir(a: Pick<Serie, "datos">, b: Pick<Serie, "datos">): Punto[] {
  return a.datos.map((d) => {
    const div = valorEn(b, d.periodo);
    return { periodo: d.periodo, valor: d.valor !== null && div !== null && div !== 0 ? d.valor / div : null };
  });
}

/** Reexpresa una serie como índice base (período base = 100). */
export function rebasear(puntos: Punto[], base: string): Punto[] {
  const vb = puntos.find((p) => p.periodo === base)?.valor ?? null;
  return puntos.map((p) => ({ periodo: p.periodo, valor: p.valor !== null && vb ? (p.valor / vb) * 100 : null }));
}

/** Agrega datos diarios ("YYYY-MM-DD") a mensuales. */
export function agregarMensual(
  diarios: { fecha: string; valor: number }[],
  modo: "promedio" | "ultimo",
): { periodo: string; valor: number; n: number; ultimaFecha: string }[] {
  const grupos = new Map<string, { fecha: string; valor: number }[]>();
  for (const d of diarios) {
    const p = d.fecha.slice(0, 7);
    if (!grupos.has(p)) grupos.set(p, []);
    grupos.get(p)!.push(d);
  }
  return [...grupos.entries()]
    .sort(([a], [b]) => (a < b ? -1 : 1))
    .map(([p, xs]) => {
      xs.sort((a, b) => (a.fecha < b.fecha ? -1 : 1));
      const valor = modo === "promedio" ? xs.reduce((s, x) => s + x.valor, 0) / xs.length : xs[xs.length - 1].valor;
      return { periodo: p, valor, n: xs.length, ultimaFecha: xs[xs.length - 1].fecha };
    });
}

/** Último período con dato que sea ≤ p (para mostrar "dato de julio" cuando falta agosto). */
export function ultimoPeriodoHasta(serie: Pick<Serie, "datos">, p: string): string | null {
  let best: string | null = null;
  for (const d of serie.datos) {
    if (d.valor !== null && d.periodo <= p && (best === null || d.periodo > best)) best = d.periodo;
  }
  return best;
}

export function ultimoPeriodoConDato(datos: Punto[]): string | null {
  let best: string | null = null;
  for (const d of datos) if (d.valor !== null && (best === null || d.periodo > best)) best = d.periodo;
  return best;
}
