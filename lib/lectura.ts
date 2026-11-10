/**
 * "Lectura del mes": frases generadas por REGLAS DETERMINISTAS (no IA).
 * Cada regla tiene un id estable y un test en tests/lectura.test.ts.
 */
import { formatoPct, formatoPP } from "./formato";
import { medir, obtener, rankingInsumos, type Series } from "./indicadores";
import { nombreMes } from "./periodo";

type Dato = { periodo: string | null; mm: number | null; ia: number | null; acum: number | null };

export type Hechos = {
  isac: Dato;
  iccGeneral: Dato;
  iccMateriales: Dato;
  iccManoObra: Dato;
  ipc: Dato;
  permisos: Dato;
  hipotecasPba: Dato;
  /** Mejor y peor insumo de corralón (i.a.), si hay datos. */
  insumoMejor: { nombre: string; ia: number; periodo: string } | null;
  insumoPeor: { nombre: string; ia: number; periodo: string } | null;
};

export type Frase = { regla: string; texto: string };

const mes = (p: string | null) => (p ? nombreMes(p) : "");
const pct = (x: number) => formatoPct(Math.abs(x));
/** Diferencia redondeada a 0,01 p.p. para que 27% − 22% no dé 5,0000001 p.p. */
const dif = (a: number, b: number) => Math.round((a - b) * 10000) / 10000;

type Regla = { id: string; aplica: (h: Hechos) => boolean; texto: (h: Hechos) => string };

/** El orden define la prioridad: se muestran como máximo 6 frases. */
export const REGLAS: Regla[] = [
  {
    id: "actividad-enfria-anio-arriba",
    aplica: (h) => h.isac.ia !== null && h.isac.acum !== null && h.isac.ia < 0 && h.isac.acum > 0,
    texto: (h) =>
      `La actividad cayó ${pct(h.isac.ia!)} interanual en ${mes(h.isac.periodo)}, pero el acumulado del año sigue ${pct(h.isac.acum!)} arriba de 2025: se enfrió en el mes, aunque el año todavía viene mejor.`,
  },
  {
    id: "actividad-crece",
    aplica: (h) => h.isac.ia !== null && h.isac.acum !== null && h.isac.ia >= 0 && h.isac.acum >= 0,
    texto: (h) => `La actividad creció ${pct(h.isac.ia!)} interanual en ${mes(h.isac.periodo)} y el acumulado del año viene ${pct(h.isac.acum!)} arriba de 2025.`,
  },
  {
    id: "actividad-repunta-anio-abajo",
    aplica: (h) => h.isac.ia !== null && h.isac.acum !== null && h.isac.ia >= 0 && h.isac.acum < 0,
    texto: (h) =>
      `La actividad subió ${pct(h.isac.ia!)} interanual en ${mes(h.isac.periodo)}, aunque el acumulado del año todavía está ${pct(h.isac.acum!)} abajo de 2025.`,
  },
  {
    id: "actividad-cae",
    aplica: (h) => h.isac.ia !== null && h.isac.acum !== null && h.isac.ia < 0 && h.isac.acum < 0,
    texto: (h) => `La actividad cayó ${pct(h.isac.ia!)} interanual en ${mes(h.isac.periodo)} y el año acumula ${pct(h.isac.acum!)} abajo de 2025.`,
  },
  {
    id: "mano-obra-mas-que-materiales",
    aplica: (h) => h.iccManoObra.ia !== null && h.iccMateriales.ia !== null && dif(h.iccManoObra.ia, h.iccMateriales.ia) > 0.05,
    texto: (h) =>
      `La mano de obra encarece la obra mucho más que los materiales (${formatoPct(h.iccManoObra.ia!)} contra ${formatoPct(h.iccMateriales.ia!)} interanual en ${mes(h.iccManoObra.periodo)}, ${formatoPP(h.iccManoObra.ia! - h.iccMateriales.ia!)} de diferencia): hay margen relativo en el precio de los materiales frente al costo total de construir.`,
  },
  {
    id: "materiales-bajo-inflacion",
    aplica: (h) =>
      h.iccMateriales.mm !== null && h.ipc.mm !== null && h.iccMateriales.periodo === h.ipc.periodo && h.iccMateriales.mm < h.ipc.mm,
    texto: (h) =>
      `Los materiales subieron ${formatoPct(h.iccMateriales.mm!)} en ${mes(h.iccMateriales.periodo)}, por debajo de la inflación (${formatoPct(h.ipc.mm!)}): atención a márgenes si los costos de reposición suben más que la lista.`,
  },
  {
    id: "construir-mas-caro-que-inflacion",
    aplica: (h) => h.iccGeneral.ia !== null && h.ipc.ia !== null && h.iccGeneral.periodo === h.ipc.periodo && dif(h.iccGeneral.ia, h.ipc.ia) > 0.01,
    texto: (h) =>
      `Construir se encarece más que la vida en general: el costo de la construcción sube ${formatoPct(h.iccGeneral.ia!)} interanual contra ${formatoPct(h.ipc.ia!)} de inflación. Eso puede postergar obras de particulares.`,
  },
  {
    id: "construir-mas-barato-que-inflacion",
    aplica: (h) => h.iccGeneral.ia !== null && h.ipc.ia !== null && h.iccGeneral.periodo === h.ipc.periodo && dif(h.ipc.ia, h.iccGeneral.ia) > 0.01,
    texto: (h) =>
      `Construir se encarece menos que la inflación (${formatoPct(h.iccGeneral.ia!)} contra ${formatoPct(h.ipc.ia!)} interanual): en términos reales la obra se abarata, lo que ayuda a la demanda.`,
  },
  {
    id: "permisos-suben",
    aplica: (h) => h.permisos.ia !== null && h.permisos.ia > 0,
    texto: (h) =>
      `Más superficie autorizada (${formatoPct(h.permisos.ia!, { signo: true })} interanual en ${mes(h.permisos.periodo)}) anticipa demanda en los próximos 3–6 meses.`,
  },
  {
    id: "permisos-bajan",
    aplica: (h) => h.permisos.ia !== null && h.permisos.ia < 0,
    texto: (h) =>
      `Se autorizó menos superficie que hace un año (${formatoPct(h.permisos.ia!)} en ${mes(h.permisos.periodo)}): puede anticipar menos obras nuevas en los próximos 3–6 meses.`,
  },
  {
    id: "hipotecas-empujan",
    aplica: (h) => h.hipotecasPba.ia !== null && h.hipotecasPba.ia > 0.2,
    texto: (h) =>
      `Las hipotecas en la provincia crecen ${formatoPct(h.hipotecasPba.ia!)} interanual: el crédito hipotecario empuja compraventas y refacciones.`,
  },
  {
    id: "hipotecas-caen",
    aplica: (h) => h.hipotecasPba.ia !== null && h.hipotecasPba.ia < -0.2,
    texto: (h) =>
      `Las hipotecas en la provincia caen ${pct(h.hipotecasPba.ia!)} interanual en ${mes(h.hipotecasPba.periodo)}: el crédito hipotecario dejó de empujar compraventas y refacciones como en 2025.`,
  },
  {
    id: "insumos-corralon-extremos",
    aplica: (h) => !!h.insumoMejor && !!h.insumoPeor && h.insumoMejor.nombre !== h.insumoPeor.nombre,
    texto: (h) =>
      `Entre los insumos de corralón, ${h.insumoMejor!.nombre.toLowerCase()} es el que mejor anda (${formatoPct(h.insumoMejor!.ia, { signo: true })} interanual) y ${h.insumoPeor!.nombre.toLowerCase()} el más flojo (${formatoPct(h.insumoPeor!.ia, { signo: true })}).`,
  },
];

