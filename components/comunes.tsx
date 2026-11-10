import type { Frase } from "@/lib/lectura";
import type { Series } from "@/lib/indicadores";
import { obtener } from "@/lib/indicadores";
import type { Serie, Status } from "@/lib/types";
import { formatoFecha } from "@/lib/formato";
import { nombreMes } from "@/lib/periodo";
import { ultimoDato } from "./ui";

export function Lectura({ frases, titulo = "Lectura del mes" }: { frases: Frase[]; titulo?: string }) {
  return (
    <section className="lectura" aria-labelledby="lectura-t">
      <h2 id="lectura-t">{titulo}</h2>
      {frases.length ? (
        <ol>
          {frases.map((f) => (
            <li key={f.regla} data-regla={f.regla}>
              {f.texto}
            </li>
          ))}
        </ol>
      ) : (
        <p className="vacio">No hay datos suficientes para este mes.</p>
      )}
    </section>
  );
}

export function NotaDelMes({ nota }: { nota: string | null }) {
  if (!nota) return null;
  return (
    <section className="nota">
      <h2>Nota del mes</h2>
      {nota}
    </section>
  );
}

const NOMBRES_FUENTE: Record<string, string> = { seriesTiempo: "Series de Tiempo (datos.gob.ar)", indec: "API INDEC", bcra: "BCRA", manual: "CSV manuales" };

/** Aviso cuando una fuente falló en la última actualización (se muestran los datos guardados). */
export function AvisoFuentes({ status }: { status: Status | null }) {
  if (!status) return null;
  const caidas = Object.entries(status.fuentes).filter(([k, f]) => !f.ok && k !== "manual");
  const manual = status.fuentes.manual;
  const manualConError = manual?.seriesConError?.filter((e) => !/No existe/.test(e.error)) ?? [];
  if (!caidas.length && !manualConError.length) return null;
  return (
    <div className="aviso" role="status">
      {caidas.map(([k, f]) => (
        <p key={k} style={{ margin: 0 }}>
          ⚠ {NOMBRES_FUENTE[k] ?? k} no respondió bien en la última actualización ({formatoFecha(f.ultimaCorrida)}). Se muestran los últimos datos guardados
          {f.ultimaCorridaOk ? ` (del ${formatoFecha(f.ultimaCorridaOk)})` : ""}.
        </p>
      ))}
      {manualConError.map((e) => (
        <p key={e.id} style={{ margin: 0 }}>
          ⚠ Hay un error en {e.id}: {e.error}
        </p>
      ))}
    </div>
  );
}

export function lineaFrescura(series: Series, status: Status | null): string {
  const isac = obtener(series, "isac_general").ultimoPeriodo;
  const icc = obtener(series, "icc_general").ultimoPeriodo;
  const dol = obtener(series, "dolar_mayorista_diario").ultimoPeriodo;
  const partes = [
    status ? `Datos actualizados al ${formatoFecha(status.generado)}` : null,
    isac ? `ISAC hasta ${nombreMes(isac)}` : null,
    icc ? `ICC hasta ${nombreMes(icc)}` : null,
    dol ? `dólar hasta el ${formatoFecha(dol)}` : null,
  ].filter(Boolean);
  return partes.join(" · ");
}

export function PiePagina({ series }: { series: Series }) {
  const grupos = new Map<string, { url: string; series: Serie[] }>();
  for (const s of Object.values(series)) {
    if (s.id.startsWith("poblacion_") && s.id !== "poblacion_06497") continue;
    const g = grupos.get(s.fuente) ?? { url: s.fuenteUrl, series: [] };
    g.series.push(s);
    grupos.set(s.fuente, g);
  }
  const ordenadas = [...grupos.entries()].sort(([a], [b]) => a.localeCompare(b, "es"));
  return (
    <footer className="pie-pagina">
      <div className="contenedor">
        <h2>Fuentes</h2>
        <p>
          <span className="fuente-indec">Fuente: INDEC</span>, BCRA, Ministerio de Capital Humano (vía datos.gob.ar) y entidades del sector. Solo datos públicos. Cuando una serie no tiene dato para un mes, se muestra “sin dato”: nunca se completa ni se estima.
        </p>
        <ul>
          {ordenadas.map(([fuente, g]) => {
            const ultimos = [...new Set(g.series.map(ultimoDato))];
            return (
              <li key={fuente}>
                {g.url ? (
                  <a href={g.url} target="_blank" rel="noopener noreferrer">
                    {fuente}
                  </a>
                ) : (
                  fuente
                )}{" "}
                — {g.series.length} serie{g.series.length > 1 ? "s" : ""}; último dato: {ultimos.slice(0, 3).join(", ")}
                {ultimos.length > 3 ? "…" : ""}
              </li>
            );
          })}
        </ul>
      </div>
    </footer>
  );
}
