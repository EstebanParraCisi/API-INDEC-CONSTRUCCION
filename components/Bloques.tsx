"use client";

import { acumuladoVsAnioAnterior, deflactar, dividir, rebasear, ultimoPeriodoHasta, valorEn, varInteranual } from "@/lib/calc";
import { formatoNumero, formatoPct, formatoPesos, formatoPP } from "@/lib/formato";
import { continua, porMes, type FilaMes } from "@/lib/graficos";
import { medir, obtener, rankingInsumos, type Series } from "@/lib/indicadores";
import { MESES_CORTOS, nombreMes, nombreMesAnio, partes, periodo } from "@/lib/periodo";
import type { Punto, Serie } from "@/lib/types";
import { BarrasMes, Comparacion, GraficoLineas, Ranking } from "./graficos";
import { CeldaVar, Fuentes, SinDatos, Tarjeta } from "./ui";

type P = { series: Series; refMes: string };

const f0 = (v: number) => formatoNumero(v, 0);
const f1 = (v: number) => formatoNumero(v, 1);
const fPct = (v: number) => formatoPct(v);
const fMiles = (v: number) => (Math.abs(v) >= 1e6 ? `${formatoNumero(v / 1e6, 1)} M` : Math.abs(v) >= 1e3 ? `${formatoNumero(v / 1e3, 0)} mil` : f0(v));
const signo = (x: number | null) => formatoPct(x, { signo: true });
const pctAbs = (x: number | null) => formatoPct(x === null ? null : Math.abs(x));
const mesDe = (p: string | null) => (p ? nombreMes(p) : "—");

function iaPorMes(series: Record<string, Pick<Serie, "datos">>, anio = 2026): FilaMes[] {
  return MESES_CORTOS.map((mes, i) => {
    const fila: FilaMes = { mes };
    for (const [k, s] of Object.entries(series)) fila[k] = varInteranual(s, periodo(anio, i + 1));
    return fila;
  });
}

/** Un bloque = una pregunta, una frase de "qué significa", lo principal y un desplegable con el detalle. */
function Bloque({ id, numero, pregunta, significa, children, detalle }: { id: string; numero: number; pregunta: string; significa: React.ReactNode; children: React.ReactNode; detalle?: React.ReactNode }) {
  return (
    <section className="bloque" id={id}>
      <h2>
        <span className="num-bloque">{numero}</span> {pregunta}
      </h2>
      {significa && <p className="significa">{significa}</p>}
      {children}
      {detalle && (
        <details className="detalle">
          <summary>Ver más detalle</summary>
          <div className="grilla dos">{detalle}</div>
        </details>
      )}
    </section>
  );
}

/* Tabla simple de precios: cuánto subió en un año y si fue más o menos que la inflación. */
type FilaPrecio = { id: string; nombre: string; periodo: string | null; ia: number | null; brecha: number | null };

function filasPrecios(series: Series, items: { id: string; nombre?: string }[], refMes: string, ipc: Serie): FilaPrecio[] {
  return items.map(({ id, nombre }) => {
    const s = obtener(series, id);
    const m = medir(s, refMes, "precios");
    const mIpc = m.periodo ? medir(ipc, m.periodo, "precios") : null;
    const brecha = m.ia !== null && mIpc?.ia != null && mIpc.periodo === m.periodo ? m.ia - mIpc.ia : null;
    return { id, nombre: nombre ?? s.nombre, periodo: m.periodo, ia: m.ia, brecha };
  });
}

function TablaSimple({ filas, inflacion, titulo = "Material" }: { filas: FilaPrecio[]; inflacion: { periodo: string | null; ia: number | null }; titulo?: string }) {
  return (
    <div className="tabla-scroll">
      <table className="simple">
        <thead>
          <tr>
            <th>{titulo}</th>
            <th>Subió en un año</th>
            <th>Frente a la inflación</th>
          </tr>
        </thead>
        <tbody>
          {filas.map((f) => (
            <tr key={f.id}>
              <td>{f.nombre}</td>
              <td className="num">{signo(f.ia)}</td>
              <td className={`num ${f.brecha === null ? "" : f.brecha > 0.01 ? "neg" : f.brecha < -0.01 ? "pos" : ""}`} title={f.brecha === null ? "" : `${f.brecha > 0 ? "+" : ""}${formatoPP(f.brecha)}`}>
                {f.brecha === null ? "—" : f.brecha > 0.01 ? "▲ más" : f.brecha < -0.01 ? "▼ menos" : "≈ igual"}
              </td>
            </tr>
          ))}
          <tr className="referencia">
            <td>Inflación (referencia)</td>
            <td className="num">{signo(inflacion.ia)}</td>
            <td />
          </tr>
        </tbody>
      </table>
    </div>
  );
}

