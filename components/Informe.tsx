"use client";

import { useEffect, useMemo, useState } from "react";
import type { Serie, Status } from "@/lib/types";
import { calcularKpis, medir, mesesDisponibles, obtener } from "@/lib/indicadores";
import { generarLectura, hechosDesdeSeries } from "@/lib/lectura";
import { varInteranual } from "@/lib/calc";
import { formatoNumero, formatoPct } from "@/lib/formato";
import { continua, porMes, type FilaMes } from "@/lib/graficos";
import { MESES_CORTOS, nombreMesAnio, periodo } from "@/lib/periodo";
import { Kpis } from "./Kpis";
import { Lectura, NotaDelMes } from "./comunes";
import { Comparacion, GraficoLineas } from "./graficos";
import { ultimoDato } from "./ui";

type Props = { series: Record<string, Serie>; status: Status | null; nota: string | null; mesDefecto: string; frescura: string };

const ANCHO = 340;
const ALTO = 135;

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
  const frases = generarLectura(hechosDesdeSeries(series, ref));
  const isac = obtener(series, "isac_general");
  const icc = obtener(series, "icc_general");
  const ipc = obtener(series, "ipc_gba");
  const perm = obtener(series, "permisos_superficie");
  const may = obtener(series, "dolar_mayorista");
  const iaMes: FilaMes[] = MESES_CORTOS.map((mes, i) => ({ mes, icc: varInteranual(icc, periodo(2026, i + 1)), ipc: varInteranual(ipc, periodo(2026, i + 1)) }));
  const usadas = [isac, icc, ipc, perm, may, obtener(series, "despachos_cemento"), obtener(series, "escrituras_pba_hipotecas")];
  const fuentes = [...new Map(usadas.map((s) => [s.fuente, s])).values()];

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
      <Kpis kpis={kpis} refMes={ref} compacta />
      <Lectura frases={frases} titulo="Lectura del mes" />
      <NotaDelMes nota={nota} />
      <div className="mini-grilla">
        <MiniGrafico titulo="Actividad (ISAC)" sub={`índice 2004=100 · gris 2025, color 2026 · ${formatoPct(medir(isac, ref).ia, { signo: true })} i.a.`}>
          <Comparacion datos={porMes(isac.datos)} formato={(v) => formatoNumero(v, 0)} ancho={ANCHO} alto={ALTO} animar={false} />
        </MiniGrafico>
        <MiniGrafico titulo="Costo de construir vs inflación" sub="variación interanual 2026 · color ICC, gris IPC GBA">
          <GraficoLineas
            datos={iaMes}
            formato={(v) => formatoPct(v, { decimales: 0 })}
            ancho={ANCHO}
            alto={ALTO}
            animar={false}
            lineas={[
              { clave: "icc", nombre: "ICC", color: "var(--accent)" },
              { clave: "ipc", nombre: "IPC GBA", color: "var(--neu)", punteada: true },
            ]}
          />
        </MiniGrafico>
        <MiniGrafico titulo="Permisos de edificación" sub="m² autorizados · gris 2025, color 2026">
          <Comparacion datos={porMes(perm.datos)} formato={(v) => `${formatoNumero(v / 1e6, 1)} M`} ancho={ANCHO} alto={ALTO} animar={false} />
        </MiniGrafico>
        <MiniGrafico titulo="Dólar mayorista" sub="promedio mensual, $ por USD">
          <GraficoLineas datos={continua({ may: may.datos }, "2025-01")} formato={(v) => formatoNumero(v, 0)} ancho={ANCHO} alto={ALTO} animar={false} lineas={[{ clave: "may", nombre: "Mayorista", color: "var(--accent)" }]} />
        </MiniGrafico>
      </div>
      <p className="inf-fuentes">
        <b>Fuente: INDEC</b>, BCRA y datos.gob.ar. {fuentes.map((s) => `${s.fuente} (último dato: ${ultimoDato(s)})`).join(" · ")}. Solo datos públicos; “sin dato” = la fuente todavía no publicó ese mes.
      </p>
    </div>
  );
}
