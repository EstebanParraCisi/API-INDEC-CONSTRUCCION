"use client";

import { useState } from "react";
import { acumuladoVsAnioAnterior, deflactar, dividir, rebasear, ultimoPeriodoHasta, valorEn, varInteranual } from "@/lib/calc";
import { formatoNumero, formatoPct, formatoPesos, formatoPP } from "@/lib/formato";
import { continua, porMes, type FilaMes } from "@/lib/graficos";
import { INSUMOS, medir, obtener, rankingInsumos, type Series } from "@/lib/indicadores";
import { MESES_CORTOS, nombreMes, nombreMesAnio, partes, periodo } from "@/lib/periodo";
import type { Punto, Serie } from "@/lib/types";
import { BarrasMes, Comparacion, GraficoLineas, Ranking } from "./graficos";
import { CeldaVar, SinDatos, Tarjeta } from "./ui";

type P = { series: Series; refMes: string };

const f1 = (v: number) => formatoNumero(v, 1);
const f0 = (v: number) => formatoNumero(v, 0);
const fPct = (v: number) => formatoPct(v);
const fMiles = (v: number) => (Math.abs(v) >= 1e6 ? `${formatoNumero(v / 1e6, 1)} M` : Math.abs(v) >= 1e3 ? `${formatoNumero(v / 1e3, 0)} mil` : f0(v));
const signo = (x: number | null) => formatoPct(x, { signo: true });

/** i.a. mes a mes de 2026 para varias series (gráfico de líneas de variaciones). */
function iaPorMes(series: Record<string, Pick<Serie, "datos">>, anio = 2026): FilaMes[] {
  return MESES_CORTOS.map((mes, i) => {
    const fila: FilaMes = { mes };
    for (const [k, s] of Object.entries(series)) fila[k] = varInteranual(s, periodo(anio, i + 1));
    return fila;
  });
}

function mesDe(p: string | null) {
  return p ? nombreMes(p) : "—";
}

/* ───────────────────────── Bloque 1 ───────────────────────── */