/* ───────────────────────── 1. Actividad ───────────────────────── */

export function BloqueActividad({ series, refMes }: P) {
  const isac = obtener(series, "isac_general");
  const m = medir(isac, refMes);
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

  const significa = m.periodo ? (
    <>
      En {mesDe(m.periodo)} se construyó <b>{m.ia !== null && m.ia < 0 ? `${pctAbs(m.ia)} menos` : `${pctAbs(m.ia)} más`}</b> que en {mesDe(m.periodo)} de 2025. En lo que va del año, la actividad está <b>{m.acum !== null && Math.abs(m.acum) < 0.01 ? "pareja con" : m.acum !== null && m.acum < 0 ? `${pctAbs(m.acum)} abajo de` : `${pctAbs(m.acum)} arriba de`}</b> 2025.
      {corralon.length > 0 && (
        <>
          {" "}
          De los {corralon.length} materiales típicos de corralón, <b>{crecen}</b> se despacha{crecen === 1 ? "" : "n"} más que hace un año.
        </>
      )}
    </>
  ) : null;

  return (
    <Bloque
      id="actividad"
      numero={1}
      pregunta="¿Se construye más o menos que en 2025?"
      significa={significa}
      detalle={
        <>
          <Tarjeta titulo={`Qué materiales se despachan más y menos${mesRanking ? ` (${nombreMesAnio(mesRanking)} vs un año antes)` : ""}`} series={[obtener(series, "insumo_hormigon")]}>
            <Ranking datos={ranking.map((r) => ({ nombre: r.nombre + (r.desest ? " *" : ""), valor: r.ia, resaltado: r.corralon }))} formato={fPct} />
            <p className="fuente">En color, los materiales de corralón. * Para cemento, sanitarios y asfalto INDEC solo publica la serie desestacionalizada (sin efecto calendario); comparada mes contra mes da casi lo mismo.</p>
          </Tarjeta>
          <Tarjeta titulo="Venta de cemento e Índice Construya" series={[cem, cons]} conclusion={mCem.periodo ? <>Cemento en {mesDe(mCem.periodo)}: <b>{signo(mCem.ia)}</b> vs un año antes{mCons.periodo ? <>; ventas de las grandes marcas (Construya) en {mesDe(mCons.periodo)}: <b>{signo(mCons.ia)}</b></> : null}.</> : undefined}>
            {cem.ultimoPeriodo ? <Comparacion datos={porMes(cem.datos)} formato={fMiles} /> : <SinDatos texto="Sin datos cargados (data/manual/despachos_cemento.csv)." />}
          </Tarjeta>
          <Tarjeta titulo="Obras que vienen: metros autorizados para construir" series={[perm]} conclusion={mP.periodo ? <>En {mesDe(mP.periodo)} se autorizaron <b>{formatoNumero(mP.valor, 0)} m²</b> ({signo(mP.ia)} vs un año antes). Anticipa la demanda de los próximos 3–6 meses.</> : undefined}>
            <Comparacion datos={porMes(perm.datos)} formato={fMiles} />
          </Tarjeta>
          <Tarjeta titulo="La construcción frente al resto de la economía" series={[emaeC]} conclusion={mC.periodo ? <>En {mesDe(mC.periodo)}: construcción <b>{signo(mC.ia)}</b>, economía total <b>{signo(mG.ia)}</b> (vs un año antes).</> : undefined}>
            <GraficoLineas
              datos={iaPorMes({ construccion: emaeC, general: emaeG })}
              formato={fPct}
              cero
              lineas={[
                { clave: "construccion", nombre: "Construcción", color: "var(--accent)" },
                { clave: "general", nombre: "Economía total", color: "var(--neu)", punteada: true },
              ]}
            />
          </Tarjeta>
          <Tarjeta titulo="Empleo registrado en la construcción" series={[empleo]} conclusion={mE.periodo ? <>En {mesDe(mE.periodo)}: <b>{formatoNumero(mE.valor, 1)} mil</b> trabajadores registrados, {signo(mE.ia)} vs un año antes.</> : undefined}>
            <Comparacion datos={porMes(empleo.datos)} formato={f1} />
          </Tarjeta>
        </>
      }
    >
      <Tarjeta titulo="Obras en marcha: 2026 contra 2025" series={[isac]}>
        <Comparacion datos={porMes(isac.datos)} formato={f0} />
        <p className="fuente">Índice de actividad de la construcción (ISAC): mide la cantidad de materiales que se despachan para obras.</p>
      </Tarjeta>
    </Bloque>
  );
}

