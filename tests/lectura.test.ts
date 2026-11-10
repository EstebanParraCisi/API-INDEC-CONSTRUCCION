import { describe, expect, it } from "vitest";
import { generarLectura, MAX_FRASES, REGLAS, type Hechos } from "@/lib/lectura";

const vacio = { periodo: null, mm: null, ia: null, acum: null };
const base: Hechos = {
  isac: vacio,
  iccGeneral: vacio,
  iccMateriales: vacio,
  iccManoObra: vacio,
  ipc: vacio,
  permisos: vacio,
  hipotecasPba: vacio,
  insumoMejor: null,
  insumoPeor: null,
};
const con = (parcial: Partial<Hechos>): Hechos => ({ ...base, ...parcial });
const reglas = (h: Hechos) => generarLectura(h).map((f) => f.regla);

describe("lectura del mes", () => {
  it("sin datos no inventa frases", () => expect(generarLectura(base)).toEqual([]));

  it("ISAC i.a. < 0 y acumulado > 0 → se enfrió pero el año viene arriba (caso agosto 2026)", () => {
    const f = generarLectura(con({ isac: { periodo: "2026-08", mm: null, ia: -0.0436, acum: 0.0079 } }));
    expect(f.map((x) => x.regla)).toEqual(["actividad-enfria-anio-arriba"]);
    expect(f[0].texto).toContain("En agosto se construyó 4,4% menos que un año antes");
    expect(f[0].texto).toContain("sigue 0,8% arriba de 2025");
  });
  it("ISAC: las cuatro combinaciones de signo son excluyentes", () => {
    const casos: [number, number, string][] = [
      [0.02, 0.01, "actividad-crece"],
      [0.02, -0.01, "actividad-repunta-anio-abajo"],
      [-0.02, -0.01, "actividad-cae"],
      [-0.02, 0.01, "actividad-enfria-anio-arriba"],
    ];
    for (const [ia, acum, regla] of casos) expect(reglas(con({ isac: { periodo: "2026-08", mm: null, ia, acum } }))).toEqual([regla]);
  });

  it("mano de obra − materiales > 5 p.p. (caso sep 2026: 38,7% vs 22,8%)", () => {
    const h = con({ iccManoObra: { periodo: "2026-09", mm: null, ia: 0.387, acum: null }, iccMateriales: { periodo: "2026-09", mm: null, ia: 0.228, acum: null } });
    expect(reglas(h)).toContain("mano-obra-mas-que-materiales");
    expect(generarLectura(h)[0].texto).toContain("(38,7% contra 22,8%)");
    const justo = con({ iccManoObra: { periodo: "2026-09", mm: null, ia: 0.27, acum: null }, iccMateriales: { periodo: "2026-09", mm: null, ia: 0.22, acum: null } });
    expect(reglas(justo)).not.toContain("mano-obra-mas-que-materiales");
  });

  it("materiales m/m < IPC m/m, solo si son del mismo mes", () => {
    const mat = { periodo: "2026-09", mm: 0.013, ia: null, acum: null };
    expect(reglas(con({ iccMateriales: mat, ipc: { periodo: "2026-09", mm: 0.02, ia: null, acum: null } }))).toContain("materiales-bajo-inflacion");
    expect(reglas(con({ iccMateriales: mat, ipc: { periodo: "2026-08", mm: 0.02, ia: null, acum: null } }))).not.toContain("materiales-bajo-inflacion");
    expect(reglas(con({ iccMateriales: mat, ipc: { periodo: "2026-09", mm: 0.01, ia: null, acum: null } }))).not.toContain("materiales-bajo-inflacion");
  });

  it("ICC vs IPC interanual", () => {
    const icc = (ia: number) => ({ periodo: "2026-09", mm: null, ia, acum: null });
    expect(reglas(con({ iccGeneral: icc(0.313), ipc: icc(0.335) }))).toEqual(["construir-mas-barato-que-inflacion"]);
    expect(reglas(con({ iccGeneral: icc(0.4), ipc: icc(0.335) }))).toEqual(["construir-mas-caro-que-inflacion"]);
    expect(reglas(con({ iccGeneral: icc(0.34), ipc: icc(0.335) }))).toEqual([]);
  });

  it("permisos i.a. > 0 anticipa demanda; < 0 avisa", () => {
    expect(reglas(con({ permisos: { periodo: "2026-08", mm: null, ia: 0.05, acum: null } }))).toEqual(["permisos-suben"]);
    expect(reglas(con({ permisos: { periodo: "2026-08", mm: null, ia: -0.11, acum: null } }))).toEqual(["permisos-bajan"]);
  });

  it("hipotecas PBA i.a. > 20% empuja; < −20% avisa", () => {
    expect(reglas(con({ hipotecasPba: { periodo: "2026-08", mm: null, ia: 0.25, acum: null } }))).toEqual(["hipotecas-empujan"]);
    expect(reglas(con({ hipotecasPba: { periodo: "2026-08", mm: null, ia: 0.2, acum: null } }))).toEqual([]);
    expect(reglas(con({ hipotecasPba: { periodo: "2026-08", mm: null, ia: -0.288, acum: null } }))).toEqual(["hipotecas-caen"]);
    expect(generarLectura(con({ hipotecasPba: { periodo: "2026-08", mm: null, ia: -0.288, acum: null } }))[0].texto).toContain("En agosto se firmaron 28,8% menos hipotecas");
    expect(reglas(con({ hipotecasPba: { periodo: "2026-08", mm: null, ia: -0.2, acum: null } }))).toEqual([]);
  });

  it("insumos de corralón: mejor y peor", () => {
    const h = con({ insumoMejor: { nombre: "Cales", ia: 0.12, periodo: "2026-08" }, insumoPeor: { nombre: "Yeso", ia: -0.08, periodo: "2026-08" } });
    expect(generarLectura(h)[0].texto).toBe("Entre los materiales de corralón, cales es el que mejor anda (+12,0% vs un año antes) y yeso el más flojo (−8,0%).");
  });

  it(`muestra como máximo ${MAX_FRASES} frases y cada una es trazable a una regla`, () => {
    const h = con({
      isac: { periodo: "2026-08", mm: null, ia: -0.04, acum: 0.01 },
      iccGeneral: { periodo: "2026-09", mm: null, ia: 0.313, acum: null },
      iccManoObra: { periodo: "2026-09", mm: null, ia: 0.387, acum: null },
      iccMateriales: { periodo: "2026-09", mm: 0.013, ia: 0.228, acum: null },
      ipc: { periodo: "2026-09", mm: 0.02, ia: 0.335, acum: null },
      permisos: { periodo: "2026-08", mm: null, ia: -0.1, acum: null },
      hipotecasPba: { periodo: "2026-08", mm: null, ia: 0.3, acum: null },
      insumoMejor: { nombre: "Cales", ia: 0.1, periodo: "2026-08" },
      insumoPeor: { nombre: "Yeso", ia: -0.1, periodo: "2026-08" },
    });
    const f = generarLectura(h);
    expect(f.length).toBe(MAX_FRASES);
    const ids = new Set(REGLAS.map((r) => r.id));
    for (const x of f) expect(ids.has(x.regla)).toBe(true);
  });
});
