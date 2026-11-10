import { DESDE, SERIES_TIEMPO, SERIES_TIEMPO_FUENTE_URL, SERIES_TIEMPO_URL } from "./config";
import { fetchJson } from "./http";
import { construirSerie, type ResultadoFuente } from "./serie";

type Respuesta = {
  data: (string | number | null)[][];
  meta: { field?: { id: string; time_index_end?: string } }[];
};

/**
 * Valida que la serie esté vigente: time_index_end ≥ 2026 y al menos un valor no nulo en 2026.
 * (Hay series que declaran terminar en 2026 pero tienen todos sus valores en null.)
 */
export function validarVigencia(stId: string, timeIndexEnd: string | undefined, valores2026: (number | null)[]): void {
  if (!timeIndexEnd || timeIndexEnd < "2026-01-01") {
    throw new Error(`La serie ${stId} no está vigente (time_index_end=${timeIndexEnd ?? "?"}). ¿Es un dataset DISCONTINUADO?`);
  }
  if (!valores2026.some((v) => v !== null)) {
    throw new Error(`La serie ${stId} no tiene ningún valor en 2026 (todos null).`);
  }
}

export async function correrSeriesTiempo(): Promise<ResultadoFuente> {
  const ids = SERIES_TIEMPO.map((s) => s.stId).join(",");
  const url = `${SERIES_TIEMPO_URL}?ids=${ids}&start_date=${DESDE}&format=json&limit=1000&metadata=full`;
  const r = await fetchJson<Respuesta>(url);
  const out: ResultadoFuente = { series: [], errores: [] };

  SERIES_TIEMPO.forEach((def, i) => {
    try {
      const meta = r.meta[i + 1]?.field;
      if (meta?.id !== def.stId) throw new Error(`Respuesta desordenada: esperaba ${def.stId}, vino ${meta?.id}`);
      const datos = r.data.map((fila) => ({
        periodo: String(fila[0]).slice(0, 7),
        valor: typeof fila[i + 1] === "number" ? (fila[i + 1] as number) : null,
      }));
      validarVigencia(def.stId, meta.time_index_end, datos.filter((d) => d.periodo >= "2026").map((d) => d.valor));
      out.series.push(
        construirSerie({
          id: def.id,
          nombre: def.nombre,
          unidad: def.unidad,
          frecuencia: "mensual",
          naturaleza: def.naturaleza,
          fuente: def.fuente,
          fuenteUrl: `${SERIES_TIEMPO_FUENTE_URL}/?ids=${def.stId}`,
          nota: def.nota,
          datos,
        }),
      );
    } catch (e) {
      out.errores.push({ id: def.id, error: (e as Error).message });
    }
  });
  return out;
}