export function BloqueActividad({ series, refMes }: P) {
  const [desest, setDesest] = useState(false);
  const isacOrig = obtener(series, "isac_general");
  const isacDesest = obtener(series, "isac_desest");
  const m = medir(isacOrig, refMes);
  const ranking = rankingInsumos(series, refMes);
  const corralon = ranking.filter((r) => r.corralon && r.ia !== null);
  const crecen = corralon.filter((r) => (r.ia ?? 0) > 0).length;
  const mesRanking = ranking.find((r) => r.periodo)?.periodo ?? null;

  const emaeC = obtener(series, "emae_construccion");
  const emaeG = obtener(series, "emae_general");
  const mC = medir(emaeC, refMes);
  const mG = medir(emaeG, refMes);

  const empleo = obtener(series, "empleo_construccion");
  const mE = medir(empleo, refMes);
  const perm = obtener(series, "permisos_superficie");
  const mP = medir(perm, refMes);
  const cem = obtener(series, "despachos_cemento");
  const mCem = medir(cem, refMes);
  const cons = obtener(series, "construya_indice");
  const mCons = medir(cons, refMes);

  return (
    <section className="bloque" id="actividad">
      <h2>1. Actividad de la construcción</h2>
      <p className="intro">¿Se está construyendo más o menos que en 2025? Volumen de obra, insumos, empleo y lo que anticipan los permisos.</p>
      <div className="grilla dos">
        <Tarjeta
          titulo="ISAC: 2026 vs 2025"
          series={[isacOrig]}
          conclusion={
            m.periodo ? (
              <>
                En {mesDe(m.periodo)} la actividad quedó <b>{signo(m.ia)}</b> contra el mismo mes de 2025; en lo que va del año acumula <b>{signo(m.acum)}</b>.
              </>
            ) : (
              "Sin datos del ISAC."
            )
          }
        >
          <div className="toggle" role="group" aria-label="Tipo de serie">
            <button aria-pressed={!desest} onClick={() => setDesest(false)}>
              Original
            </button>
            <button aria-pressed={desest} onClick={() => setDesest(true)}>
              Desestacionalizada
            </button>
          </div>
          <Comparacion datos={porMes((desest ? isacDesest : isacOrig).datos)} formato={f1} />
        </Tarjeta>

        <Tarjeta
          titulo={`Insumos: variación interanual${mesRanking ? ` (${nombreMesAnio(mesRanking)})` : ""}`}
          series={INSUMOS.map((i) => obtener(series, i.id)).slice(0, 1)}
          conclusion={
            corralon.length ? (
              <>
                <b>
                  {crecen} de {corralon.length}
                </b>{" "}
                insumos de corralón crecen frente al mismo mes de 2025.
              </>
            ) : undefined
          }
        >
          <Ranking datos={ranking.map((r) => ({ nombre: r.nombre + (r.desest ? " *" : ""), valor: r.ia, resaltado: r.corralon }))} formato={fPct} />
          <p className="fuente">
            En color, los insumos que vende un corralón; en gris, el resto. * Serie desestacionalizada: INDEC no publica la original de cemento, sanitarios y asfalto. Como se compara cada mes contra el mismo mes del año anterior, el resultado es muy parecido al de la serie original.
          </p>
        </Tarjeta>

        <Tarjeta
          titulo="EMAE: construcción vs economía en general"
          series={[emaeC]}
          conclusion={
            mC.periodo ? (
              <>
                En {mesDe(mC.periodo)} la construcción varió <b>{signo(mC.ia)}</b> interanual y la economía en general <b>{signo(mG.ia)}</b>.
              </>
            ) : undefined
          }
        >
          <GraficoLineas
            datos={iaPorMes({ construccion: emaeC, general: emaeG })}
            formato={fPct}
            cero
            lineas={[
              { clave: "construccion", nombre: "Construcción (i.a.)", color: "var(--accent)" },
              { clave: "general", nombre: "Economía total (i.a.)", color: "var(--neu)", punteada: true },
            ]}
          />
          <div className="leyenda">
            <span style={{ ["--c" as string]: "var(--accent)" }}>Construcción</span>
            <span style={{ ["--c" as string]: "var(--neu)" }}>Economía total</span>
            <span>variación interanual, 2026</span>
          </div>
        </Tarjeta>

        <Tarjeta
          titulo="Empleo registrado en la construcción"
          series={[empleo]}
          conclusion={
            mE.periodo ? (
              <>
                En {mesDe(mE.periodo)} había <b>{formatoNumero(mE.valor, 1)} mil</b> asalariados registrados, <b>{signo(mE.ia)}</b> contra el mismo mes de 2025.
              </>
            ) : undefined
          }
        >
          <Comparacion datos={porMes(empleo.datos)} formato={f1} />
        </Tarjeta>

        <Tarjeta
          titulo="Permisos de edificación: superficie autorizada"
          series={[perm]}
          conclusion={
            mP.periodo ? (
              <>
                Indicador adelantado. En {mesDe(mP.periodo)} se autorizaron <b>{formatoNumero(mP.valor, 0)} m²</b> ({signo(mP.ia)} interanual); en el año, <b>{signo(mP.acum)}</b> contra 2025.
              </>
            ) : undefined
          }
        >
          <Comparacion datos={porMes(perm.datos)} formato={fMiles} />
        </Tarjeta>

        <Tarjeta
          titulo="Despachos de cemento e Índice Construya"
          series={[cem, cons]}
          conclusion={
            mCem.periodo || mCons.periodo ? (
              <>
                {mCem.periodo && (
                  <>
                    Cemento en {mesDe(mCem.periodo)}: <b>{formatoNumero(mCem.valor, 0)} t</b> ({signo(mCem.ia)} i.a.).{" "}
                  </>
                )}
                {mCons.periodo && (
                  <>
                    Construya en {mesDe(mCons.periodo)}: <b>{signo(mCons.ia)}</b> i.a.
                  </>
                )}
              </>
            ) : undefined
          }
        >
          {cem.ultimoPeriodo ? <Comparacion datos={porMes(cem.datos)} formato={fMiles} /> : <SinDatos texto="Despachos de cemento: todavía no se cargaron datos (data/manual/despachos_cemento.csv)." />}
          {cons.ultimoPeriodo ? <Comparacion datos={porMes(cons.datos)} formato={f1} /> : <SinDatos texto="Índice Construya: todavía no se cargaron datos (data/manual/indice_construya.csv)." />}
        </Tarjeta>
      </div>
    </section>
  );
}

