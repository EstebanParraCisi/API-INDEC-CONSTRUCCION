import { ANIO_DESDE, INDEC_SERIES, INDEC_URL, PARTIDOS_ZONA_OESTE, POBLACION_URL, type DefIndec } from "./config";
import { fetchJson } from "./http";
import { construirSerie, type ResultadoFuente } from "./serie";
import type { Punto } from "../../lib/types";

type Fila = Record<string, unknown> & { periodo?: string; valor?: number | null; observaciones?: string | null };

function token(): string {
  const t = process.env.INDEC_API_TOKEN;
  if (!t) throw new Error("Falta la variable de entorno INDEC_API_TOKEN (token de la API del INDEC).");
  return t;
}

/** Trae todas las filas de una consulta, paginando de a 1000 (máximo de la API) y ordenando por la clave completa. */
export async function traerTodo(tabla: string, filtros: Record<string, string>, orden: string): Promise<Fila[]> {
  const out: Fila[] = [];
  for (let offset = 0; ; offset += 1000) {
    const qs = new URLSearchParams({ ...filtros, order: orden, limit: "1000", offset: String(offset) });
    const filas = await fetchJson<Fila[]>(`${INDEC_URL}${tabla}?${qs}`, { Authorization: `Bearer ${token()}` });
    out.push(...filas);
    if (filas.length < 1000) return out;
  }
}

/** "202609" → "2026-09" */
export function periodoIndec(p: string): string {
  if (!/^\d{6}$/.test(p)) throw new Error(`Período INDEC inesperado: ${p}`);
  return `${p.slice(0, 4)}-${p.slice(4, 6)}`;
}

export function filasAPuntos(id: string, filas: Fila[]): Punto[] {
  const puntos: Punto[] = [];
  const vistos = new Set<string>();
  for (const f of filas) {
    const periodo = periodoIndec(String(f.periodo));
    if (vistos.has(periodo)) throw new Error(`${id}: más de una fila para ${periodo}; el filtro no identifica una única apertura.`);
    vistos.add(periodo);
    const valor = typeof f.valor === "number" ? f.valor : null;
    const obs = f.observaciones ? String(f.observaciones) : undefined;
    puntos.push(obs ? { periodo, valor, obs } : { periodo, valor });
  }
  return puntos;
}

async function serieIndec(def: DefIndec) {
  const filas = await traerTodo(def.tabla, { ...def.filtros, anio: `gte.${ANIO_DESDE}` }, def.orden);
  if (filas.length === 0) throw new Error(`${def.id}: la consulta no devolvió filas (¿cambió algún nombre en la API?).`);
  return construirSerie({
    id: def.id,
    nombre: def.nombre,
    unidad: def.unidad,
    frecuencia: "mensual",
    naturaleza: def.naturaleza,
    fuente: "INDEC",
    fuenteUrl: def.fuenteUrl,
    nota: def.nota,
    datos: filasAPuntos(def.id, filas),
  });
}

async function seriesPoblacion() {
  const filas = await traerTodo(
    "estimaciones_poblacion_departamento_2022_2035",
    { departamento_cod: `in.(${PARTIDOS_ZONA_OESTE.map((p) => p.cod).join(",")})` },
    "departamento_cod,sexo_cod,fecha",
  );
  return PARTIDOS_ZONA_OESTE.map((p) => {
    // No hay fila de total: se suman los registros por sexo de cada año.
    const porAnio = new Map<string, number>();
    const sexos = new Map<string, Set<string>>();
    for (const f of filas.filter((f) => f.departamento_cod === p.cod)) {
      const anio = String(f.fecha);
      porAnio.set(anio, (porAnio.get(anio) ?? 0) + Number(f.poblacion));
      if (!sexos.has(anio)) sexos.set(anio, new Set());
      sexos.get(anio)!.add(String(f.sexo_cod));
    }
    if (porAnio.size === 0) throw new Error(`Población: sin filas para ${p.nombre} (${p.cod}).`);
    for (const [anio, s] of sexos) if (s.size !== 2) throw new Error(`Población ${p.nombre} ${anio}: se esperaban 2 registros por sexo, hay ${s.size}.`);
    return construirSerie({
      id: `poblacion_${p.cod}`,
      nombre: `Población de ${p.nombre}`,
      unidad: "Habitantes (al 1° de julio)",
      frecuencia: "anual",
      naturaleza: "nivel",
      fuente: "INDEC (estimaciones de población por departamento 2022–2035)",
      fuenteUrl: POBLACION_URL,
      datos: [...porAnio.entries()].map(([periodo, valor]) => ({ periodo, valor })),
    });
  });
}

export async function correrIndec(): Promise<ResultadoFuente> {
  token(); // falla rápido con un mensaje claro si no hay token
  const out: ResultadoFuente = { series: [], errores: [] };
  for (const def of INDEC_SERIES) {
    try {
      out.series.push(await serieIndec(def));
    } catch (e) {
      if ((e as { fatal?: boolean }).fatal) throw e; // 401/403: el token falló, no tiene sentido seguir
      out.errores.push({ id: def.id, error: (e as Error).message });
    }
  }
  try {
    out.series.push(...(await seriesPoblacion()));
  } catch (e) {
    if ((e as { fatal?: boolean }).fatal) throw e;
    out.errores.push({ id: "poblacion", error: (e as Error).message });
  }
  return out;
}
