/**
 * Cálculo de KPIs y helpers de presentación. Funciones puras: sirven en servidor y cliente.
 */
import { acumulado, acumuladoPrecios, ultimoPeriodoHasta, valorEn, varInteranual, varMensual } from "./calc";
import { nombreMes, periodo as mkPeriodo, partes } from "./periodo";
import { formatoNumero, formatoPct, formatoPesos } from "./formato";
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
  /** Nombre en castellano llano ("Obras en marcha"). */
  titulo: string;
  /** Nombre técnico, chico al lado del título ("ISAC"). */
  sigla: string;
  serie: Serie;
  medida: Medida;
  /** El número grande: variación contra el mismo mes de 2025. */
  principal: number | null;
  /** Qué compara el número grande ("vs agosto 2025"). */
  principalEtiqueta: string;
  /** Líneas cortas de contexto debajo del número grande. */
  lineas: string[];
  sentido: Sentido;
  impacto: Impacto;
  /** Por qué el color es ese (tooltip). */
  explicacion: string;
};

const pctS = (x: number | null) => formatoPct(x, { signo: true });

function vsMes(m: Medida): string {
  if (!m.periodo) return "";
  const { anio } = partes(m.periodo);
  return `vs ${nombreMes(m.periodo)} ${anio - 1}`;
}

function enElAnio(m: Medida): string | null {
  if (m.acum === null || !m.periodo) return null;
  const { anio, mes } = partes(m.periodo);
  return mes === 1 ? null : `En el año (ene–${nombreMes(m.periodo).slice(0, 3)}): ${pctS(m.acum)} vs ${anio - 1}`;
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
  const mIcc = medir(icc, ref, "precios");
  const mIpc = medir(ipc, mIcc.periodo ?? ref, "precios");
  const mCem = medir(cem, ref);
  const mPerm = medir(perm, ref);
  const mHip = medir(hip, ref);
  const mDol = medir(dol, ref, "precios");

  const brecha = mIcc.ia !== null && mIpc.ia !== null && mIpc.periodo === mIcc.periodo ? mIcc.ia - mIpc.ia : null;
  const lineas = (...xs: (string | null | false)[]) => xs.filter((x): x is string => !!x);

  return [
    {
      id: "isac",
      titulo: "Obras en marcha",
      sigla: "ISAC",
      serie: isac,
      medida: mIsac,
      principal: mIsac.ia,
      principalEtiqueta: vsMes(mIsac),
      lineas: lineas(enElAnio(mIsac)),
      sentido: "sube-bueno",
      impacto: impacto(mIsac.ia, "sube-bueno"),
      explicacion: "Más obra en marcha = más demanda de materiales.",
    },
    {
      id: "icc",
      titulo: "Cuánto cuesta construir",
      sigla: "ICC GBA",
      serie: icc,
      medida: mIcc,
      principal: mIcc.ia,
      principalEtiqueta: mIcc.periodo ? `en un año (a ${nombreMes(mIcc.periodo)})` : "",
      lineas: lineas(
        mIpc.ia !== null && `Inflación en el mismo año: ${pctS(mIpc.ia)}`,
        brecha !== null && (Math.abs(brecha) < 0.01 ? "Construir subió casi igual que la inflación" : brecha < 0 ? "Construir subió menos que la inflación" : "Construir subió más que la inflación"),
      ),
      sentido: "sube-malo",
      impacto: impacto(brecha, "sube-malo"),
      explicacion: "En contra si construir se encarece más que la inflación: frena obras de particulares.",
    },
    {
      id: "cemento",
      titulo: "Venta de cemento",
      sigla: "AFCP",
      serie: cem,
      medida: mCem,
      principal: mCem.ia,
      principalEtiqueta: vsMes(mCem),
      lineas: lineas(mCem.valor !== null && `${formatoNumero(mCem.valor, 0)} toneladas en el mes`, enElAnio(mCem)),
      sentido: "sube-bueno",
      impacto: impacto(mCem.ia, "sube-bueno"),
      explicacion: "Más cemento despachado = más obra.",
    },
    {
      id: "permisos",
      titulo: "Obras que vienen",
      sigla: "permisos de edificación",
      serie: perm,
      medida: mPerm,
      principal: mPerm.ia,
      principalEtiqueta: vsMes(mPerm),
      lineas: lineas(mPerm.valor !== null && `${formatoNumero(mPerm.valor, 0)} m² autorizados en el mes`, enElAnio(mPerm), "Anticipa la demanda de los próximos 3–6 meses"),
      sentido: "sube-bueno",
      impacto: impacto(mPerm.ia, "sube-bueno"),
      explicacion: "Más metros autorizados hoy = más obras (y compras de materiales) en unos meses.",
    },
    {
      id: "hipotecas",
      titulo: "Créditos hipotecarios en PBA",
      sigla: "escrituras",
      serie: hip,
      medida: mHip,
      principal: mHip.ia,
      principalEtiqueta: vsMes(mHip),
      lineas: lineas(mHip.valor !== null && `${formatoNumero(mHip.valor, 0)} hipotecas escrituradas en el mes`, enElAnio(mHip)),
      sentido: "sube-bueno",
      impacto: impacto(mHip.ia, "sube-bueno"),
      explicacion: "Más crédito = más compraventas y refacciones.",
    },
    {
      id: "dolar",
      titulo: "Dólar mayorista",
      sigla: "BCRA",
      serie: dol,
      medida: mDol,
      principal: mDol.ia,
      principalEtiqueta: vsMes(mDol),
      lineas: lineas(mDol.valor !== null && `Promedio del mes: ${formatoPesos(mDol.valor, 2)}`, mDol.acum !== null && `Desde diciembre: ${pctS(mDol.acum)}`),
      sentido: "neutro",
      impacto: mDol.valor === null ? "sin-dato" : "neutro",
      explicacion: "Neutro: encarece lo importado, pero también abarata la obra medida en dólares.",
    },
  ];
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