/* ───────────────────────── 2. Costos ───────────────────────── */

export function BloqueCostos({ series, refMes }: P) {
  const ipc = obtener(series, "ipc_gba");
  const ipcNac = obtener(series, "ipc_nacional");
  const icc = obtener(series, "icc_general");
  const mat = obtener(series, "icc_materiales");
  const mMat = medir(mat, refMes, "precios");
  const mMo = medir(obtener(series, "icc_mano_obra"), refMes, "precios");
  const mIpc = medir(ipc, mMat.periodo ?? refMes, "precios");

  const principales = filasPrecios(
    series,
    [
      { id: "icc_materiales", nombre: "Materiales (en general)" },
      { id: "icc_mano_obra", nombre: "Mano de obra" },
      { id: "redet_cemento", nombre: "Cemento en bolsa" },
      { id: "redet_hormigon", nombre: "Hormigón" },
      { id: "redet_hierro", nombre: "Hierro" },
      { id: "redet_arena", nombre: "Arena" },
      { id: "redet_ceramicos", nombre: "Cerámicos" },
      { id: "redet_canos_pvc", nombre: "Caños de PVC" },
      { id: "redet_sanitaria", nombre: "Sanitarios y grifería" },
    ],
    refMes,
    ipc,
  );
  const mayoristas = filasPrecios(
    series,
    [
      { id: "sipm_cemento_cal", nombre: "Cemento y cal" },
      { id: "sipm_ladrillos", nombre: "Ladrillos" },
      { id: "sipm_ceramicos", nombre: "Cerámicos y sanitarios" },
      { id: "sipm_hierro_acero", nombre: "Hierro y acero" },
      { id: "sipm_hormigon_yeso", nombre: "Hormigón, cemento y yeso (artículos)" },
      { id: "sipm_pinturas", nombre: "Pinturas" },
      { id: "sipm_plasticos", nombre: "Plásticos (caños, etc.)" },
      { id: "sipm_vidrio", nombre: "Vidrio" },
      { id: "sipm_maderas", nombre: "Maderas" },
    ],
    refMes,
    ipcNac,
  );
  const mIpcNac = medir(ipcNac, mayoristas[0]?.periodo ?? refMes, "precios");

  const dolar = obtener(series, "dolar_mayorista");
  const matUsd = rebasear(dividir(mat, dolar), "2024-12");
  const pUsd = ultimoPeriodoHasta({ datos: matUsd }, refMes);
  const iaUsd = pUsd ? varInteranual({ datos: matUsd }, pUsd) : null;
  const mayorQueInfl = principales.filter((f) => f.id.startsWith("redet_") && f.brecha !== null && f.brecha > 0.01).map((f) => f.nombre);

  const significa = mMat.periodo ? (
    <>
      En un año (a {mesDe(mMat.periodo)}) los materiales subieron <b>{signo(mMat.ia)}</b> y la mano de obra <b>{signo(mMo.ia)}</b>; la inflación fue <b>{signo(mIpc.ia)}</b>.{" "}
      {mMat.ia !== null && mIpc.ia !== null && mMat.ia < mIpc.ia ? "Los materiales suben menos que la inflación: ojo con los márgenes si los costos de reposición se aceleran." : "Los materiales suben más que la inflación."}
      {mayorQueInfl.length > 0 && <> Suben más que la inflación: {mayorQueInfl.join(", ")}.</>}
    </>
  ) : null;

  return (
    <Bloque
      id="costos"
      numero={2}
      pregunta="¿Cuánto más caro es construir?"
      significa={significa}
      detalle={
        <>
          <Tarjeta titulo="Precios mayoristas (salida de fábrica)" series={[obtener(series, "sipm_general")]} conclusion="Anticipan los costos de reposición de un corralón. Se comparan contra la inflación nacional.">
            <TablaSimple filas={mayoristas} inflacion={{ periodo: mIpcNac.periodo, ia: mIpcNac.ia }} titulo="Rubro" />
          </Tarjeta>
          <Tarjeta titulo="¿Construir se encarece más que la vida en general?" series={[icc, ipc]} conclusion="Cuánto subió cada mes de 2026 contra el mismo mes de 2025.">
            <GraficoLineas
              datos={iaPorMes({ icc, mat, ipc })}
              formato={fPct}
              lineas={[
                { clave: "icc", nombre: "Costo de construir", color: "var(--accent)" },
                { clave: "mat", nombre: "Materiales", color: "var(--pos)" },
                { clave: "ipc", nombre: "Inflación", color: "var(--neu)", punteada: true },
              ]}
            />
          </Tarjeta>
          <Tarjeta titulo="Materiales medidos en dólares" series={[mat, dolar]} conclusion={pUsd ? <>En dólares, los materiales están <b>{signo(iaUsd)}</b> vs {nombreMes(pUsd)} de 2025: {iaUsd !== null && iaUsd > 0 ? "están más caros en dólares." : "están más baratos en dólares."}</> : undefined}>
            <Comparacion datos={porMes(matUsd)} formato={f0} />
            <p className="fuente">Costo de los materiales dividido por el dólar mayorista. Diciembre 2024 = 100.</p>
          </Tarjeta>
        </>
      }
    >
      <Tarjeta titulo={`Cuánto subió cada cosa en un año${mMat.periodo ? ` (a ${nombreMesAnio(mMat.periodo)})` : ""}`} series={[icc, obtener(series, "redet_cemento"), ipc]}>
        <TablaSimple filas={principales} inflacion={{ periodo: mIpc.periodo, ia: mIpc.ia }} />
        <p className="fuente">Precios del Gran Buenos Aires. “▲ más” (rojo) = subió más que la inflación; “▼ menos” (verde) = subió menos. Fuente: índices del costo de la construcción de INDEC.</p>
      </Tarjeta>
    </Bloque>
  );
}