/* ───────────────────────── Bloque 2 ───────────────────────── */

function TablaPrecios({ ids, series, refMes, ipc }: { ids: string[]; series: Series; refMes: string; ipc: Serie }) {
  const filas = ids.map((id) => {
    const s = obtener(series, id);
    const m = medir(s, refMes, "precios");
    const mIpc = m.periodo ? medir(ipc, m.periodo, "precios") : null;
    const brecha = m.ia !== null && mIpc?.ia != null && mIpc.periodo === m.periodo ? m.ia - mIpc.ia : null;
    return { s, m, brecha };
  });
  return (
    <div className="tabla-scroll">
      <table>
        <thead>
          <tr>
            <th>Rubro</th>
            <th>Mes</th>
            <th>Mensual</th>
            <th>Interanual</th>
            <th>vs inflación</th>
            <th>Acum. año</th>
            <th>Igual período año ant.</th>
          </tr>
        </thead>
        <tbody>
          {filas.map(({ s, m, brecha }, i) => (
            <tr key={s.id} className={i === 0 ? "resaltado" : ""}>
              <td>{s.nombre.replace(/^ICC — /, "")}</td>
              <td>{m.periodo ? MESES_CORTOS[partes(m.periodo).mes - 1] : "—"}</td>
              <CeldaVar x={m.mm} />
              <CeldaVar x={m.ia} />
              <td className={`num ${brecha === null ? "" : brecha > 0.005 ? "neg" : brecha < -0.005 ? "pos" : ""}`}>{brecha === null ? "—" : `${brecha > 0 ? "+" : ""}${formatoPP(brecha)}`}</td>
              <CeldaVar x={m.acum} />
              <CeldaVar x={m.acumAnterior} />
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function BloqueCostos({ series, refMes }: P) {
  const icc = obtener(series, "icc_general");
  const mat = obtener(series, "icc_materiales");
  const mo = obtener(series, "icc_mano_obra");
  const ipc = obtener(series, "ipc_gba");
  const mIcc = medir(icc, refMes, "precios");
  const mMat = medir(mat, refMes, "precios");
  const mMo = medir(mo, refMes, "precios");
  const mIpc = medir(ipc, mIcc.periodo ?? refMes, "precios");

  const dolar = obtener(series, "dolar_mayorista");
  const matUsd = rebasear(dividir(mat, dolar), "2024-12");
  const pUsd = ultimoPeriodoHasta({ datos: matUsd }, refMes);
  const iaUsd = pUsd ? varInteranual({ datos: matUsd }, pUsd) : null;

  const sipmIds = ["sipm_general", "sipm_cemento_cal", "sipm_hormigon_yeso", "sipm_ladrillos", "sipm_ceramicos", "sipm_hierro_acero", "sipm_metalicos_estructurales", "sipm_pinturas", "sipm_vidrio", "sipm_plasticos", "sipm_maderas"];
  const redetIds = ["redet_cemento", "redet_hormigon", "redet_hierro", "redet_arena", "redet_ceramicos", "redet_canos_pvc", "redet_sanitaria", "redet_albanileria"];
  const ipcNac = obtener(series, "ipc_nacional");

  return (
    <section className="bloque" id="costos">
      <h2>2. Costos e insumos</h2>
      <p className="intro">¿Cuánto cuesta construir y cómo se mueven los precios de los materiales frente a la inflación? En la columna “vs inflación”, rojo = sube más que el IPC.</p>
      <div className="grilla">
        <Tarjeta
          titulo="Costo de la construcción (ICC, Gran Buenos Aires)"
          series={[icc, ipc]}
          conclusion={
            mIcc.periodo ? (
              <>
                En {mesDe(mIcc.periodo)} construir costó <b>{signo(mIcc.mm)}</b> más que el mes anterior y <b>{signo(mIcc.ia)}</b> más que hace un año (inflación: {signo(mIpc.ia)}). Mano de obra {signo(mMo.ia)} vs materiales {signo(mMat.ia)}.
              </>
            ) : undefined
          }
        >
          <TablaPrecios ids={["icc_general", "icc_materiales", "icc_mano_obra", "icc_gastos_generales"]} series={series} refMes={refMes} ipc={ipc} />
        </Tarjeta>
      </div>
      <div className="grilla dos" style={{ marginTop: 16 }}>
        <Tarjeta titulo="¿Construir se encarece más que la vida en general?" series={[icc, ipc]} conclusion="Variación interanual de cada mes de 2026: costo de la construcción, materiales e inflación (IPC GBA).">
          <GraficoLineas
            datos={iaPorMes({ icc, mat, ipc })}
            formato={fPct}
            lineas={[
              { clave: "icc", nombre: "ICC nivel general", color: "var(--accent)" },
              { clave: "mat", nombre: "ICC materiales", color: "var(--pos)" },
              { clave: "ipc", nombre: "Inflación (IPC GBA)", color: "var(--neu)", punteada: true },
            ]}
          />
        </Tarjeta>
        <Tarjeta
          titulo="Materiales en dólares"
          series={[mat, dolar]}
          conclusion={
            pUsd ? (
              <>
                Medidos en dólares mayoristas, los materiales están <b>{signo(iaUsd)}</b> contra {nombreMes(pUsd)} de 2025. {iaUsd !== null && (iaUsd > 0 ? "Se encarecieron en dólares." : "Se abarataron en dólares.")}
              </>
            ) : undefined
          }
        >
          <Comparacion datos={porMes(matUsd)} formato={f0} />
          <p className="fuente">ICC materiales dividido por el dólar mayorista promedio del mes. Índice: diciembre 2024 = 100.</p>
        </Tarjeta>
      </div>
      <div className="grilla" style={{ marginTop: 16 }}>
        <Tarjeta titulo="Precios mayoristas de insumos clave (IPIM)" series={[obtener(series, "sipm_general")]} conclusion="Precios a la salida de fábrica o importación, sin impuestos: anticipan los costos de reposición de un corralón.">
          <TablaPrecios ids={sipmIds} series={series} refMes={refMes} ipc={ipcNac} />
          <p className="fuente">La columna “vs inflación” compara contra el IPC Nacional, porque el IPIM es un índice nacional.</p>
        </Tarjeta>
        <Tarjeta titulo="Precios por material (índices de redeterminación de obra pública)" series={[obtener(series, "redet_cemento")]} conclusion="Son los índices oficiales que se usan para actualizar los contratos de obra pública. Sirven como precio de referencia de cada material en el Gran Buenos Aires.">
          <TablaPrecios ids={redetIds} series={series} refMes={refMes} ipc={ipc} />
        </Tarjeta>
      </div>
    </section>
  );
}

/* ───────────────────────── Bloque 3 ───────────────────────── */

export function BloqueMacro({ series, refMes }: P) {
  const ipc = obtener(series, "ipc_gba");
  const ipcNac = obtener(series, "ipc_nacional");
  const rem = obtener(series, "rem_inflacion_12m");
  const mIpc = medir(ipc, refMes, "precios");
  const mRem = medir(rem, refMes);
  const inflMensual: Punto[] = ipc.datos.map((d) => {
    const prev = valorEn(ipc, periodo(partes(d.periodo).mes === 1 ? partes(d.periodo).anio - 1 : partes(d.periodo).anio, partes(d.periodo).mes === 1 ? 12 : partes(d.periodo).mes - 1));
    return { periodo: d.periodo, valor: d.valor !== null && prev ? d.valor / prev - 1 : null };
  });
  const mmAnt = mIpc.periodo ? valorEn({ datos: inflMensual }, periodo(partes(mIpc.periodo).anio - 1, partes(mIpc.periodo).mes)) : null;

  const may = obtener(series, "dolar_mayorista");
  const min = obtener(series, "dolar_minorista");
  const mayD = obtener(series, "dolar_mayorista_diario");
  const mMay = medir(may, refMes, "precios");

  const tamar = obtener(series, "tasa_tamar");
  const badlar = obtener(series, "tasa_badlar");
  const mTamar = medir(tamar, refMes);

  const hip = obtener(series, "hipotecarios_stock");
  const uva = obtener(series, "uva");
  const tasaUva = obtener(series, "tasa_hipotecaria_uva");
  const pHip = ultimoPeriodoHasta(ipcNac, refMes);
  const hipReal = pHip ? deflactar(hip, ipcNac, pHip) : [];
  const pHipReal = ultimoPeriodoHasta({ datos: hipReal }, refMes);
  const iaHipReal = pHipReal ? varInteranual({ datos: hipReal }, pHipReal) : null;
  const mTasaUva = medir(tasaUva, refMes);
  const mUva = medir(uva, refMes);

  const sal = obtener(series, "salarios_privado_registrado");
  const salReal = rebasear(deflactar(sal, ipcNac, "2024-12"), "2024-12");
  const pSal = ultimoPeriodoHasta({ datos: salReal }, refMes);
  const iaSalReal = pSal ? varInteranual({ datos: salReal }, pSal) : null;

  return (
    <section className="bloque" id="macro">
      <h2>3. Macro y financiamiento</h2>
      <p className="intro">Inflación, dólar, tasas y crédito: lo que define cuánto pueden gastar los clientes y cuánto cuesta financiar el stock.</p>
      <div className="grilla dos">
        <Tarjeta
          titulo="Inflación mensual (IPC GBA)"
          series={[ipc, rem]}
          conclusion={
            mIpc.periodo ? (
              <>
                En {mesDe(mIpc.periodo)} la inflación fue <b>{formatoPct(mIpc.mm)}</b> (un año antes: {formatoPct(mmAnt)}). En el año acumula <b>{formatoPct(mIpc.acum)}</b> (mismo período 2025: {formatoPct(mIpc.acumAnterior)}).
                {mRem.periodo && (
                  <>
                    {" "}
                    El mercado espera <b>{formatoNumero(mRem.valor, 1)}%</b> para los próximos 12 meses (REM, {nombreMesAnio(mRem.periodo)}).
                  </>
                )}
              </>
            ) : undefined
          }
        >
          <BarrasMes datos={porMes(inflMensual)} formato={fPct} />
        </Tarjeta>
        <Tarjeta
          titulo="Dólar mayorista y minorista (promedio mensual)"
          series={[may, mayD]}
          conclusion={
            mMay.periodo ? (
              <>
                El mayorista promedió <b>{formatoPesos(mMay.valor)}</b> en {mesDe(mMay.periodo)}: {signo(mMay.ia)} interanual y {signo(mMay.acum)} desde diciembre.
                {mayD.ultimoPeriodo && (
                  <>
                    {" "}
                    Último dato diario: {formatoPesos(valorEn(mayD, mayD.ultimoPeriodo))} ({mayD.ultimoPeriodo.split("-").reverse().join("/")}).
                  </>
                )}
              </>
            ) : undefined
          }
        >
          <GraficoLineas
            datos={continua({ may: may.datos, min: min.datos }, "2025-01")}
            formato={f0}
            lineas={[
              { clave: "may", nombre: "Mayorista", color: "var(--accent)" },
              { clave: "min", nombre: "Minorista", color: "var(--neu)", punteada: true },
            ]}
          />
          <div className="leyenda">
            <span style={{ ["--c" as string]: "var(--accent)" }}>Mayorista</span>
            <span style={{ ["--c" as string]: "var(--neu)" }}>Minorista</span>
          </div>
        </Tarjeta>
        <Tarjeta
          titulo="Costo del dinero: tasas TAMAR y BADLAR"
          series={[tamar]}
          conclusion={
            mTamar.periodo ? (
              <>
                La TAMAR promedió <b>{formatoNumero(mTamar.valor, 1)}%</b> anual en {mesDe(mTamar.periodo)} (hace un año: {formatoNumero(valorEn(tamar, periodo(partes(mTamar.periodo).anio - 1, partes(mTamar.periodo).mes)), 1)}%). Es la referencia de lo que cuesta financiar stock y vender en cuotas.
              </>
            ) : undefined
          }
        >
          <GraficoLineas
            datos={continua({ tamar: tamar.datos, badlar: badlar.datos }, "2025-01")}
            formato={(v) => `${formatoNumero(v, 0)}%`}
            lineas={[
              { clave: "tamar", nombre: "TAMAR", color: "var(--accent)" },
              { clave: "badlar", nombre: "BADLAR", color: "var(--neu)", punteada: true },
            ]}
          />
          <div className="leyenda">
            <span style={{ ["--c" as string]: "var(--accent)" }}>TAMAR</span>
            <span style={{ ["--c" as string]: "var(--neu)" }}>BADLAR</span>
            <span>% nominal anual</span>
          </div>
        </Tarjeta>
        <Tarjeta
          titulo="Crédito hipotecario (stock en pesos constantes)"
          series={[hip, uva, ipcNac]}
          conclusion={
            pHipReal ? (
              <>
                Descontada la inflación, el stock de préstamos hipotecarios está <b>{signo(iaHipReal)}</b> contra un año antes ({nombreMesAnio(pHipReal)}).
                {mTasaUva.periodo && <> Tasa de los créditos UVA: {formatoNumero(mTasaUva.valor, 2)}% anual + UVA.</>}
                {mUva.periodo && <> UVA promedio de {mesDe(mUva.periodo)}: {formatoPesos(mUva.valor)}.</>}
              </>
            ) : undefined
          }
        >
          <Comparacion datos={porMes(hipReal)} formato={(v) => formatoNumero(v / 1e6, 1)} />
          <p className="fuente">Billones de pesos de {pHip ? nombreMesAnio(pHip) : "—"} (deflactado por IPC Nacional). Stock a fin de mes.</p>
        </Tarjeta>
        <Tarjeta
          titulo="Salario real (privado registrado)"
          series={[sal, ipcNac]}
          conclusion={
            pSal ? (
              <>
                El poder de compra del salario privado registrado está <b>{signo(iaSalReal)}</b> contra {nombreMes(pSal)} de 2025.
              </>
            ) : undefined
          }
        >
          <Comparacion datos={porMes(salReal)} formato={f1} />
          <p className="fuente">Índice de salarios deflactado por IPC Nacional. Diciembre 2024 = 100.</p>
        </Tarjeta>
      </div>
    </section>
  );
}

/* ───────────────────────── Bloque 4 ───────────────────────── */

const PARTIDOS = [
  { cod: "06497", nombre: "Luján" },
  { cod: "06560", nombre: "Moreno" },
  { cod: "06364", nombre: "General Rodríguez" },
  { cod: "06638", nombre: "Pilar" },
  { cod: "06525", nombre: "Marcos Paz" },
  { cod: "06532", nombre: "Mercedes" },
  { cod: "06266", nombre: "Exaltación de la Cruz" },
];
const PERMISOS_MUNI = [
  { id: "permisos_superficie_moreno", nombre: "Moreno" },
  { id: "permisos_superficie_general_rodriguez", nombre: "General Rodríguez" },
  { id: "permisos_superficie_mercedes", nombre: "Mercedes" },
];

export function BloqueLocal({ series, refMes }: P) {
  const pob = PARTIDOS.map((p) => {
    const s = obtener(series, `poblacion_${p.cod}`);
    const v22 = valorEn(s, "2022");
    const v26 = valorEn(s, "2026");
    return { ...p, s, v22, v26, var: v22 && v26 ? v26 / v22 - 1 : null };
  });
  const tot22 = pob.every((p) => p.v22) ? pob.reduce((a, p) => a + (p.v22 ?? 0), 0) : null;
  const tot26 = pob.every((p) => p.v26) ? pob.reduce((a, p) => a + (p.v26 ?? 0), 0) : null;

  const muni = PERMISOS_MUNI.map((m) => {
    const s = obtener(series, m.id);
    const p = ultimoPeriodoHasta(s, refMes);
    return { ...m, s, p, ultimo: p ? valorEn(s, p) : null, acum: p ? acumuladoVsAnioAnterior(s, p, "suma") : null, suma: p ? sumaAnio(s, p) : null };
  });
  const comp = obtener(series, "escrituras_pba_compraventas");
  const hipo = obtener(series, "escrituras_pba_hipotecas");
  const mComp = medir(comp, refMes);
  const mHipo = medir(hipo, refMes);

  return (
    <section className="bloque" id="local">
      <h2>4. Mercado local: zona oeste</h2>
      <p className="intro">Hay pocos datos públicos por municipio. Mostramos lo que existe y decimos qué falta.</p>
      <div className="grilla dos">
        <Tarjeta titulo="Población proyectada 2026" series={[pob[0].s]} conclusion={tot22 && tot26 ? <>Los siete partidos suman <b>{formatoNumero(tot26, 0)}</b> habitantes en 2026, {signo(tot26 / tot22 - 1)} desde 2022.</> : undefined}>
          <div className="tabla-scroll">
            <table>
              <thead>
                <tr>
                  <th>Partido</th>
                  <th>2022</th>
                  <th>2026</th>
                  <th>Var.</th>
                </tr>
              </thead>
              <tbody>
                {pob.map((p) => (
                  <tr key={p.cod}>
                    <td>{p.nombre}</td>
                    <td className="num">{formatoNumero(p.v22, 0)}</td>
                    <td className="num">{formatoNumero(p.v26, 0)}</td>
                    <CeldaVar x={p.var} />
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="fuente">Estimación al 1° de julio de cada año, basada en el Censo 2022.</p>
        </Tarjeta>
        <Tarjeta titulo="Permisos de edificación en la zona" series={muni.map((m) => m.s).slice(0, 1)} conclusion="Es el único dato público de actividad por municipio. De la zona, INDEC releva Moreno, General Rodríguez y Mercedes (no incluye Luján ni Pilar).">
          <div className="tabla-scroll">
            <table>
              <thead>
                <tr>
                  <th>Municipio</th>
                  <th>Último mes</th>
                  <th>m² del mes</th>
                  <th>m² en el año</th>
                  <th>vs 2025</th>
                </tr>
              </thead>
              <tbody>
                {muni.map((m) => (
                  <tr key={m.id}>
                    <td>{m.nombre}</td>
                    <td>{m.p ? MESES_CORTOS[partes(m.p).mes - 1] : "—"}</td>
                    <td className="num">{formatoNumero(m.ultimo, 0)}</td>
                    <td className="num">{formatoNumero(m.suma, 0)}</td>
                    <CeldaVar x={m.acum} sentido="sube-bueno" />
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="fuente">Los permisos municipales varían mucho de un mes a otro: conviene mirar el acumulado del año.</p>
        </Tarjeta>
        <Tarjeta
          titulo="Escrituras en la Provincia de Buenos Aires"
          series={[comp]}
          conclusion={
            mComp.periodo ? (
              <>
                En {mesDe(mComp.periodo)} hubo <b>{formatoNumero(mComp.valor, 0)}</b> compraventas ({signo(mComp.ia)} i.a.) y {formatoNumero(mHipo.valor, 0)} hipotecas ({signo(mHipo.ia)} i.a.).
              </>
            ) : undefined
          }
        >
          {comp.ultimoPeriodo ? <Comparacion datos={porMes(comp.datos)} formato={fMiles} /> : <SinDatos texto="Todavía no se cargaron datos (data/manual/escrituras_pba.csv). Es el mejor proxy público del mercado inmobiliario bonaerense." />}
        </Tarjeta>
        <section className="tarjeta">
          <h3>Qué datos locales no existen (todavía)</h3>
          <p className="conclusion">En las fuentes públicas no hay, por municipio: ventas de materiales, empleo en la construcción, escrituras ni ISAC. Los permisos solo se publican para 246 municipios, y entre ellos no están Luján ni Pilar.</p>
          <p className="vacio">Más adelante se podrían sumar datos municipales (pedidos a cada municipio o al Colegio de Escribanos por partido), con la misma estructura de archivos que ya usa la app.</p>
        </section>
      </div>
    </section>
  );
}

function sumaAnio(s: Serie, p: string): number | null {
  const { anio, mes } = partes(p);
  let t = 0;
  for (let m = 1; m <= mes; m++) {
    const v = valorEn(s, periodo(anio, m));
    if (v === null) return null;
    t += v;
  }
  return t;
}
