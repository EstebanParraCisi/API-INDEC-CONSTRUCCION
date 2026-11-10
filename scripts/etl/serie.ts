import type { Frecuencia, Naturaleza, Punto, Serie } from "../../lib/types";
import { ultimoPeriodoConDato } from "../../lib/calc";

export function construirSerie(args: {
  id: string;
  nombre: string;
  unidad: string;
  frecuencia: Frecuencia;
  naturaleza: Naturaleza;
  fuente: string;
  fuenteUrl: string;
  datos: Punto[];
  nota?: string;
}): Serie {
  const datos = [...args.datos].sort((a, b) => (a.periodo < b.periodo ? -1 : 1));
  const vistos = new Set<string>();
  for (const d of datos) {
    if (vistos.has(d.periodo)) throw new Error(`Serie ${args.id}: período duplicado ${d.periodo}`);
    vistos.add(d.periodo);
    if (d.valor !== null && !Number.isFinite(d.valor)) throw new Error(`Serie ${args.id}: valor inválido en ${d.periodo}`);
  }
  return {
    id: args.id,
    nombre: args.nombre,
    unidad: args.unidad,
    frecuencia: args.frecuencia,
    naturaleza: args.naturaleza,
    fuente: args.fuente,
    fuenteUrl: args.fuenteUrl,
    actualizado: new Date().toISOString(),
    ultimoPeriodo: ultimoPeriodoConDato(datos),
    ...(args.nota ? { nota: args.nota } : {}),
    datos,
  };
}

/** Resultado de un módulo de fuente: series OK y errores por serie (las que fallan conservan su JSON anterior). */
export type ResultadoFuente = {
  series: Serie[];
  errores: { id: string; error: string }[];
};
