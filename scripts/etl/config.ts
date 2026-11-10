/**
 * Ids exactos de cada serie, verificados en la Fase 1 (ver docs/fuentes.md).
 * Si se cambia un id, volver a verificarlo contra la API antes de commitear.
 */
import type { Naturaleza } from "../../lib/types";

export const DESDE = "2024-01-01"; // 2024 se guarda para poder calcular i.a. y acumulados de 2025.
export const ANIO_DESDE = 2024;

export type DefSerie = {
  id: string;
  nombre: string;
  unidad: string;
  naturaleza: Naturaleza;
  nota?: string;
};

// ───────────── Series de Tiempo (datos.gob.ar) ─────────────
export const SERIES_TIEMPO_URL = "https://apis.datos.gob.ar/series/api/series/";
export const SERIES_TIEMPO_FUENTE_URL = "https://datos.gob.ar/series";

export type DefSerieTiempo = DefSerie & { stId: string; fuente: string };

const ISAC = (id: string, stId: string, nombre: string, nota?: string): DefSerieTiempo => ({
  id,
  stId,
  nombre,
  unidad: "Índice 2004=100",
  naturaleza: "volumen",
  fuente: "INDEC (ISAC) vía Series de Tiempo",
  nota,
});

const NOTA_DESEST =
  "INDEC no publica la serie original de este insumo; se usa la serie desestacionalizada. La variación interanual compara mes contra mismo mes y es muy parecida, aunque no idéntica, a la de la serie original.";

export const SERIES_TIEMPO: DefSerieTiempo[] = [
  ISAC("isac_general", "33.2_ISAC_NIVELRAL_0_M_18_63", "Actividad de la construcción (ISAC)"),
  ISAC("isac_desest", "33.2_ISAC_SIN_EDAD_0_M_23_56", "ISAC desestacionalizado"),
  ISAC("insumo_cemento", "33.4_ISAC_CEMENAND_0_0_21_24", "Cemento portland", NOTA_DESEST),
  ISAC("insumo_hormigon", "33.3_ISAC_HORMIADO_0_0_23_36", "Hormigón elaborado"),
  ISAC("insumo_hierro", "33.3_ISAC_HIERRION_0_0_49_36", "Hierro redondo y aceros"),
  ISAC("insumo_ladrillos", "33.3_ISAC_LADRICOS_0_0_21_27", "Ladrillos huecos"),
  ISAC("insumo_cal", "33.3_ISAC_CALESLES_0_0_10_7", "Cales"),
  ISAC("insumo_yeso", "33.3_ISAC_YESOESO_0_0_9_54", "Yeso"),
  ISAC("insumo_placas_yeso", "33.3_ISAC_PLACAESO_0_0_19_5", "Placas de yeso"),
  ISAC("insumo_pinturas", "33.3_ISAC_PINTUION_0_0_31_13", "Pinturas para construcción"),
  ISAC("insumo_ceramicos", "33.3_ISAC_PISOSCOS_0_0_37_22", "Pisos y revestimientos cerámicos"),
  ISAC("insumo_sanitarios", "33.4_ISAC_ARTICICA_0_0_37_66", "Sanitarios de cerámica", NOTA_DESEST),
  ISAC("insumo_asfalto", "33.4_ISAC_ASFALLTO_0_0_12_6", "Asfalto", NOTA_DESEST),
  ISAC("insumo_mosaicos", "33.3_ISAC_MOSAIEOS_0_0_36_91", "Mosaicos graníticos y calcáreos"),
  {
    id: "empleo_construccion",
    stId: "152.1_CTRUCCIEST_2009_M_16",
    nombre: "Asalariados registrados en la construcción (sector privado)",
    unidad: "Miles de puestos",
    naturaleza: "volumen",
    fuente: "Ministerio de Capital Humano (SIPA) vía Series de Tiempo",
  },
];

/** Insumos que vende un corralón (se resaltan en el ranking). */
export const INSUMOS_CORRALON = new Set([
  "insumo_cemento",
  "insumo_cal",
  "insumo_ladrillos",
  "insumo_hierro",
  "insumo_hormigon",
  "insumo_ceramicos",
  "insumo_sanitarios",
  "insumo_pinturas",
  "insumo_yeso",
  "insumo_placas_yeso",
]);

// ───────────── API INDEC ─────────────
export const INDEC_URL = "https://api.indec.gob.ar/v1/";

export type DefIndec = DefSerie & {
  tabla: string;
  /** Filtros PostgREST que identifican UNA fila por período. */
  filtros: Record<string, string>;
  /** Orden por la clave primaria completa (requisito de paginación estable). */
  orden: string;
  fuenteUrl: string;
};