export const MAX_FRASES = 6;

export function generarLectura(h: Hechos): Frase[] {
  return REGLAS.filter((r) => r.aplica(h))
    .slice(0, MAX_FRASES)
    .map((r) => ({ regla: r.id, texto: r.texto(h) }));
}

export function hechosDesdeSeries(series: Series, ref: string): Hechos {
  const d = (id: string, precios = false): Dato => {
    const m = medir(obtener(series, id), ref, precios ? "precios" : undefined);
    return { periodo: m.periodo, mm: m.mm, ia: m.ia, acum: m.acum };
  };
  const iccGeneral = d("icc_general", true);
  // El IPC se mide en el mismo mes que el ICC para que la comparación sea mes contra mes.
  const ipcM = medir(obtener(series, "ipc_gba"), iccGeneral.periodo ?? ref, "precios");
  const ranking = rankingInsumos(series, ref).filter((r) => r.corralon && r.ia !== null && r.periodo);
  const aIns = (r: (typeof ranking)[number] | undefined) => (r ? { nombre: r.nombre, ia: r.ia!, periodo: r.periodo! } : null);
  return {
    isac: d("isac_general"),
    iccGeneral,
    iccMateriales: d("icc_materiales", true),
    iccManoObra: d("icc_mano_obra", true),
    ipc: { periodo: ipcM.periodo, mm: ipcM.mm, ia: ipcM.ia, acum: ipcM.acum },
    permisos: d("permisos_superficie"),
    hipotecasPba: d("escrituras_pba_hipotecas"),
    insumoMejor: aIns(ranking[0]),
    insumoPeor: aIns(ranking[ranking.length - 1]),
  };
}
