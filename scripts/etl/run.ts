/**
 * Orquestador del ETL. Uso: npm run etl  (requiere INDEC_API_TOKEN para la fuente INDEC).
 * Si una fuente o serie falla, se CONSERVA el JSON anterior y el error queda en data/_status.json.
 */
import fs from "node:fs";
import path from "node:path";
import { correrSeriesTiempo } from "./seriesTiempo";
import { correrIndec } from "./indec";
import { correrBcra } from "./bcra";
import { correrManual } from "./manual";
import type { ResultadoFuente } from "./serie";
import type { Serie, Status } from "../../lib/types";

const DIR_DATA = path.resolve(process.cwd(), "data");
const STATUS = path.join(DIR_DATA, "_status.json");

const FUENTES: Record<string, () => Promise<ResultadoFuente>> = {
  seriesTiempo: correrSeriesTiempo,
  indec: correrIndec,
  bcra: correrBcra,
  manual: correrManual,
};

function leerJson<T>(p: string): T | null {
  try {
    return JSON.parse(fs.readFileSync(p, "utf8")) as T;
  } catch {
    return null;
  }
}

/** Escribe la serie solo si cambiaron los datos; si no, conserva la fecha "actualizado" anterior (evita commits vacíos). */
export function guardarSerie(dir: string, s: Serie): "nueva" | "actualizada" | "sin cambios" {
  const p = path.join(dir, `${s.id}.json`);
  const previa = leerJson<Serie>(p);
  const comparable = (x: Serie) => JSON.stringify({ ...x, actualizado: "" });
  if (previa && comparable(previa) === comparable({ ...s })) return "sin cambios";
  fs.writeFileSync(p, JSON.stringify(s, null, 1) + "\n");
  return previa ? "actualizada" : "nueva";
}

async function main() {
  fs.mkdirSync(DIR_DATA, { recursive: true });
  const ahora = new Date().toISOString();
  const previo = leerJson<Status>(STATUS);
  const status: Status = { generado: ahora, fuentes: {} };
  let huboError = false;

  const soloFuentes = process.argv.slice(2);
  for (const [nombre, correr] of Object.entries(FUENTES)) {
    if (soloFuentes.length && !soloFuentes.includes(nombre)) {
      if (previo?.fuentes[nombre]) status.fuentes[nombre] = previo.fuentes[nombre];
      continue;
    }
    const anterior = previo?.fuentes[nombre];
    try {
      const r = await correr();
      const cambios: string[] = [];
      for (const s of r.series) {
        const res = guardarSerie(DIR_DATA, s);
        if (res !== "sin cambios") cambios.push(`${s.id} (${res})`);
      }
      const ok = r.errores.length === 0;
      if (!ok) huboError = true;
      status.fuentes[nombre] = {
        ok,
        ultimaCorrida: ahora,
        ultimaCorridaOk: ok ? ahora : anterior?.ultimaCorridaOk,
        series: r.series.map((s) => s.id),
        ...(r.errores.length ? { seriesConError: r.errores, error: `${r.errores.length} serie(s) con error; se conserva su último dato guardado.` } : {}),
      };
      console.log(`✔ ${nombre}: ${r.series.length} series${cambios.length ? `, cambios: ${cambios.join(", ")}` : ", sin cambios"}`);
      for (const e of r.errores) console.error(`  ✖ ${e.id}: ${e.error}`);
    } catch (e) {
      huboError = true;
      status.fuentes[nombre] = {
        ok: false,
        error: (e as Error).message,
        ultimaCorrida: ahora,
        ultimaCorridaOk: anterior?.ultimaCorridaOk,
        series: anterior?.series ?? [],
      };
      console.error(`✖ ${nombre}: ${(e as Error).message} — se conservan los datos anteriores.`);
    }
  }
  fs.writeFileSync(STATUS, JSON.stringify(status, null, 2) + "\n");
  // Una falla de fuente no rompe el pipeline: se informa en _status.json y en la app.
  if (huboError) console.warn("ETL terminó con errores (ver data/_status.json).");
}

const esMain = process.argv[1] && path.resolve(process.argv[1]).endsWith(path.join("scripts", "etl", "run.ts"));
if (esMain) {
  main().catch((e) => {
    console.error(e);
    process.exit(1);
  });
}
