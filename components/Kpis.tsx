import type { Kpi } from "@/lib/indicadores";
import { formatoNumero, formatoPct, formatoPesos } from "@/lib/formato";
import { nombreMesAnio } from "@/lib/periodo";

const ETIQUETA_IMPACTO = { favorable: "Favorable", desfavorable: "Desfavorable", neutro: "Neutro", "sin-dato": "Sin dato" } as const;

function valorPrincipal(k: Kpi): React.ReactNode {
  const v = k.medida.valor;
  if (v === null) return "sin dato";
  switch (k.formatoValor) {
    case "indice":
      return (
        <>
          {formatoNumero(v, 1)}
          <small>puntos</small>
        </>
      );
    case "pesos":
      return formatoPesos(v, 2);
    case "toneladas":
      return (
        <>
          {formatoNumero(v, 0)}
          <small>t</small>
        </>
      );
    case "m2":
      return (
        <>
          {formatoNumero(v, 0)}
          <small>m²</small>
        </>
      );
    case "cantidad":
      return formatoNumero(v, 0);
    case "pct":
      return (
        <>
          {formatoPct(k.medida.ia)}
          <small>interanual</small>
        </>
      );
  }
}

function flecha(x: number | null): string {
  if (x === null) return "";
  if (Math.abs(x) < 0.0005) return "→";
  return x > 0 ? "↑" : "↓";
}

export function TarjetaKpi({ k, refMes, compacta = false }: { k: Kpi; refMes: string; compacta?: boolean }) {
  const m = k.medida;
  const atrasado = m.periodo && m.periodo !== refMes;
  const esIcc = k.formatoValor === "pct";
  return (
    <article className={`kpi ${k.impacto}`} aria-label={k.titulo}>
      <p className="titulo">
        <span>{k.titulo}</span>
        <span className={`chip ${k.impacto}`} title={k.explicacion}>
          {ETIQUETA_IMPACTO[k.impacto]}
        </span>
      </p>
      <div className="valor num">{valorPrincipal(k)}</div>
      {m.periodo ? (
        <div className="vars num">
          {esIcc ? (
            <div>
              <span className="et">Mensual</span>
              <b>{formatoPct(m.mm, { signo: true })}</b>
            </div>
          ) : (
            <div>
              <span className="et">vs mismo mes 2025</span>
              <b>
                <span className="flecha" aria-hidden>
                  {flecha(m.ia)}
                </span>
                {formatoPct(m.ia, { signo: true })}
              </b>
            </div>
          )}
          <div>
            <span className="et">{k.etiquetaAcum}</span>
            <b>{formatoPct(m.acum, { signo: true })}</b>
          </div>
          {m.acumAnterior !== null && (
            <div>
              <span className="et">{k.etiquetaAcumAnterior}</span>
              <b>{formatoPct(m.acumAnterior, { signo: true })}</b>
            </div>
          )}
        </div>
      ) : (
        <p className="vacio">Sin datos cargados todavía.</p>
      )}
      {k.extra && <div className="pie num">{k.extra}</div>}
      <div className="pie">
        {m.periodo ? (
          <>
            {atrasado ? `Último dato: ${nombreMesAnio(m.periodo)} (aún no hay ${nombreMesAnio(refMes)})` : `Dato de ${nombreMesAnio(m.periodo)}`}
            {m.obs ? ` · ${m.obs.replace(/^\*+\s*/, "")}` : ""} · {k.serie.fuente}
          </>
        ) : (
          <>Fuente: {k.serie.fuente}. Se carga a mano cada mes (ver README).</>
        )}
        {!compacta && k.adelantado && (
          <>
            {" "}
            · <span className="chip adelantado">Indicador adelantado</span>
          </>
        )}
      </div>
    </article>
  );
}

export function Kpis({ kpis, refMes, compacta }: { kpis: Kpi[]; refMes: string; compacta?: boolean }) {
  return (
    <div className="kpis">
      {kpis.map((k) => (
        <TarjetaKpi key={k.id} k={k} refMes={refMes} compacta={compacta} />
      ))}
    </div>
  );
}