/* ───────────────────────── 3. Macro ───────────────────────── */

export function BloqueMacro({ series, refMes }: P) {
  const ipc = obtener(series, "ipc_gba");
  const ipcNac = obtener(series, "ipc_nacional");
  const rem = obtener(series, "rem_inflacion_12m");
  const mIpc = medir(ipc, refMes, "precios");
  const mRem = medir(rem, refMes);
  const inflMensual: Punto[] = ipc.datos.map((d) => {
    const { anio, mes } = partes(d.periodo);
    const prev = valorEn(ipc, mes === 1 ? periodo(anio - 1, 12) : periodo(anio, mes - 1));
    return { periodo: d.periodo, valor: d.valor !== null && prev ? d.valor / prev - 1 : null };
  });
  const mmAnt = mIpc.periodo ? valorEn({ datos: inflMensual }, periodo(partes(mIpc.periodo).anio - 1, partes(mIpc.periodo).mes)) : null;

  const may = obtener(series, "dolar_mayorista");
  const min = obtener(series, "dolar_minorista");
  const mMay = medir(may, refMes, "precios");
  const tamar = obtener(series, "tasa_tamar");
  const badlar = obtener(series, "tasa_badlar");
  const mTamar = medir(tamar, refMes);
  const tamarAnt = mTamar.periodo ? valorEn(tamar, periodo(partes(mTamar.periodo).anio - 1, partes(mTamar.periodo).mes)) : null;

  const hip = obtener(series, "hipotecarios_stock");
  const uva = obtener(series, "uva");
  const tasaUva = obtener(series, "tasa_hipotecaria_uva");
  const pHip = ultimoPeriodoHasta(ipcNac, refMes);
  const hipReal = pHip ? deflactar(hip, ipcNac, pHip) : [];
  const pHipReal = ultimoPeriodoHasta({ datos: hipReal }, refMes);
  const iaHipReal = pHipReal ? varInteranual({ datos: hipReal }, pHipReal) : null;
  const mTasaUva = medir(tasaUva, refMes);

  const sal = obtener(series, "salarios_privado_registrado");
  const salReal = rebasear(deflactar(sal, ipcNac, "2024-12"), "2024-12");
  const pSal = ultimoPeriodoHasta({ datos: salReal }, refMes);
  const iaSalReal = pSal ? varInteranual({ datos: salReal }, pSal) : null;

  const significa = mIpc.periodo ? (
    <>
      La inflación de {mesDe(mIpc.periodo)} fue <b>{formatoPct(mIpc.mm)}</b> (un año antes: {formatoPct(mmAnt)}).
      {mMay.periodo && <> El dólar mayorista promedió <b>{formatoPesos(mMay.valor, 0)}</b>, {signo(mMay.ia)} en un año.</>}
      {mTamar.periodo && <> Financiarse cuesta <b>{formatoNumero(mTamar.valor, 0)}% anual</b> (hace un año: {formatoNumero(tamarAnt, 0)}%).</>}
      {pSal && <> El sueldo de los clientes compra <b>{iaSalReal !== null && iaSalReal < 0 ? `${pctAbs(iaSalReal)} menos` : `${pctAbs(iaSalReal)} más`}</b> que hace un año.</>}
    </>
  ) : null;

  return (
    <Bloque
      id="macro"
      numero={3}
      pregunta="¿Cómo están la plata y el crédito?"
      significa={significa}
      detalle={
        <>
          <Tarjeta titulo="Dólar mayorista y minorista (promedio de cada mes)" series={[may]}>
            <GraficoLineas
              datos={continua({ may: may.datos, min: min.datos }, "2025-01")}
              formato={f0}
              lineas={[
                { clave: "may", nombre: "Mayorista", color: "var(--accent)" },
                { clave: "min", nombre: "Minorista", color: "var(--neu)", punteada: true },
              ]}
            />
          </Tarjeta>
          <Tarjeta titulo="Costo del dinero (tasas TAMAR y BADLAR)" series={[tamar]} conclusion="Referencia de lo que cuesta financiar stock y vender en cuotas. % anual.">
            <GraficoLineas
              datos={continua({ tamar: tamar.datos, badlar: badlar.datos }, "2025-01")}
              formato={(v) => `${formatoNumero(v, 0)}%`}
              lineas={[
                { clave: "tamar", nombre: "TAMAR", color: "var(--accent)" },
                { clave: "badlar", nombre: "BADLAR", color: "var(--neu)", punteada: true },
              ]}
            />
          </Tarjeta>
          <Tarjeta titulo="Créditos hipotecarios vigentes (descontada la inflación)" series={[hip, uva]} conclusion={pHipReal ? <>El total de créditos hipotecarios vigentes está <b>{signo(iaHipReal)}</b> vs un año antes, ya descontada la inflación.{mTasaUva.periodo && <> Tasa de los créditos UVA: {formatoNumero(mTasaUva.valor, 1)}% anual + UVA.</>}</> : undefined}>
            <Comparacion datos={porMes(hipReal)} formato={(v) => formatoNumero(v / 1e6, 1)} />
            <p className="fuente">Billones de pesos de {pHip ? nombreMesAnio(pHip) : "—"}.</p>
          </Tarjeta>
          <Tarjeta titulo="Poder de compra del salario (privado registrado)" series={[sal, ipcNac]} conclusion={pSal ? <>Vs {nombreMes(pSal)} de 2025: <b>{signo(iaSalReal)}</b>.</> : undefined}>
            <Comparacion datos={porMes(salReal)} formato={f1} />
            <p className="fuente">Salarios descontada la inflación. Diciembre 2024 = 100.</p>
          </Tarjeta>
        </>
      }
    >
      <Tarjeta titulo="Inflación de cada mes: 2026 contra 2025" series={[ipc, rem]} conclusion={mRem.periodo ? <>El mercado espera <b>{formatoNumero(mRem.valor, 1)}%</b> de inflación para los próximos 12 meses (encuesta REM del BCRA, {nombreMesAnio(mRem.periodo)}).</> : undefined}>
        <BarrasMes datos={porMes(inflMensual)} formato={fPct} />
      </Tarjeta>
    </Bloque>
  );
}

