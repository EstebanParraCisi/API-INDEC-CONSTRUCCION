/**
 * "Lectura del mes": frases generadas por REGLAS DETERMINISTAS (no IA).
 * Cada regla tiene un id estable y un test en tests/lectura.test.ts.
 */
import { formatoPct } from "./formato";
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
      `En ${mes(h.isac.periodo)} se construyó ${pct(h.isac.ia!)} menos que un año antes, pero en lo que va del año la actividad sigue ${pct(h.isac.acum!)} arriba de 2025.`,
  },
  {
    id: "actividad-crece",
    aplica: (h) => h.isac.ia !== null && h.isac.acum !== null && h.isac.ia >= 0 && h.isac.acum >= 0,
    texto: (h) => `En ${mes(h.isac.periodo)} se construyó ${pct(h.isac.ia!)} más que un año antes, y en lo que va del año la actividad viene ${pct(h.isac.acum!)} arriba de 2025.`,
  },
  {
    id: "actividad-repunta-anio-abajo",
    aplica: (h) => h.isac.ia !== null && h.isac.acum !== null && h.isac.ia >= 0 && h.isac.acum < 0,
    texto: (h) =>
      `En ${mes(h.isac.periodo)} se construyó ${pct(h.isac.ia!)} más que un año antes, aunque en lo que va del año la actividad todavía está ${pct(h.isac.acum!)} abajo de 2025.`,
  },
  {
    id: "actividad-cae",
    aplica: (h) => h.isac.ia !== null && h.isac.acum !== null && h.isac.ia < 0 && h.isac.acum < 0,
    texto: (h) => `En ${mes(h.isac.periodo)} se construyó ${pct(h.isac.ia!)} menos que un año antes, y en lo que va del año la actividad está ${pct(h.isac.acum!)} abajo de 2025.`,
  },
  {
    id: "mano-obra-mas-que-materiales",
    aplica: (h) => h.iccManoObra.ia !== null && h.iccMateriales.ia !== null && dif(h.iccManoObra.ia, h.iccMateriales.ia) > 0.05,
    texto: (h) =>
      `En un año la mano de obra subió mucho más que los materiales (${formatoPct(h.iccManoObra.ia!)} contra ${formatoPct(h.iccMateriales.ia!)}): construir se encarece sobre todo por la mano de obra, y hay margen relativo en el precio de los materiales.`,
  },
  {
    id: "materiales-bajo-inflacion",
    aplica: (h) =>
      h.iccMateriales.mm !== null && h.ipc.mm !== null && h.iccMateriales.periodo === h.ipc.periodo && h.iccMateriales.mm < h.ipc.mm,
    texto: (h) =>
      `En ${mes(h.iccMateriales.periodo)} los materiales subieron ${formatoPct(h.iccMateriales.mm!)}, menos que la inflación del mes (${formatoPct(h.ipc.mm!)}): ojo con los márgenes si los costos de reposición suben más que la lista.`,
  },
  {
    id: "construir-mas-caro-que-inflacion",
    aplica: (h) => h.iccGeneral.ia !== null && h.ipc.ia !== null && h.iccGeneral.periodo === h.ipc.periodo && dif(h.iccGeneral.ia, h.ipc.ia) > 0.01,
    texto: (h) =>
      `Construir se encarece más que la vida en general (${formatoPct(h.iccGeneral.ia!)} en un año contra ${formatoPct(h.ipc.ia!)} de inflación): puede postergar obras de particulares.`,
  },
  {
    id: "construir-mas-barato-que-inflacion",
    aplica: (h) => h.iccGeneral.ia !== null && h.ipc.ia !== null && h.iccGeneral.periodo === h.ipc.periodo && dif(h.ipc.ia, h.iccGeneral.ia) > 0.01,
    texto: (h) =>
      `Construir se encarece menos que la inflación (${formatoPct(h.iccGeneral.ia!)} en un año contra ${formatoPct(h.ipc.ia!)}): descontada la inflación, la obra se abarata, y eso ayuda a la demanda.`,
  },
  {
    id: "permisos-suben",
    aplica: (h) => h.permisos.ia !== null && h.permisos.ia > 0,
    texto: (h) =>
      `En ${mes(h.permisos.periodo)} se autorizaron ${pct(h.permisos.ia!)} más metros para construir que un año antes: anticipa más demanda en los próximos 3–6 meses.`,
  },
  {
    id: "permisos-bajan",
    aplica: (h) => h.permisos.ia !== null && h.permisos.ia < 0,
    texto: (h) =>
      `En ${mes(h.permisos.periodo)} se autorizaron ${pct(h.permisos.ia!)} menos metros para construir que un año antes: puede anticipar menos obras nuevas en los próximos 3–6 meses.`,
  },
  {
    id: "hipotecas-empujan",
    aplica: (h) => h.hipotecasPba.ia !== null && h.hipotecasPba.ia > 0.2,
    texto: (h) =>
      `Las hipotecas en la provincia crecen ${pct(h.hipotecasPba.ia!)} frente a un año antes: el crédito hipotecario empuja compraventas y refacciones.`,
  },
  {
    id: "hipotecas-caen",
    aplica: (h) => h.hipotecasPba.ia !== null && h.hipotecasPba.ia < -0.2,
    texto: (h) =>
      `En ${mes(h.hipotecasPba.periodo)} se firmaron ${pct(h.hipotecasPba.ia!)} menos hipotecas en la provincia que un año antes: el crédito ya no empuja compraventas y refacciones como en 2025.`,
  },
  {
    id: "insumos-corralon-extremos",
    aplica: (h) => !!h.insumoMejor && !!h.insumoPeor && h.insumoMejor.nombre !== h.insumoPeor.nombre,
    texto: (h) =>
      `Entre los materiales de corralón, ${h.insumoMejor!.nombre.toLowerCase()} es el que mejor anda (${formatoPct(h.insumoMejor!.ia, { signo: true })} vs un año antes) y ${h.insumoPeor!.nombre.toLowerCase()} el más flojo (${formatoPct(h.insumoPeor!.ia, { signo: true })}).`,
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
