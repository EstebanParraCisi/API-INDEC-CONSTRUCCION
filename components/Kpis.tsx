import type { Kpi } from "@/lib/indicadores";
import { formatoPct } from "@/lib/formato";
import { nombreMesAnio } from "@/lib/periodo";

const ETIQUETA = { favorable: "A favor", desfavorable: "En contra", neutro: "Neutro", "sin-dato": "Sin dato" } as const;

function flecha(x: number | null): string {
  if (x === null || Math.abs(x) < 0.0005) return "";
  return x > 0 ? "▲" : "▼";
}

export function TarjetaKpi({ k, refMes }: { k: Kpi; refMes: string }) {
  const m = k.medida;
  const atrasado = m.periodo && m.periodo !== refMes;
  return (
    <article className={`kpi ${k.impacto}`} aria-label={k.titulo}>
      <header className="kpi-cab">
        <h3>
          {k.titulo} <span className="sigla">{k.sigla}</span>
        </h3>
        <span className={`semaforo ${k.impacto}`} title={k.explicacion}>
          <i aria-hidden />
          {ETIQUETA[k.impacto]}
        </span>
      </header>
      {k.principal !== null ? (
        <>
          <p className="kpi-numero num">
            <span aria-hidden className="kpi-flecha">
              {flecha(k.principal)}
            </span>
            {formatoPct(k.principal, { signo: true })}
            <small>{k.principalEtiqueta}</small>
          </p>
          <ul className="kpi-lineas num">
            {k.lineas.map((l) => (
              <li key={l}>{l}</li>
            ))}
          </ul>
        </>
      ) : (
        <p className="vacio">Sin datos todavía.</p>
      )}
      <p className="kpi-pie">
        {m.periodo ? (atrasado ? `Último dato: ${nombreMesAnio(m.periodo)}` : `Dato de ${nombreMesAnio(m.periodo)}`) : "Se carga a mano cada mes"} · {k.serie.fuente.replace(/ vía Series de Tiempo$/, "")}
      </p>
    </article>
  );
}

export function Kpis({ kpis, refMes }: { kpis: Kpi[]; refMes: string }) {
  return (
    <>
      <div className="kpis">
        {kpis.map((k) => (
          <TarjetaKpi key={k.id} k={k} refMes={refMes} />
        ))}
      </div>
      <p className="leyenda-semaforo">
        El color indica el <b>impacto para el negocio</b>, no si el número sube o baja: <span className="semaforo favorable"><i aria-hidden />a favor</span> <span className="semaforo desfavorable"><i aria-hidden />en contra</span> <span className="semaforo neutro"><i aria-hidden />neutro</span>. Cada dato es del último mes que publicó su fuente.
      </p>
    </>
  );
}
