"use client";

import { useEffect, useMemo, useState } from "react";
import type { Serie, Status } from "@/lib/types";
import { calcularKpis, mesesDisponibles, obtener } from "@/lib/indicadores";
import { generarLectura, hechosDesdeSeries } from "@/lib/lectura";
import { titularDelMes } from "@/lib/titular";
import { varInteranual } from "@/lib/calc";
import { formatoNumero, formatoPct } from "@/lib/formato";
import { porMes, type FilaMes } from "@/lib/graficos";
import { MESES_CORTOS, nombreMesAnio, periodo } from "@/lib/periodo";
import { Kpis } from "./Kpis";
import { NotaDelMes, Resumen } from "./comunes";
import { Comparacion, GraficoLineas } from "./graficos";

type Props = { series: Record<string, Serie>; status: Status | null; nota: string | null; mesDefecto: string; frescura: string };

const ANCHO = 340;
const ALTO = 120;

function MiniGrafico({ titulo, sub, children }: { titulo: string; sub: string; children: React.ReactNode }) {
  return (
    <figure className="mini">
      <figcaption>
        <b>{titulo}</b> <span>{sub}</span>
      </figcaption>
      {children}
    </figure>
  );
}

export function Informe({ series, nota, mesDefecto, frescura }: Props) {
  const meses = useMemo(() => mesesDisponibles(series), [series]);
  const [ref, setRef] = useState(mesDefecto);
  useEffect(() => {
    const m = new URLSearchParams(window.location.search).get("mes");
    if (m && meses.includes(m)) setRef(m);
  }, [meses]);

  const kpis = calcularKpis(series, ref);
  const hechos = hechosDesdeSeries(series, ref);
  const frases = generarLectura(hechos);
  const isac = obtener(series, "isac_general");
  const icc = obtener(series, "icc_general");
  const ipc = obtener(series, "ipc_gba");
  const iaMes: FilaMes[] = MESES_CORTOS.map((mes, i) => ({ mes, icc: varInteranual(icc, periodo(2026, i + 1)), ipc: varInteranual(ipc, periodo(2026, i + 1)) }));
  const fuentes = [...new Set(kpis.map((k) => k.serie.fuente.replace(/ vía Series de Tiempo$/, "")))];

  return (
    <div className="informe">
      <div className="no-imprimir barra-informe">
        <a className="boton" href={`/?mes=${ref}`}>
          ← Volver
        </a>
        <button className="boton primario" onClick={() => window.print()}>
          Imprimir / guardar PDF
        </button>
      </div>
      <header className="inf-encabezado">
        <h1>Observatorio de la Construcción 2026</h1>
        <p>
          Informe de <b>{nombreMesAnio(ref)}</b> · 2026 vs 2025 · {frescura}
        </p>
      </header>
      <Resumen titular={titularDelMes(hechos, ref)} frases={frases} />
      <NotaDelMes nota={nota} />
      <Kpis kpis={kpis} refMes={ref} />
      <div className="mini-grilla">
        <MiniGrafico titulo="Obras en marcha (ISAC)" sub="gris 2025 · color 2026">
          <Comparacion datos={porMes(isac.datos)} formato={(v) => formatoNumero(v, 0)} ancho={ANCHO} alto={ALTO} animar={false} />
        </MiniGrafico>
        <MiniGrafico titulo="Costo de construir vs inflación" sub="suba en un año · color construir, gris inflación">
          <GraficoLineas
            datos={iaMes}
            formato={(v) => formatoPct(v, { decimales: 0 })}
            ancho={ANCHO}
            alto={ALTO}
            animar={false}
            lineas={[
              { clave: "icc", nombre: "Construir", color: "var(--accent)" },
              { clave: "ipc", nombre: "Inflación", color: "var(--neu)", punteada: true },
            ]}
          />
        </MiniGrafico>
      </div>
      <p className="inf-fuentes">
        <b>Fuente: INDEC</b>, {fuentes.filter((f) => f !== "INDEC").join(", ")}. Solo datos públicos. Cada dato es del último mes que publicó su fuente.
      </p>
    </div>
  );
}