/* ───────────────────────── 4. Zona oeste ───────────────────────── */

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
    return { ...m, s, p, acum: p ? acumuladoVsAnioAnterior(s, p, "suma") : null, suma: p ? sumaAnio(s, p) : null };
  });
  const pMuni = muni.find((m) => m.p)?.p ?? null;
  const comp = obtener(series, "escrituras_pba_compraventas");
  const hipo = obtener(series, "escrituras_pba_hipotecas");
  const mComp = medir(comp, refMes);
  const mHipo = medir(hipo, refMes);
  const suben = muni.filter((m) => (m.acum ?? 0) > 0).map((m) => m.nombre);
  const bajan = muni.filter((m) => (m.acum ?? 0) < 0).map((m) => m.nombre);

  const significa = pMuni ? (
    <>
      Hay pocos datos públicos por municipio. En los metros autorizados para construir en lo que va del año{" "}
      {suben.length > 0 && (
        <>
          sube <b>{suben.join(" y ")}</b>
          {bajan.length > 0 ? " y " : ""}
        </>
      )}
      {bajan.length > 0 && (
        <>
          baja{bajan.length > 1 ? "n" : ""} <b>{bajan.join(" y ")}</b>
        </>
      )}{" "}
      frente a 2025. Luján y Pilar no tienen este dato.
    </>
  ) : (
    "Hay pocos datos públicos por municipio."
  );

  return (
    <Bloque
      id="local"
      numero={4}
      pregunta="¿Y en zona oeste?"
      significa={significa}
      detalle={
        <>
          <Tarjeta titulo="Compraventas e hipotecas en la Provincia de Buenos Aires" series={[comp]} conclusion={mComp.periodo ? <>En {mesDe(mComp.periodo)}: <b>{formatoNumero(mComp.valor, 0)}</b> compraventas ({signo(mComp.ia)}) y <b>{formatoNumero(mHipo.valor, 0)}</b> hipotecas ({signo(mHipo.ia)}) vs un año antes.</> : undefined}>
            {comp.ultimoPeriodo ? <Comparacion datos={porMes(comp.datos)} formato={fMiles} /> : <SinDatos texto="Sin datos cargados (data/manual/escrituras_pba.csv)." />}
          </Tarjeta>
          <Tarjeta titulo="Población por partido" series={[pob[0].s]} conclusion={tot22 && tot26 ? <>Los siete partidos suman <b>{formatoNumero(tot26, 0)}</b> habitantes en 2026 ({signo(tot26 / tot22 - 1)} desde 2022).</> : undefined}>
            <div className="tabla-scroll">
              <table className="simple">
                <thead>
                  <tr>
                    <th>Partido</th>
                    <th>Habitantes 2026</th>
                    <th>Desde 2022</th>
                  </tr>
                </thead>
                <tbody>
                  {pob.map((p) => (
                    <tr key={p.cod}>
                      <td>{p.nombre}</td>
                      <td className="num">{formatoNumero(p.v26, 0)}</td>
                      <CeldaVar x={p.var} />
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Tarjeta>
          <section className="tarjeta">
            <h3>Qué datos locales no existen (todavía)</h3>
            <p className="conclusion">En las fuentes públicas no hay, por municipio: ventas de materiales, empleo en la construcción, escrituras ni actividad. Los permisos solo se publican para 246 municipios, y entre ellos no están Luján ni Pilar.</p>
          </section>
        </>
      }
    >
      <Tarjeta titulo={`Metros autorizados para construir en el año${pMuni ? ` (enero–${nombreMes(pMuni)})` : ""}`} series={[muni[0].s]}>
        <div className="tabla-scroll">
          <table className="simple">
            <thead>
              <tr>
                <th>Municipio</th>
                <th>m² en el año</th>
                <th>vs mismo período 2025</th>
              </tr>
            </thead>
            <tbody>
              {muni.map((m) => (
                <tr key={m.id}>
                  <td>{m.nombre}</td>
                  <td className="num">{formatoNumero(m.suma, 0)}</td>
                  <CeldaVar x={m.acum} sentido="sube-bueno" />
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Tarjeta>
    </Bloque>
  );
}

export { Fuentes };
