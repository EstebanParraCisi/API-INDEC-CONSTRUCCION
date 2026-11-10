/**
 * Fuentes sin API: CSV cargados a mano en /data/manual (ver data/manual/README.md).
 * Valida encabezados, formato de período y números. Nunca completa meses faltantes.
 */
import fs from "node:fs";
import path from "node:path";
import { construirSerie, type ResultadoFuente } from "./serie";
import type { Naturaleza, Punto } from "../../lib/types";

export const DIR_MANUAL = path.resolve(process.cwd(), "data/manual");

type Columna = { columna: string; id: string; nombre: string; unidad: string; naturaleza: Naturaleza; obligatoria?: boolean; nota?: string };

export type DefCsv = {
  archivo: string;
  fuente: string;
  fuenteUrlDefault: string;
  columnas: Columna[];
};

export const CSV_MANUALES: DefCsv[] = [
  {
    archivo: "despachos_cemento.csv",
    fuente: "AFCP (Asociación de Fabricantes de Cemento Portland)",
    fuenteUrlDefault: "https://www.afcp.org.ar/",
    columnas: [{ columna: "toneladas", id: "despachos_cemento", nombre: "Despachos de cemento", unidad: "Toneladas", naturaleza: "cantidad", obligatoria: true }],
  },
  {
    archivo: "indice_construya.csv",
    fuente: "Grupo Construya",
    fuenteUrlDefault: "https://www.grupoconstruya.com.ar/",
    columnas: [
      { columna: "indice", id: "construya_indice", nombre: "Índice Construya", unidad: "Índice", naturaleza: "volumen", obligatoria: true },
      { columna: "var_mm_desest", id: "construya_var_mm_desest", nombre: "Índice Construya — variación mensual desestacionalizada (publicada)", unidad: "%", naturaleza: "nivel" },
    ],
  },
  {
    archivo: "escrituras_pba.csv",
    fuente: "Colegio de Escribanos de la Provincia de Buenos Aires",
    fuenteUrlDefault: "https://www.colescba.org.ar/",
    columnas: [
      { columna: "compraventas", id: "escrituras_pba_compraventas", nombre: "Compraventas escrituradas en PBA", unidad: "Escrituras", naturaleza: "cantidad", obligatoria: true },
      { columna: "hipotecas", id: "escrituras_pba_hipotecas", nombre: "Hipotecas escrituradas en PBA", unidad: "Escrituras", naturaleza: "cantidad", obligatoria: true },
    ],
  },
  {
    archivo: "costo_m2_cac.csv",
    fuente: "Cámara Argentina de la Construcción",
    fuenteUrlDefault: "https://www.camarco.org.ar/",
    columnas: [{ columna: "costo_m2", id: "cac_costo_m2", nombre: "Costo de construcción por m² (CAC)", unidad: "$ por m²", naturaleza: "precio", obligatoria: true }],
  },
  {
    archivo: "permisos_edificacion.csv",
    fuente: "INDEC (permisos de edificación, 246 municipios)",
    fuenteUrlDefault: "https://www.indec.gob.ar/ftp/cuadros/economia/permisos_edificacion_246_municipios.xlsx",
    columnas: [
      { columna: "superficie_total_m2", id: "permisos_superficie", nombre: "Superficie autorizada por permisos de edificación (246 municipios)", unidad: "m²", naturaleza: "cantidad", obligatoria: true },
      { columna: "permisos_total", id: "permisos_cantidad", nombre: "Permisos de edificación otorgados (246 municipios)", unidad: "Permisos", naturaleza: "cantidad", obligatoria: true },
      { columna: "superficie_moreno_m2", id: "permisos_superficie_moreno", nombre: "Superficie autorizada — Moreno", unidad: "m²", naturaleza: "cantidad" },
      { columna: "superficie_general_rodriguez_m2", id: "permisos_superficie_general_rodriguez", nombre: "Superficie autorizada — General Rodríguez", unidad: "m²", naturaleza: "cantidad" },
      { columna: "superficie_mercedes_m2", id: "permisos_superficie_mercedes", nombre: "Superficie autorizada — Mercedes", unidad: "m²", naturaleza: "cantidad" },
    ],
  },
];

