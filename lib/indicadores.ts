/**
 * Cálculo de KPIs y helpers de presentación. Funciones puras: sirven en servidor y cliente.
 */
import { acumulado, acumuladoPrecios, ultimoPeriodoHasta, valorEn, varInteranual, varMensual } from "./calc";
import { nombreMes, periodo as mkPeriodo, partes } from "./periodo";
import type { Serie } from "./types";

export type Series = Record<string, Serie>;

/** Serie vacía cuando falta el JSON: la app muestra "sin dato" en vez de romperse. */
export function obtener(series: Series, id: string): Serie {
  return (
    series[id] ?? {
      id,
      nombre: id,
      unidad: "",
      frecuencia: "mensual",
      naturaleza: "nivel",
      fuente: "—",
      fuenteUrl: "",
      actualizado: "",
      ultimoPeriodo: null,
      datos: [],
    }
  );
}

export type Impacto = "favorable" | "desfavorable" | "neutro" | "sin-dato";
/** Cómo impacta en el negocio que el número suba (el semáforo NO es el signo del número). */
export type Sentido = "sube-bueno" | "sube-malo" | "neutro";

export function impacto(variacion: number | null, sentido: Sentido, umbral = 0.01): Impacto {
  if (variacion === null) return "sin-dato";
  if (sentido === "neutro" || Math.abs(variacion) < umbral) return "neutro";
  const sube = variacion > 0;
  return (sentido === "sube-bueno") === sube ? "favorable" : "desfavorable";
}

export type Medida = {
  /** Período efectivamente usado (puede ser anterior al de referencia si la fuente se demora). */
  periodo: string | null;
  valor: number | null;
  mm: number | null;
  ia: number | null;
  acum: number | null;
  /** Acumulado del mismo período del año anterior (p.ej. ene–sep 2025 vs ene–sep 2024). */
  acumAnterior: number | null;
  obs?: string;
};

export function medir(serie: Serie, ref: string, modoAcum?: "precios"): Medida {
  const p = ultimoPeriodoHasta(serie, ref);
  if (!p) return { periodo: null, valor: null, mm: null, ia: null, acum: null, acumAnterior: null };
  const { anio, mes } = partes(p);
  const pAnt = mkPeriodo(anio - 1, mes);
  const acumFn = modoAcum === "precios" ? acumuladoPrecios : (s: Serie, x: string) => acumulado(s, x);
  return {
    periodo: p,
    valor: valorEn(serie, p),
    mm: varMensual(serie, p),
    ia: varInteranual(serie, p),
    acum: acumFn(serie, p),
    acumAnterior: acumFn(serie, pAnt),
    obs: serie.datos.find((d) => d.periodo === p)?.obs,
  };
}

export type Kpi = {
  id: string;
  titulo: string;
  serie: Serie;
  medida: Medida;
  formatoValor: "indice" | "pesos" | "toneladas" | "m2" | "cantidad" | "pct";
  sentido: Sentido;
  impacto: Impacto;
  /** Texto corto que explica el semáforo. */
  explicacion: string;
  etiquetaAcum: string;
  etiquetaAcumAnterior: string;
  extra?: string;
  adelantado?: boolean;
};

function etiquetaAcumAnterior(m: Medida, precios = false): string {
  if (!m.periodo) return "Mismo período 2025";
  const { anio, mes } = partes(m.periodo);
  if (precios) return `Mismo período ${anio - 1}`;
  return mes === 1 ? `Enero ${anio - 1} vs ${anio - 2}` : `Ene–${nombreMes(m.periodo).slice(0, 3)} ${anio - 1} vs ${anio - 2}`;
}

function etiquetaAcum(m: Medida, precios = false): string {
  if (!m.periodo) return "Acumulado 2026";
  const mes = partes(m.periodo).mes;
  if (precios) return `Acumulado ${partes(m.periodo).anio} (desde dic.)`;
  return mes === 1 ? `Enero vs enero ${partes(m.periodo).anio - 1}` : `Ene–${nombreMes(m.periodo).slice(0, 3)} vs ${partes(m.periodo).anio - 1}`;
}

