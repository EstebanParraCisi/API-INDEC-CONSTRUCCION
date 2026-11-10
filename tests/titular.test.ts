import { describe, expect, it } from "vitest";
import { titularDelMes } from "@/lib/titular";

const d = (ia: number | null, acum: number | null = null, periodo: string | null = "2026-08") => ({ periodo, mm: null, ia, acum });

describe("titular del mes", () => {
  it("sin ISAC no hay titular", () => expect(titularDelMes({ isac: d(null), hipotecasPba: d(null) }, "2026-08")).toBeNull());
  it("caso agosto 2026: se enfría, el crédito cae, el año viene parejo", () => {
    expect(titularDelMes({ isac: d(-0.044, 0.008), hipotecasPba: d(-0.288) }, "2026-08")).toBe("Agosto: la actividad se enfría y el crédito hipotecario cae, pero el año todavía viene parejo con 2025.");
  });
  it("mes bueno y año bueno: se encadena con 'y'", () => {
    expect(titularDelMes({ isac: d(0.05, 0.03), hipotecasPba: d(0.02) }, "2026-08")).toBe("Agosto: la actividad crece, y el año viene arriba de 2025.");
  });
  it("mes bueno y año malo: 'aunque'", () => {
    expect(titularDelMes({ isac: d(0.05, -0.03), hipotecasPba: d(null) }, "2026-08")).toBe("Agosto: la actividad crece, aunque el año todavía viene abajo de 2025.");
  });
  it("mes malo y año malo", () => {
    expect(titularDelMes({ isac: d(-0.05, -0.03), hipotecasPba: d(0.3) }, "2026-08")).toBe("Agosto: la actividad se enfría y el crédito hipotecario crece, y el año viene abajo de 2025.");
  });
  it("en enero no hay acumulado distinto del mes", () => {
    expect(titularDelMes({ isac: d(0.004, null, "2026-01"), hipotecasPba: d(null) }, "2026-01")).toBe("Enero: la actividad se mantiene.");
  });
});
