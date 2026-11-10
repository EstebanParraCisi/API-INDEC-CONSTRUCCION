import { describe, expect, it } from "vitest";
import { acumulado, acumuladoPrecios, acumuladoVsAnioAnterior, agregarMensual, deflactar, dividir, rebasear, ultimoPeriodoHasta, varInteranual, varMensual } from "@/lib/calc";
import { formatoFecha, formatoNumero, formatoPct, formatoPesos, formatoPP } from "@/lib/formato";
import { nombreMesAnio, sumarMeses } from "@/lib/periodo";
import type { Punto } from "@/lib/types";

const serie = (pares: [string, number | null][]) => ({ datos: pares.map(([periodo, valor]) => ({ periodo, valor })) as Punto[] });

describe("períodos", () => {
  it("suma meses cruzando años", () => {
    expect(sumarMeses("2026-01", -1)).toBe("2025-12");
    expect(sumarMeses("2026-08", -12)).toBe("2025-08");
    expect(sumarMeses("2025-12", 1)).toBe("2026-01");
  });
  it("nombra meses", () => expect(nombreMesAnio("2026-09")).toBe("septiembre 2026"));
});

describe("variaciones", () => {
  const s = serie([
    ["2025-08", 100],
    ["2026-07", 104],
    ["2026-08", 106.08],
  ]);
  it("mensual", () => expect(varMensual(s, "2026-08")).toBeCloseTo(0.02, 10));
  it("interanual", () => expect(varInteranual(s, "2026-08")).toBeCloseTo(0.0608, 10));
  it("sin dato devuelve null (nunca inventa)", () => {
    expect(varMensual(s, "2026-07")).toBeNull();
    expect(varInteranual(serie([["2026-08", 1], ["2025-08", null]]), "2026-08")).toBeNull();
  });
});

describe("acumulados", () => {
  const vol = serie([
    ["2025-01", 100],
    ["2025-02", 200],
    ["2026-01", 110],
    ["2026-02", 190],
  ]);
  it("promedio para índices de volumen", () => expect(acumuladoVsAnioAnterior(vol, "2026-02", "promedio")).toBeCloseTo(0, 10));
  it("suma para cantidades físicas", () => {
    const ton = serie([
      ["2025-01", 10],
      ["2025-02", 30],
      ["2026-01", 20],
      ["2026-02", 30],
    ]);
    expect(acumuladoVsAnioAnterior(ton, "2026-02", "suma")).toBeCloseTo(0.25, 10);
  });
  it("falla (null) si falta un mes en el período", () => {
    const hueco = serie([
      ["2025-01", 1],
      ["2025-02", null],
      ["2026-01", 1],
      ["2026-02", 1],
    ]);
    expect(acumuladoVsAnioAnterior(hueco, "2026-02", "promedio")).toBeNull();
  });
  it("precios: contra diciembre del año anterior", () => {
    const p = serie([
      ["2025-12", 200],
      ["2026-09", 247.8],
    ]);
    expect(acumuladoPrecios(p, "2026-09")).toBeCloseTo(0.239, 10);
  });
  it("elige el cálculo según la naturaleza", () => {
    expect(acumulado({ ...vol, naturaleza: "volumen" }, "2026-02")).toBeCloseTo(0, 10);
    expect(acumulado({ ...serie([["2025-12", 100], ["2026-02", 110]]), naturaleza: "precio" }, "2026-02")).toBeCloseTo(0.1, 10);
  });
});

describe("transformaciones", () => {
  it("deflacta con base", () => {
    const nom = serie([
      ["2026-01", 100],
      ["2026-02", 120],
    ]);
    const ipc = serie([
      ["2026-01", 50],
      ["2026-02", 60],
    ]);
    expect(deflactar(nom, ipc, "2026-01").map((p) => p.valor)).toEqual([100, 100]);
  });
  it("divide y rebasea", () => {
    const d = dividir(serie([["2026-01", 300], ["2026-02", 330]]), serie([["2026-01", 3], ["2026-02", 3]]));
    expect(rebasear(d, "2026-01").map((p) => p.valor)).toEqual([100, 110.00000000000001]);
  });
  it("agrega diarios a mensual", () => {
    const m = agregarMensual(
      [
        { fecha: "2026-01-02", valor: 10 },
        { fecha: "2026-01-05", valor: 20 },
        { fecha: "2026-02-01", valor: 7 },
      ],
      "promedio",
    );
    expect(m.map((x) => [x.periodo, x.valor, x.n])).toEqual([
      ["2026-01", 15, 2],
      ["2026-02", 7, 1],
    ]);
    expect(agregarMensual([{ fecha: "2026-01-05", valor: 2 }, { fecha: "2026-01-02", valor: 1 }], "ultimo")[0].valor).toBe(2);
  });
  it("último período con dato ≤ referencia", () => {
    expect(ultimoPeriodoHasta(serie([["2026-07", 1], ["2026-08", null], ["2026-09", 2]]), "2026-08")).toBe("2026-07");
  });
});

describe("formato es-AR", () => {
  it("porcentajes con coma y 1 decimal", () => {
    expect(formatoPct(-0.0436)).toBe("−4,4%");
    expect(formatoPct(0.0079, { signo: true })).toBe("+0,8%");
    expect(formatoPct(-0.0001)).toBe("0,0%");
    expect(formatoPct(null)).toBe("sin dato");
  });
  it("números y pesos", () => {
    expect(formatoNumero(1535.2, 2)).toBe("1.535,20");
    expect(formatoPesos(1535.2)).toBe("$ 1.535,20");
    expect(formatoPP(0.159)).toBe("15,9 p.p.");
    expect(formatoFecha("2026-11-05")).toBe("05/11/2026");
  });
});