export function calcularKpis(series: Series, ref: string): Kpi[] {
  const isac = obtener(series, "isac_general");
  const icc = obtener(series, "icc_general");
  const ipc = obtener(series, "ipc_gba");
  const cem = obtener(series, "despachos_cemento");
  const perm = obtener(series, "permisos_superficie");
  const hip = obtener(series, "escrituras_pba_hipotecas");
  const dol = obtener(series, "dolar_mayorista");

  const mIsac = medir(isac, ref);
  const mIcc = medir(icc, ref);
  const mIpc = medir(ipc, mIcc.periodo ?? ref);
  const mCem = medir(cem, ref);
  const mPerm = medir(perm, ref);
  const mHip = medir(hip, ref);
  const mDol = medir(dol, ref, "precios");

  const brecha = mIcc.ia !== null && mIpc.ia !== null && mIpc.periodo === mIcc.periodo ? mIcc.ia - mIpc.ia : null;

  return [
    {
      id: "isac",
      titulo: "Actividad de la construcción (ISAC)",
      serie: isac,
      medida: mIsac,
      formatoValor: "indice",
      sentido: "sube-bueno",
      impacto: impacto(mIsac.ia, "sube-bueno"),
      explicacion: "Más actividad = más demanda de materiales.",
      etiquetaAcum: etiquetaAcum(mIsac),
      etiquetaAcumAnterior: etiquetaAcumAnterior(mIsac),
    },
    {
      id: "icc",
      titulo: "Costo de la construcción (ICC) vs inflación",
      serie: icc,
      medida: mIcc,
      formatoValor: "pct",
      sentido: "sube-malo",
      impacto: impacto(brecha, "sube-malo"),
      explicacion: "Rojo si construir se encarece más que la inflación (frena obras).",
      etiquetaAcum: etiquetaAcum(mIcc, true),
      etiquetaAcumAnterior: etiquetaAcumAnterior(mIcc, true),
      extra: mIpc.ia !== null ? `Inflación GBA i.a.: ${fmtPctCorto(mIpc.ia)}` : undefined,
    },
    {
      id: "cemento",
      titulo: "Despachos de cemento",
      serie: cem,
      medida: mCem,
      formatoValor: "toneladas",
      sentido: "sube-bueno",
      impacto: impacto(mCem.ia, "sube-bueno"),
      explicacion: "Más cemento despachado = más obra en marcha.",
      etiquetaAcum: etiquetaAcum(mCem),
      etiquetaAcumAnterior: etiquetaAcumAnterior(mCem),
    },
    {
      id: "permisos",
      titulo: "Permisos de edificación (superficie)",
      serie: perm,
      medida: mPerm,
      formatoValor: "m2",
      sentido: "sube-bueno",
      impacto: impacto(mPerm.ia, "sube-bueno"),
      explicacion: "Indicador adelantado: anticipa obras en 3–6 meses.",
      etiquetaAcum: etiquetaAcum(mPerm),
      etiquetaAcumAnterior: etiquetaAcumAnterior(mPerm),
      adelantado: true,
    },
    {
      id: "hipotecas",
      titulo: "Hipotecas en Provincia de Buenos Aires",
      serie: hip,
      medida: mHip,
      formatoValor: "cantidad",
      sentido: "sube-bueno",
      impacto: impacto(mHip.ia, "sube-bueno"),
      explicacion: "Más crédito = más compraventas y refacciones.",
      etiquetaAcum: etiquetaAcum(mHip),
      etiquetaAcumAnterior: etiquetaAcumAnterior(mHip),
    },
    {
      id: "dolar",
      titulo: "Dólar mayorista (promedio del mes)",
      serie: dol,
      medida: mDol,
      formatoValor: "pesos",
      sentido: "neutro",
      impacto: mDol.valor === null ? "sin-dato" : "neutro",
      explicacion: "Neutro: encarece insumos importados pero también abarata la obra en dólares.",
      etiquetaAcum: etiquetaAcum(mDol, true),
      etiquetaAcumAnterior: etiquetaAcumAnterior(mDol, true),
    },
  ];
}

function fmtPctCorto(x: number): string {
  return `${(x * 100).toFixed(1).replace(".", ",")}%`;
}

/** Meses de 2026 que se pueden elegir como referencia: desde enero hasta el último con ISAC o ICC. */
export function mesesDisponibles(series: Series, anio = 2026): string[] {
  const ult = [obtener(series, "isac_general").ultimoPeriodo, obtener(series, "icc_general").ultimoPeriodo]
    .filter((x): x is string => !!x)
    .sort()
    .pop();
  if (!ult || partes(ult).anio < anio) return [];
  const out: string[] = [];
  for (let m = 1; m <= partes(ult).mes; m++) out.push(mkPeriodo(anio, m));
  return out;
}

/** Mes de referencia por defecto: último con ISAC publicado. */
export function mesPorDefecto(series: Series): string {
  const isac = obtener(series, "isac_general").ultimoPeriodo;
  const meses = mesesDisponibles(series);
  if (isac && meses.includes(isac)) return isac;
  return meses[meses.length - 1] ?? "2026-01";
}

/** Ranking i.a. de insumos ISAC en el mes de referencia. */
export const INSUMOS: { id: string; corralon: boolean }[] = [
  { id: "insumo_cemento", corralon: true },
  { id: "insumo_cal", corralon: true },
  { id: "insumo_ladrillos", corralon: true },
  { id: "insumo_hierro", corralon: true },
  { id: "insumo_hormigon", corralon: true },
  { id: "insumo_ceramicos", corralon: true },
  { id: "insumo_sanitarios", corralon: true },
  { id: "insumo_pinturas", corralon: true },
  { id: "insumo_yeso", corralon: true },
  { id: "insumo_placas_yeso", corralon: true },
  { id: "insumo_mosaicos", corralon: false },
  { id: "insumo_asfalto", corralon: false },
];

export type FilaRanking = { id: string; nombre: string; ia: number | null; periodo: string | null; corralon: boolean; desest: boolean };

export function rankingInsumos(series: Series, ref: string): FilaRanking[] {
  return INSUMOS.map(({ id, corralon }) => {
    const s = obtener(series, id);
    const m = medir(s, ref);
    return { id, nombre: s.nombre, ia: m.ia, periodo: m.periodo, corralon, desest: !!s.nota };
  }).sort((a, b) => (b.ia ?? -Infinity) - (a.ia ?? -Infinity));
}
