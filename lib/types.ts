export type Frecuencia = "diaria" | "mensual" | "trimestral" | "anual";

/**
 * Cómo se agrega la serie para comparar años:
 * - "volumen": índice de cantidades (ISAC, EMAE). Acumulado = promedio vs promedio.
 * - "cantidad": cantidades físicas (toneladas, escrituras, m²). Acumulado = suma vs suma.
 * - "precio": índice de precios (ICC, IPC, SIPM). Acumulado del año = v_t / v_dic − 1.
 * - "nivel": valores que se leen tal cual (dólar, tasas, UVA, stocks, población).
 */
export type Naturaleza = "volumen" | "cantidad" | "precio" | "nivel";

export type Punto = { periodo: string; valor: number | null; obs?: string };

export type Serie = {
  id: string;
  nombre: string;
  unidad: string;
  frecuencia: Frecuencia;
  naturaleza: Naturaleza;
  fuente: string;
  fuenteUrl: string;
  /** ISO: cuándo cambiaron por última vez los datos de esta serie. */
  actualizado: string;
  /** Último período con valor no nulo ("2026-08"), o null si la serie está vacía. */
  ultimoPeriodo: string | null;
  nota?: string;
  datos: Punto[];
};

export type EstadoFuente = {
  ok: boolean;
  error?: string;
  ultimaCorrida: string;
  ultimaCorridaOk?: string;
  series: string[];
  seriesConError?: { id: string; error: string }[];
};

export type Status = {
  generado: string;
  fuentes: Record<string, EstadoFuente>;
};
