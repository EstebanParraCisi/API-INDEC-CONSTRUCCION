import type { Punto } from "./types";
import { MESES_CORTOS, partes, periodo } from "./periodo";

export type FilaMes = { mes: string } & Record<string, number | null | string>;

/** Para gráficos "2025 vs 2026": una fila por mes (Ene..Dic) con una columna por año. */
export function porMes(puntos: Punto[], anios: number[] = [2025, 2026], hasta12 = true): FilaMes[] {
  const mapa = new Map(puntos.map((p) => [p.periodo, p.valor]));
  return MESES_CORTOS.slice(0, hasta12 ? 12 : 12).map((m, i) => {
    const fila: FilaMes = { mes: m };
    for (const a of anios) fila[String(a)] = mapa.get(periodo(a, i + 1)) ?? null;
    return fila;
  });
}

/** Serie continua (para dólar, tasas): una fila por período desde 'desde'. */
export function continua(series: Record<string, Punto[]>, desde = "2025-01"): FilaMes[] {
  const periodos = new Set<string>();
  for (const pts of Object.values(series)) for (const p of pts) if (p.periodo >= desde) periodos.add(p.periodo);
  return [...periodos].sort().map((p) => {
    const { anio, mes } = partes(p);
    const fila: FilaMes = { mes: `${MESES_CORTOS[mes - 1]} ${String(anio).slice(2)}` };
    for (const [k, pts] of Object.entries(series)) fila[k] = pts.find((x) => x.periodo === p)?.valor ?? null;
    return fila;
  });
}
