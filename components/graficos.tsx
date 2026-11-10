"use client";

import { useEffect, useRef, useState } from "react";
import { Bar, BarChart, CartesianGrid, Cell, Legend, Line, LineChart, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import type { FilaMes } from "@/lib/graficos";

type Fmt = (v: number) => string;

export type Linea = { clave: string; nombre: string; color: string; punteada?: boolean };

const ejes = { tick: { fontSize: 12, fill: "var(--muted)" }, stroke: "var(--border)" };

function Contenedor({ ancho, alto, children }: { ancho?: number; alto: number; children: React.ReactElement }) {
  // En el informe impreso se usa ancho fijo: ResponsiveContainer no siempre mide bien al imprimir.
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);
  // Los gráficos se dibujan recién cuando se acercan a la pantalla: la página carga mucho más rápido en el celular.
  useEffect(() => {
    if (ancho || visible || !ref.current) return;
    if (typeof IntersectionObserver === "undefined") return setVisible(true);
    const io = new IntersectionObserver((es) => es.some((e) => e.isIntersecting) && setVisible(true), { rootMargin: "300px" });
    io.observe(ref.current);
    return () => io.disconnect();
  }, [ancho, visible]);
  if (ancho) return <div style={{ width: ancho, height: alto }}>{children}</div>;
  return (
    <div ref={ref} style={{ width: "100%", height: alto }}>
      {visible && (
        <ResponsiveContainer width="100%" height="100%">
          {children}
        </ResponsiveContainer>
      )}
    </div>
  );
}

export function GraficoLineas({ datos, lineas, formato, alto = 260, ancho, cero = false, animar = true }: { datos: FilaMes[]; lineas: Linea[]; formato: Fmt; alto?: number; ancho?: number; cero?: boolean; animar?: boolean }) {
  return (
    <Contenedor ancho={ancho} alto={alto}>
      <LineChart data={datos} width={ancho} height={alto} margin={{ top: 8, right: 12, bottom: 0, left: 4 }}>
        <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" vertical={false} />
        <XAxis dataKey="mes" {...ejes} interval="preserveStartEnd" minTickGap={8} />
        <YAxis {...ejes} tickFormatter={formato} width={64} domain={["auto", "auto"]} />
        {cero && <ReferenceLine y={0} stroke="var(--faint)" />}
        <Tooltip formatter={(v) => (typeof v === "number" ? formato(v) : "sin dato")} contentStyle={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 8, fontSize: 13 }} />
        {lineas.length > 2 && <Legend wrapperStyle={{ fontSize: 12 }} />}
        {lineas.map((l) => (
          <Line
            key={l.clave}
            type="monotone"
            dataKey={l.clave}
            name={l.nombre}
            stroke={l.color}
            strokeWidth={l.color === "var(--s2026)" || l.color === "var(--accent)" ? 3 : 2}
            strokeDasharray={l.punteada ? "5 4" : undefined}
            dot={false}
            connectNulls={false}
            isAnimationActive={animar}
          />
        ))}
      </LineChart>
    </Contenedor>
  );
}

/** 2025 en gris claro, 2026 en color de acento (§6 del plan). */
export function Comparacion({ datos, formato, alto, ancho, animar }: { datos: FilaMes[]; formato: Fmt; alto?: number; ancho?: number; animar?: boolean }) {
  return (
    <>
      {!ancho && (
        <div className="leyenda" aria-hidden>
          <span style={{ ["--c" as string]: "var(--s2025)" }}>2025</span>
          <span style={{ ["--c" as string]: "var(--s2026)" }}>2026</span>
        </div>
      )}
      <GraficoLineas
        datos={datos}
        formato={formato}
        alto={alto}
        ancho={ancho}
        animar={animar}
        lineas={[
          { clave: "2025", nombre: "2025", color: "var(--s2025)" },
          { clave: "2026", nombre: "2026", color: "var(--s2026)" },
        ]}
      />
    </>
  );
}

export function BarrasMes({ datos, formato, alto = 240 }: { datos: FilaMes[]; formato: Fmt; alto?: number }) {
  return (
    <>
      <div className="leyenda" aria-hidden>
        <span style={{ ["--c" as string]: "var(--s2025)" }}>2025</span>
        <span style={{ ["--c" as string]: "var(--s2026)" }}>2026</span>
      </div>
      <Contenedor alto={alto}>
        <BarChart data={datos} margin={{ top: 8, right: 12, bottom: 0, left: 4 }}>
          <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" vertical={false} />
          <XAxis dataKey="mes" {...ejes} />
          <YAxis {...ejes} tickFormatter={formato} width={56} />
          <Tooltip formatter={(v) => (typeof v === "number" ? formato(v) : "sin dato")} contentStyle={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 8, fontSize: 13 }} />
          <Bar dataKey="2025" fill="var(--s2025)" radius={[3, 3, 0, 0]} />
          <Bar dataKey="2026" fill="var(--s2026)" radius={[3, 3, 0, 0]} />
        </BarChart>
      </Contenedor>
    </>
  );
}

export type FilaRankingGrafico = { nombre: string; valor: number | null; resaltado: boolean };

export function Ranking({ datos, formato }: { datos: FilaRankingGrafico[]; formato: Fmt }) {
  const filas = datos.filter((d) => d.valor !== null) as (FilaRankingGrafico & { valor: number })[];
  const alto = Math.max(220, filas.length * 36 + 40);
  return (
    <Contenedor alto={alto}>
      <BarChart data={filas} layout="vertical" margin={{ top: 4, right: 24, bottom: 4, left: 4 }}>
        <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" horizontal={false} />
        <XAxis type="number" {...ejes} tickFormatter={formato} />
        <YAxis type="category" dataKey="nombre" {...ejes} width={168} tick={{ fontSize: 12, fill: "var(--text)" }} interval={0} />
        <ReferenceLine x={0} stroke="var(--faint)" />
        <Tooltip formatter={(v) => (typeof v === "number" ? formato(v) : "sin dato")} contentStyle={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 8, fontSize: 13 }} />
        <Bar dataKey="valor" name="Var. interanual" radius={[0, 3, 3, 0]}>
          {filas.map((f) => (
            <Cell key={f.nombre} fill={f.valor >= 0 ? (f.resaltado ? "var(--pos)" : "var(--s2025)") : f.resaltado ? "var(--neg)" : "var(--s2025)"} />
          ))}
        </Bar>
      </BarChart>
    </Contenedor>
  );
}
