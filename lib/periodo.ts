/** Utilidades de períodos "YYYY-MM". */

export const MESES = ["enero", "febrero", "marzo", "abril", "mayo", "junio", "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"];
export const MESES_CORTOS = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"];

export function partes(p: string): { anio: number; mes: number } {
  const [a, m] = p.split("-").map(Number);
  return { anio: a, mes: m };
}

export function periodo(anio: number, mes: number): string {
  return `${anio}-${String(mes).padStart(2, "0")}`;
}

export function sumarMeses(p: string, n: number): string {
  const { anio, mes } = partes(p);
  const idx = anio * 12 + (mes - 1) + n;
  return periodo(Math.floor(idx / 12), (idx % 12) + 1);
}

export function nombreMes(p: string): string {
  return MESES[partes(p).mes - 1];
}

export function nombreMesAnio(p: string): string {
  const { anio, mes } = partes(p);
  return `${MESES[mes - 1]} ${anio}`;
}

export function compararPeriodos(a: string, b: string): number {
  return a < b ? -1 : a > b ? 1 : 0;
}

export function minPeriodo(a: string, b: string): string {
  return a <= b ? a : b;
}
