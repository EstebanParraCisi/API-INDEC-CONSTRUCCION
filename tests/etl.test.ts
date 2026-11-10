import { describe, expect, it } from "vitest";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { CSV_MANUALES, leerCsv, parsearNumero } from "@/scripts/etl/manual";
import { validarVigencia } from "@/scripts/etl/seriesTiempo";
import { filasAPuntos, periodoIndec } from "@/scripts/etl/indec";
import { aMensual } from "@/scripts/etl/bcra";
import { BCRA_SERIES } from "@/scripts/etl/config";
import { guardarSerie } from "@/scripts/etl/run";
import { construirSerie } from "@/scripts/etl/serie";

const def = (archivo: string) => CSV_MANUALES.find((d) => d.archivo === archivo)!;

describe("CSV manuales", () => {
  it("lee un CSV válido y respeta los vacíos como sin dato", () => {
    const [s] = leerCsv(def("despachos_cemento.csv"), "periodo,toneladas,fuente_url\n2026-01,900000,https://x\n2026-02,,https://x\n");
    expect(s.id).toBe("despachos_cemento");
    expect(s.datos).toEqual([
      { periodo: "2026-01", valor: 900000 },
      { periodo: "2026-02", valor: null },
    ]);
    expect(s.ultimoPeriodo).toBe("2026-01");
    expect(s.fuenteUrl).toBe("https://x");
  });
  it("un CSV solo con encabezado da una serie vacía, no un error", () => {
    const [s] = leerCsv(def("despachos_cemento.csv"), "periodo,toneladas,fuente_url\n");
    expect(s.datos).toEqual([]);
    expect(s.ultimoPeriodo).toBeNull();
  });
  it("rechaza columnas faltantes, períodos inválidos, duplicados y números con miles", () => {
    expect(() => leerCsv(def("despachos_cemento.csv"), "periodo,valor,fuente_url\n")).toThrow(/toneladas/);
    expect(() => leerCsv(def("despachos_cemento.csv"), "periodo,toneladas,fuente_url\n2026-13,1,u\n")).toThrow(/inválido/);
    expect(() => leerCsv(def("despachos_cemento.csv"), "periodo,toneladas,fuente_url\n2026-01,1,u\n2026-01,2,u\n")).toThrow(/repetido/);
    expect(() => parsearNumero("1.234.567", "x")).toThrow();
    expect(parsearNumero("1234,5", "x")).toBe(1234.5);
  });
  it("el CSV de permisos cargado en el repo es válido", () => {
    const series = leerCsv(def("permisos_edificacion.csv"), fs.readFileSync(path.resolve(__dirname, "../data/manual/permisos_edificacion.csv"), "utf8"));
    expect(series.map((s) => s.id)).toContain("permisos_superficie_moreno");
  });
});

describe("Series de Tiempo", () => {
  it("rechaza series discontinuadas o vacías en 2026", () => {
    expect(() => validarVigencia("32.x", "2015-07-01", [1])).toThrow(/vigente/);
    expect(() => validarVigencia("11.3", "2026-07-01", [null, null])).toThrow(/null/);
    expect(() => validarVigencia("33.2", "2026-08-01", [null, 1])).not.toThrow();
  });
});

describe("INDEC", () => {
  it("convierte períodos y detecta filtros ambiguos", () => {
    expect(periodoIndec("202609")).toBe("2026-09");
    expect(() => periodoIndec("2026-09")).toThrow();
    expect(filasAPuntos("x", [{ periodo: "202609", valor: 1, observaciones: "* Dato provisorio" }])).toEqual([{ periodo: "2026-09", valor: 1, obs: "* Dato provisorio" }]);
    expect(() => filasAPuntos("x", [{ periodo: "202609", valor: 1 }, { periodo: "202609", valor: 2 }])).toThrow(/más de una fila/);
  });
});

describe("BCRA", () => {
  it("promedia diarios y marca el mes en curso como parcial", () => {
    const dolar = BCRA_SERIES.find((s) => s.id === "dolar_mayorista")!;
    const m = aMensual(dolar, [
      { fecha: "2026-10-30", valor: 10 },
      { fecha: "2026-10-31", valor: 20 },
      { fecha: "2026-11-03", valor: 30 },
    ], new Date("2026-11-10T12:00:00Z"));
    expect(m[0]).toEqual({ periodo: "2026-10", valor: 15 });
    expect(m[1].obs).toMatch(/parcial/);
  });
});

describe("orquestador", () => {
  it("no reescribe una serie sin cambios (conserva la fecha de actualización)", () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "obs-"));
    const s = construirSerie({ id: "t", nombre: "t", unidad: "u", frecuencia: "mensual", naturaleza: "nivel", fuente: "f", fuenteUrl: "u", datos: [{ periodo: "2026-01", valor: 1 }] });
    expect(guardarSerie(dir, s)).toBe("nueva");
    expect(guardarSerie(dir, { ...s, actualizado: "2099-01-01" })).toBe("sin cambios");
    expect(guardarSerie(dir, { ...s, datos: [{ periodo: "2026-01", valor: 2 }] })).toBe("actualizada");
  });
});
