"use client";

import { useEffect, useMemo, useState } from "react";
import type { Serie, Status } from "@/lib/types";
import { calcularKpis, mesesDisponibles } from "@/lib/indicadores";
import { generarLectura, hechosDesdeSeries } from "@/lib/lectura";
import { nombreMesAnio } from "@/lib/periodo";
import { Kpis } from "./Kpis";
import { AvisoFuentes, Lectura, NotaDelMes, PiePagina } from "./comunes";
import { BloqueActividad, BloqueCostos, BloqueLocal, BloqueMacro } from "./Bloques";

type Props = { series: Record<string, Serie>; status: Status | null; nota: string | null; mesDefecto: string; frescura: string };

export function Tablero({ series, status, nota, mesDefecto, frescura }: Props) {
  const meses = useMemo(() => mesesDisponibles(series), [series]);
  const [ref, setRef] = useState(mesDefecto);

  // ?mes=2026-09 en la URL (permite compartir un mes puntual)
  useEffect(() => {
    const m = new URLSearchParams(window.location.search).get("mes");
    if (m && meses.includes(m)) setRef(m);
  }, [meses]);
  const elegir = (m: string) => {
    setRef(m);
    const url = new URL(window.location.href);
    url.searchParams.set("mes", m);
    window.history.replaceState(null, "", url);
  };

  const kpis = useMemo(() => calcularKpis(series, ref), [series, ref]);
  const frases = useMemo(() => generarLectura(hechosDesdeSeries(series, ref)), [series, ref]);

  return (
    <>
      <header className="encabezado">
        <div className="contenedor">
          <div>
            <h1>Observatorio de la Construcción 2026</h1>
            <p className="bajada">Cómo viene la construcción y lo que la afecta en 2026 frente a 2025, y qué significa para un corralón de zona oeste.</p>
          </div>
          <div className="controles">
            <label htmlFor="mes">Mes de referencia</label>
            <select id="mes" value={ref} onChange={(e) => elegir(e.target.value)}>
              {meses.map((m) => (
                <option key={m} value={m}>
                  {nombreMesAnio(m)}
                </option>
              ))}
            </select>
            <a className="boton primario" href={`/informe?mes=${ref}`}>
              Modo informe
            </a>
          </div>
        </div>
      </header>
      <div className="frescura">
        <div className="contenedor">{frescura}</div>
      </div>
      <main className="contenedor">
        <AvisoFuentes status={status} />
        <Kpis kpis={kpis} refMes={ref} />
        <Lectura frases={frases} titulo={`Lectura de ${nombreMesAnio(ref)}`} />
        <NotaDelMes nota={nota} />
        <BloqueActividad series={series} refMes={ref} />
        <BloqueCostos series={series} refMes={ref} />
        <BloqueMacro series={series} refMes={ref} />
        <BloqueLocal series={series} refMes={ref} />
      </main>
      <PiePagina series={series} />
    </>
  );
}
