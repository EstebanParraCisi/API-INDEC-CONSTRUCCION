/** Formato argentino: coma decimal, punto de miles. */

const cache = new Map<string, Intl.NumberFormat>();
function nf(min: number, max: number): Intl.NumberFormat {
  const k = `${min}-${max}`;
  if (!cache.has(k)) cache.set(k, new Intl.NumberFormat("es-AR", { minimumFractionDigits: min, maximumFractionDigits: max }));
  return cache.get(k)!;
}

export const SIN_DATO = "sin dato";

/** Número con decimales fijos: 1535.2 → "1.535,20" (decimales=2). */
export function formatoNumero(x: number | null | undefined, decimales = 0): string {
  if (x === null || x === undefined || !Number.isFinite(x)) return SIN_DATO;
  return nf(decimales, decimales).format(x);
}

/** Proporción a porcentaje con 1 decimal: 0.044 → "4,4%". Con signo: "+4,4%" / "−4,4%". */
export function formatoPct(x: number | null | undefined, opciones: { signo?: boolean; decimales?: number } = {}): string {
  if (x === null || x === undefined || !Number.isFinite(x)) return SIN_DATO;
  const dec = opciones.decimales ?? 1;
  const pct = x * 100;
  // Evita "−0,0%"
  const redondeado = Number(pct.toFixed(dec));
  const abs = nf(dec, dec).format(Math.abs(redondeado));
  if (redondeado === 0) return `${abs}%`;
  if (redondeado < 0) return `−${abs}%`;
  return `${opciones.signo ? "+" : ""}${abs}%`;
}

/** Diferencia en puntos porcentuales entre dos proporciones: "5,2 p.p." */
export function formatoPP(x: number | null | undefined): string {
  if (x === null || x === undefined || !Number.isFinite(x)) return SIN_DATO;
  return `${nf(1, 1).format(x * 100)} p.p.`;
}

export function formatoPesos(x: number | null | undefined, decimales = 2): string {
  if (x === null || x === undefined || !Number.isFinite(x)) return SIN_DATO;
  return `$ ${formatoNumero(x, decimales)}`;
}

/** "2026-11-05" → "05/11/2026" */
export function formatoFecha(iso: string | null | undefined): string {
  if (!iso) return SIN_DATO;
  const [a, m, d] = iso.slice(0, 10).split("-");
  return `${d}/${m}/${a}`;
}
