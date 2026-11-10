/**
 * Valores de control (§3.5 del plan): datos oficiales publicados por INDEC en 2026.
 * El ETL + lib/calc deben reproducirlos con tolerancia de ±0,1 p.p. a partir de los JSON de /data.
 */
import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";
import { acumulado, varInteranual, varMensual } from "@/lib/calc";
import type { Serie } from "@/lib/types";

const leer = (id: string): Serie => JSON.parse(fs.readFileSync(path.resolve(__dirname, `../data/${id}.json`), "utf8"));
const pp = (x: number | null) => (x === null ? NaN : Math.round(x * 1000) / 10);
const cerca = (x: number | null, esperado: number) => expect(Math.abs(pp(x) - esperado)).toBeLessThanOrEqual(0.1);

describe("ISAC agosto 2026", () => {
  const isac = leer("isac_general");
  it("−4,4% interanual", () => cerca(varInteranual(isac, "2026-08"), -4.4));
  it("+0,8% acumulado ene–ago vs 2025", () => cerca(acumulado(isac, "2026-08"), 0.8));
});

describe("ICC GBA septiembre 2026", () => {
  const icc = leer("icc_general");
  it("+1,5% mensual", () => cerca(varMensual(icc, "2026-09"), 1.5));
  it("23,9% acumulado del año", () => cerca(acumulado(icc, "2026-09"), 23.9));
  it("31,3% interanual", () => cerca(varInteranual(icc, "2026-09"), 31.3));
  it("materiales 22,8% interanual", () => cerca(varInteranual(leer("icc_materiales"), "2026-09"), 22.8));
  it("mano de obra 38,7% interanual", () => cerca(varInteranual(leer("icc_mano_obra"), "2026-09"), 38.7));
});
