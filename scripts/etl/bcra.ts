import { BCRA_FUENTE_URL, BCRA_SERIES, BCRA_URL, DESDE, type DefBcra } from "./config";
import { fetchJson } from "./http";
import { construirSerie, type ResultadoFuente } from "./serie";
import { agregarMensual } from "../../lib/calc";
import type { Punto, Serie } from "../../lib/types";

type Respuesta = { results: { idVariable: number; detalle: { fecha: string; valor: number }[] }[] };

async function traerVariable(idVariable: number): Promise<{ fecha: string; valor: number }[]> {
  const hasta = new Date().toISOString().slice(0, 10);
  const out: { fecha: string; valor: number }[] = [];
  for (let offset = 0; ; offset += 3000) {
    const r = await fetchJson<Respuesta>(`${BCRA_URL}${idVariable}?desde=${DESDE}&hasta=${hasta}&limit=3000&offset=${offset}`);
    const det = r.results?.[0]?.detalle ?? [];
    out.push(...det.filter((d) => typeof d.valor === "number"));
    if (det.length < 3000) break;
  }
  if (out.length === 0) throw new Error(`BCRA variable ${idVariable}: sin datos.`);
  return out;
}

export function aMensual(def: DefBcra, diarios: { fecha: string; valor: number }[], hoy = new Date()): Punto[] {
  const mesActual = hoy.toISOString().slice(0, 7);
  if (def.mensual === "mensual") {
    return diarios.map((d) => ({ periodo: d.fecha.slice(0, 7), valor: d.valor }));
  }
  return agregarMensual(diarios, def.mensual === "promedio" ? "promedio" : "ultimo").map((m) => {
    const parcial = m.periodo === mesActual;
    const obs = parcial
      ? def.mensual === "promedio"
        ? `Mes en curso: promedio parcial de ${m.n} días hasta el ${m.ultimaFecha}`
        : `Mes en curso: dato al ${m.ultimaFecha}`
      : undefined;
    return obs ? { periodo: m.periodo, valor: m.valor, obs } : { periodo: m.periodo, valor: m.valor };
  });
}

export async function correrBcra(): Promise<ResultadoFuente> {
  const out: ResultadoFuente = { series: [], errores: [] };
  for (const def of BCRA_SERIES) {
    try {
      const diarios = await traerVariable(def.idVariable);
      const base = {
        nombre: def.nombre,
        unidad: def.unidad,
        naturaleza: def.naturaleza,
        fuente: "BCRA",
        fuenteUrl: BCRA_FUENTE_URL,
      };
      out.series.push(construirSerie({ ...base, id: def.id, frecuencia: "mensual", datos: aMensual(def, diarios) }));
      if (def.guardarDiaria) {
        const s: Serie = construirSerie({
          ...base,
          id: `${def.id}_diario`,
          nombre: def.nombre.replace(", promedio mensual", ", diario"),
          frecuencia: "diaria",
          datos: diarios.map((d) => ({ periodo: d.fecha, valor: d.valor })),
        });
        out.series.push(s);
      }
    } catch (e) {
      out.errores.push({ id: def.id, error: (e as Error).message });
    }
  }
  return out;
}
