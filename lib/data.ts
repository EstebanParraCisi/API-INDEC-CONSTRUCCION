import "server-only";
import fs from "node:fs";
import path from "node:path";
import type { Serie, Status } from "./types";

export type Datos = {
  series: Record<string, Serie>;
  status: Status | null;
  nota: string | null;
};

const DIR = path.join(process.cwd(), "data");

/** Lee todos los JSON de /data en build. Si alguno está roto, se ignora (la app sigue funcionando). */
export function cargarDatos(): Datos {
  const series: Record<string, Serie> = {};
  for (const f of fs.readdirSync(DIR)) {
    if (!f.endsWith(".json") || f.startsWith("_")) continue;
    try {
      const s = JSON.parse(fs.readFileSync(path.join(DIR, f), "utf8")) as Serie;
      series[s.id] = s;
    } catch {
      /* JSON ilegible: se trata como serie ausente */
    }
  }
  let status: Status | null = null;
  try {
    status = JSON.parse(fs.readFileSync(path.join(DIR, "_status.json"), "utf8"));
  } catch {
    status = null;
  }
  let nota: string | null = null;
  try {
    const md = fs.readFileSync(path.join(DIR, "manual", "nota_del_mes.md"), "utf8").replace(/<!--[\s\S]*?-->/g, "").trim();
    nota = md || null;
  } catch {
    nota = null;
  }
  return { series, status, nota };
}