export function parsearCsv(texto: string): string[][] {
  return texto
    .replace(/^﻿/, "")
    .split(/\r?\n/)
    .filter((l) => l.trim() !== "" && !l.trim().startsWith("#"))
    .map((l) => l.split(",").map((c) => c.trim().replace(/^"(.*)"$/, "$1")));
}

/** Acepta "1234.5", "1234,5" (sin separador de miles) o vacío (= sin dato). */
export function parsearNumero(s: string, contexto: string): number | null {
  if (s === "" || s === "-") return null;
  const limpio = s.replace(/\s/g, "");
  if (!/^-?\d+([.,]\d+)?$/.test(limpio)) throw new Error(`${contexto}: "${s}" no es un número válido (usar 1234.5, sin separador de miles).`);
  return Number(limpio.replace(",", "."));
}

export function leerCsv(def: DefCsv, texto: string) {
  const filas = parsearCsv(texto);
  if (filas.length === 0) throw new Error(`${def.archivo}: archivo vacío (falta el encabezado).`);
  const enc = filas[0];
  const req = ["periodo", ...def.columnas.filter((c) => c.obligatoria).map((c) => c.columna), "fuente_url"];
  for (const r of req) if (!enc.includes(r)) throw new Error(`${def.archivo}: falta la columna "${r}". Encabezado esperado: ${["periodo", ...def.columnas.map((c) => c.columna), "fuente_url"].join(",")}`);
  const iP = enc.indexOf("periodo");
  const iU = enc.indexOf("fuente_url");

  const puntos = new Map<string, Punto[]>(def.columnas.map((c) => [c.id, []]));
  const urls = new Set<string>();
  const vistos = new Set<string>();
  filas.slice(1).forEach((fila, n) => {
    const linea = n + 2;
    const periodo = fila[iP];
    if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(periodo ?? "")) throw new Error(`${def.archivo} línea ${linea}: período "${periodo}" inválido (formato AAAA-MM).`);
    if (vistos.has(periodo)) throw new Error(`${def.archivo} línea ${linea}: período ${periodo} repetido.`);
    vistos.add(periodo);
    if (fila[iU]) urls.add(fila[iU]);
    for (const c of def.columnas) {
      const i = enc.indexOf(c.columna);
      if (i < 0) continue;
      const valor = parsearNumero(fila[i] ?? "", `${def.archivo} línea ${linea}, columna ${c.columna}`);
      puntos.get(c.id)!.push({ periodo, valor });
    }
  });
  const fuenteUrl = urls.size === 1 ? [...urls][0] : def.fuenteUrlDefault;
  return def.columnas
    .filter((c) => enc.includes(c.columna))
    .map((c) =>
      construirSerie({
        id: c.id,
        nombre: c.nombre,
        unidad: c.unidad,
        frecuencia: "mensual",
        naturaleza: c.naturaleza,
        fuente: def.fuente,
        fuenteUrl,
        nota: c.nota,
        datos: puntos.get(c.id)!,
      }),
    );
}

export async function correrManual(dir = DIR_MANUAL): Promise<ResultadoFuente> {
  const out: ResultadoFuente = { series: [], errores: [] };
  for (const def of CSV_MANUALES) {
    const p = path.join(dir, def.archivo);
    try {
      if (!fs.existsSync(p)) throw new Error(`No existe ${def.archivo}.`);
      out.series.push(...leerCsv(def, fs.readFileSync(p, "utf8")));
    } catch (e) {
      out.errores.push({ id: def.archivo, error: (e as Error).message });
    }
  }
  return out;
}