const ORD_ICC = "indicador,codigo_apertura,codigo_CPC_1,clasificador,nivel,descripcion,periodo,anio,mes,tipo_de_indicador,tipo_de_indicador_descripcion,region,unidad_de_medida";
const ORD_SIPM = "operativo,indicador,clasificador,nivel,codigo_apertura,descripcion,periodo,anio,mes,tipo_de_indicador,tipo_de_indicador_descripcion,region,unidad_de_medida";
const ORD_REDET = "indicador,operativo,inciso,descripcion_inciso,codigo_apertura,clasificador,nivel,descripcion,origen,periodo,anio,mes,tipo_de_indicador,tipo_de_indicador_descripcion,region,unidad_de_medida";
const ORD_IPC = "clasificador,nivel,codigo,descripcion,periodo,anio,mes,indicador,tipo_de_indicador,tipo_de_indicador_descripcion,region,unidad_de_medida";
const ORD_SAL = "clasificador,nivel,codigo,descripcion,periodo,anio,mes,indicador,tipo_de_indicador,tipo_de_indicador_descripcion,unidad_de_medida";

const URL_ICC = "https://www.indec.gob.ar/indec/web/Nivel4-Tema-3-5-33";
const URL_SIPM = "https://www.indec.gob.ar/indec/web/Nivel4-Tema-3-5-32";
const URL_REDET = "https://www.indec.gob.ar/indec/web/Nivel4-Tema-3-5-112";
const URL_EMAE = "https://www.indec.gob.ar/indec/web/Nivel4-Tema-3-9-48";
const URL_IPC = "https://www.indec.gob.ar/indec/web/Nivel4-Tema-3-5-31";
const URL_SAL = "https://www.indec.gob.ar/indec/web/Nivel4-Tema-4-31-61";

const icc = (id: string, codigo: string, nombre: string): DefIndec => ({
  id,
  nombre,
  unidad: "Índice ene-22=100",
  naturaleza: "precio",
  tabla: "icc_precios_construccion",
  filtros: { codigo_apertura: `eq.${codigo}`, tipo_de_indicador: "eq.Indice", region: "eq.GBA" },
  orden: ORD_ICC,
  fuenteUrl: URL_ICC,
});

const sipm = (id: string, codigo: string, nombre: string): DefIndec => ({
  id,
  nombre,
  unidad: "Índice dic-15=100",
  naturaleza: "precio",
  tabla: "sipm_precios_mayoristas",
  filtros: { indicador: "eq.IPIM", codigo_apertura: `eq.${codigo}`, tipo_de_indicador: "eq.Indice" },
  orden: ORD_SIPM,
  fuenteUrl: URL_SIPM,
});

const redet = (id: string, inciso: string, nombre: string): DefIndec => ({
  id,
  nombre,
  unidad: "Índice oct-15=100",
  naturaleza: "precio",
  tabla: "redeterminacion_precios_contratos_obras_publicas",
  filtros: { operativo: "eq.ICC", inciso: `eq.${inciso}`, tipo_de_indicador: "eq.Indice" },
  orden: ORD_REDET,
  fuenteUrl: URL_REDET,
});

export const INDEC_SERIES: DefIndec[] = [
  icc("icc_general", "0", "Costo de la construcción (ICC GBA) — nivel general"),
  icc("icc_materiales", "01", "ICC — Materiales"),
  icc("icc_mano_obra", "02", "ICC — Mano de obra"),
  icc("icc_gastos_generales", "03", "ICC — Gastos generales"),

  sipm("sipm_general", "NG", "Precios mayoristas (IPIM) — nivel general"),
  sipm("sipm_cemento_cal", "2694", "Cemento y cal"),
  sipm("sipm_hormigon_yeso", "2695", "Artículos de hormigón, cemento y yeso"),
  sipm("sipm_ladrillos", "2693", "Ladrillos y cerámica estructural"),
  sipm("sipm_ceramicos", "2691", "Cerámica no estructural (pisos, revestimientos, sanitarios)"),
  sipm("sipm_hierro_acero", "271", "Hierro y acero en formas básicas"),
  sipm("sipm_metalicos_estructurales", "2811", "Productos metálicos para uso estructural"),
  sipm("sipm_pinturas", "2422", "Pinturas, barnices y enduidos"),
  sipm("sipm_vidrio", "261", "Vidrio y productos de vidrio"),
  sipm("sipm_plasticos", "252", "Productos de plástico"),
  sipm("sipm_maderas", "201", "Maderas aserradas"),

  redet("redet_cemento", "n", "Cemento portland en bolsa"),
  redet("redet_hormigon", "s", "Hormigón elaborado"),
  redet("redet_hierro", "m", "Hierro aletado (acero en barra)"),
  redet("redet_arena", "q", "Arena fina"),
  redet("redet_ceramicos", "c", "Pisos y revestimientos (baldosa cerámica)"),
  redet("redet_canos_pvc", "h", "Caños de PVC"),
  redet("redet_sanitaria", "r", "Instalación sanitaria y grifería"),
  redet("redet_albanileria", "b", "Albañilería (ítem de obra)"),

  {
    id: "emae_construccion",
    nombre: "EMAE — Construcción",
    unidad: "Índice 2004=100",
    naturaleza: "volumen",
    tabla: "estimador-mensual-de-actividad-economica-sectores",
    filtros: { codigo: "eq.F", tipo_de_indicador: "eq.Índice base 2004=100" },
    orden: "anio,mes,codigo,descripcion,periodo,tipo_de_indicador",
    fuenteUrl: URL_EMAE,
  },
  {
    id: "emae_general",
    nombre: "EMAE — Nivel general",
    unidad: "Índice 2004=100",
    naturaleza: "volumen",
    tabla: "estimador-mensual-de-actividad-economica-nivel-general",
    filtros: { tipo_de_indicador_descripcion: "eq.Índice serie original" },
    orden: "tipo_de_indicador_descripcion,anio,mes,periodo,tipo_de_indicador",
    fuenteUrl: URL_EMAE,
  },
  {
    id: "ipc_gba",
    nombre: "Inflación (IPC GBA)",
    unidad: "Índice dic-16=100",
    naturaleza: "precio",
    tabla: "ipc_nacional",
    filtros: { codigo: "eq.0", region: "eq.GBA", tipo_de_indicador: "eq.Indice" },
    orden: ORD_IPC,
    fuenteUrl: URL_IPC,
  },
  {
    id: "ipc_nacional",
    nombre: "Inflación (IPC Nacional)",
    unidad: "Índice dic-16=100",
    naturaleza: "precio",
    tabla: "ipc_nacional",
    filtros: { codigo: "eq.0", region: "eq.Nacional", tipo_de_indicador: "eq.Indice" },
    orden: ORD_IPC,
    fuenteUrl: URL_IPC,
  },
  {
    id: "salarios_privado_registrado",
    nombre: "Índice de salarios — privado registrado",
    unidad: "Índice oct-16=100",
    naturaleza: "precio",
    tabla: "indice_salarios",
    filtros: { codigo: "eq.110", tipo_de_indicador: "eq.Indice" },
    orden: ORD_SAL,
    fuenteUrl: URL_SAL,
  },
  {
    id: "salarios_total",
    nombre: "Índice de salarios — total",
    unidad: "Índice oct-16=100",
    naturaleza: "precio",
    tabla: "indice_salarios",
    filtros: { codigo: "eq.0", tipo_de_indicador: "eq.Indice" },
    orden: ORD_SAL,
    fuenteUrl: URL_SAL,
  },
];

