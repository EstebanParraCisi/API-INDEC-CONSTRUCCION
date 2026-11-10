import type { Serie } from "@/lib/types";
import { formatoPct, SIN_DATO } from "@/lib/formato";
import { nombreMesAnio } from "@/lib/periodo";
import type { Sentido } from "@/lib/indicadores";

export function ultimoDato(s: Serie): string {
  if (!s.ultimoPeriodo) return "sin datos cargados";
  if (s.frecuencia === "anual") return `proyección ${s.datos[0]?.periodo ?? ""}–${s.ultimoPeriodo}`;
  if (s.frecuencia === "diaria") {
    const [a, m, d] = s.ultimoPeriodo.split("-");
    return `${d}/${m}/${a}`;
  }
  return nombreMesAnio(s.ultimoPeriodo);
}

/** "Fuente: X · dato hasta agosto 2026". Agrupa series de la misma fuente. */
export function Fuentes({ series }: { series: Serie[] }) {
  const grupos = new Map<string, { url: string; ultimos: Set<string> }>();
  for (const s of series) {
    const g = grupos.get(s.fuente) ?? { url: s.fuenteUrl, ultimos: new Set<string>() };
    g.ultimos.add(ultimoDato(s));
    grupos.set(s.fuente, g);
  }
  return (
    <p className="fuente">
      {[...grupos.entries()].map(([fuente, g], i) => (
        <span key={fuente}>
          {i > 0 && " · "}
          Fuente:{" "}
          {g.url ? (
            <a href={g.url} target="_blank" rel="noopener noreferrer">
              {fuente}
            </a>
          ) : (
            fuente
          )}{" "}
          — último dato: {[...g.ultimos].join(", ")}
        </span>
      ))}
    </p>
  );
}

export function Tarjeta({ titulo, conclusion, series, children, className }: { titulo: string; conclusion?: React.ReactNode; series: Serie[]; children: React.ReactNode; className?: string }) {
  return (
    <section className={`tarjeta ${className ?? ""}`}>
      <h3>{titulo}</h3>
      {conclusion && <p className="conclusion">{conclusion}</p>}
      {children}
      <Fuentes series={series} />
    </section>
  );
}

/** Celda de variación coloreada según impacto en el negocio. */
export function CeldaVar({ x, sentido = "neutro" }: { x: number | null; sentido?: Sentido }) {
  let clase = "";
  if (x !== null && sentido !== "neutro" && Math.abs(x) >= 0.0005) {
    const bueno = (sentido === "sube-bueno") === x > 0;
    clase = bueno ? "pos" : "neg";
  }
  return <td className={`num ${clase}`}>{x === null ? SIN_DATO : formatoPct(x, { signo: true })}</td>;
}

export function SinDatos({ texto }: { texto: string }) {
  return <p className="vacio">{texto}</p>;
}
