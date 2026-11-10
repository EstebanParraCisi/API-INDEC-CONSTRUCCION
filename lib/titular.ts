/**
 * Titular del mes: UNA frase que resume el mes, armada por reglas deterministas (no IA).
 * Combina: actividad del mes (ISAC i.a.), crédito hipotecario (si se mueve fuerte) y el acumulado del año.
 */
import { nombreMes } from "./periodo";
import type { Hechos } from "./lectura";

const UMBRAL = 0.01; // ±1%: por debajo se considera "estable"
const UMBRAL_CREDITO = 0.1; // el crédito solo entra al titular si se mueve más de ±10%

export function titularDelMes(h: Pick<Hechos, "isac" | "hipotecasPba">, ref: string): string | null {
  const { ia, acum, periodo } = h.isac;
  if (ia === null || !periodo) return null;
  const mes = nombreMes(periodo);
  const Mes = mes[0].toUpperCase() + mes.slice(1);

  const act = ia < -UMBRAL ? "la actividad se enfría" : ia > UMBRAL ? "la actividad crece" : "la actividad se mantiene";
  const hip = h.hipotecasPba.ia;
  const cred = hip === null ? null : hip < -UMBRAL_CREDITO ? "el crédito hipotecario cae" : hip > UMBRAL_CREDITO ? "el crédito hipotecario crece" : null;
  const mesMalo = ia < -UMBRAL || (hip !== null && hip < -UMBRAL_CREDITO);
  const mesBueno = ia > UMBRAL || (hip !== null && hip > UMBRAL_CREDITO);
  const primera = `${Mes}: ${act}${cred ? ` y ${cred}` : ""}`;

  if (acum === null) return `${primera}.`;
  const anio = acum > UMBRAL ? "arriba de" : acum < -UMBRAL ? "abajo de" : "parejo con";
  const anioMalo = acum < -UMBRAL;
  const anioBueno = acum > UMBRAL;

  // "pero" solo cuando el año contradice al mes; si no, se encadena con "y".
  if (mesMalo && !mesBueno && !anioMalo) return `${primera}, pero el año todavía viene ${anio} 2025.`;
  if (mesBueno && !mesMalo && anioMalo) return `${primera}, aunque el año todavía viene ${anio} 2025.`;
  void ref;
  return `${primera}, y el año viene ${anio} 2025.`;
}