export const PARTIDOS_ZONA_OESTE: { cod: string; nombre: string }[] = [
  { cod: "06497", nombre: "Luján" },
  { cod: "06560", nombre: "Moreno" },
  { cod: "06364", nombre: "General Rodríguez" },
  { cod: "06638", nombre: "Pilar" },
  { cod: "06525", nombre: "Marcos Paz" },
  { cod: "06532", nombre: "Mercedes" },
  { cod: "06266", nombre: "Exaltación de la Cruz" },
];
export const POBLACION_URL = "https://www.indec.gob.ar/indec/web/Nivel4-Tema-2-24-119";

// ───────────── BCRA v4.0 ─────────────
export const BCRA_URL = "https://api.bcra.gob.ar/estadisticas/v4.0/Monetarias/";
export const BCRA_FUENTE_URL = "https://www.bcra.gob.ar/PublicacionesEstadisticas/Principales_variables.asp";

export type DefBcra = DefSerie & {
  idVariable: number;
  /** Cómo se lleva a mensual: promedio de días hábiles, último dato del mes, o ya es mensual. */
  mensual: "promedio" | "ultimo" | "mensual";
  /** Guardar también la serie diaria (id + "_diario"). */
  guardarDiaria?: boolean;
};

export const BCRA_SERIES: DefBcra[] = [
  { id: "dolar_mayorista", idVariable: 5, nombre: "Dólar mayorista (Com. A 3500), promedio mensual", unidad: "$ por USD", naturaleza: "nivel", mensual: "promedio", guardarDiaria: true },
  { id: "dolar_minorista", idVariable: 4, nombre: "Dólar minorista (promedio vendedor), promedio mensual", unidad: "$ por USD", naturaleza: "nivel", mensual: "promedio", guardarDiaria: true },
  { id: "tasa_tamar", idVariable: 44, nombre: "Tasa TAMAR bancos privados, promedio mensual", unidad: "% nominal anual", naturaleza: "nivel", mensual: "promedio" },
  { id: "tasa_badlar", idVariable: 7, nombre: "Tasa BADLAR bancos privados, promedio mensual", unidad: "% nominal anual", naturaleza: "nivel", mensual: "promedio" },
  { id: "uva", idVariable: 31, nombre: "Valor UVA, promedio mensual", unidad: "$", naturaleza: "nivel", mensual: "promedio" },
  { id: "hipotecarios_stock", idVariable: 1348, nombre: "Préstamos hipotecarios al sector privado (stock a fin de mes)", unidad: "Millones de $", naturaleza: "nivel", mensual: "ultimo" },
  { id: "tasa_hipotecaria_uva", idVariable: 1240, nombre: "Tasa de préstamos hipotecarios UVA", unidad: "% nominal anual", naturaleza: "nivel", mensual: "mensual" },
  { id: "rem_inflacion_12m", idVariable: 29, nombre: "Inflación esperada próximos 12 meses (REM, mediana)", unidad: "%", naturaleza: "nivel", mensual: "mensual" },
];
