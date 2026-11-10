# Carga manual mensual (≈ 10 minutos por mes)

Estas fuentes no tienen API: alguien las copia una vez por mes en estos archivos CSV. El ETL (y la actualización automática diaria) los lee, valida y publica.

**Reglas:**

- Una fila por mes, `periodo` en formato `AAAA-MM` (ej. `2026-09`).
- Números **sin separador de miles**. Decimal con punto o coma: `1292308` · `21.5` · `21,5`.
- Si un mes no tiene dato, dejá la celda vacía. **Nunca inventes ni estimes un número.**
- `fuente_url`: el link exacto de donde copiaste el dato.
- Editalo con cualquier editor de texto, o desde GitHub con el lápiz (✏️). Si usás Excel, guardá como "CSV UTF-8 (delimitado por comas)".
- Al guardar el cambio en GitHub, la app se actualiza sola en unos minutos.

Si un archivo tiene un error (columna faltante, mes repetido, número mal escrito), la app sigue mostrando los datos anteriores y avisa arriba de todo qué archivo revisar.

---

## `permisos_edificacion.csv` — Permisos de edificación (INDEC)

**De dónde:** INDEC publica una planilla Excel con la superficie autorizada en 246 municipios:
<https://www.indec.gob.ar/ftp/cuadros/economia/permisos_edificacion_246_municipios.xlsx>
(también está en indec.gob.ar → Economía → Construcción → "Permisos de edificación"). Sale todos los meses, junto con el informe del ISAC (unas 6 semanas después del mes).

**Qué copiar:** abrí la planilla y buscá la fila del mes nuevo (columna A = año, B = mes):

| Columna del CSV | Qué es en la planilla |
|---|---|
| `superficie_total_m2` | "Total" → "Superficie autorizada" (columna E) |
| `permisos_total` | "Total" → "Permisos otorgados" (columna C) |
| `superficie_moreno_m2` | "Moreno" → "Superficie autorizada" |
| `superficie_general_rodriguez_m2` | "General Rodríguez" → "Superficie autorizada" |
| `superficie_mercedes_m2` | "Mercedes" → "Superficie autorizada" |

Los municipios están en la fila 4, ordenados alfabéticamente dentro de cada provincia. Usá Ctrl+F para encontrarlos. Luján y Pilar **no** están en la planilla.

Ejemplo de fila:

```
2026-08,1292308,4707,11732,7637,1347,https://www.indec.gob.ar/ftp/cuadros/economia/permisos_edificacion_246_municipios.xlsx
```

INDEC a veces corrige meses anteriores. Si ves que un mes viejo cambió en la planilla, actualizalo también.

## `despachos_cemento.csv` — Despachos de cemento (AFCP)

**De dónde:** la AFCP publica una página por mes con este formato de dirección (cambiá `AAAAMM` por el mes):
`https://afcp.info/ESTADISTICAS/DESPACHO-MENSUAL/PAAAAMM/PAAAAMM.html`
Ejemplo, octubre 2026: <https://afcp.info/ESTADISTICAS/DESPACHO-MENSUAL/P202610/P202610.html>. Sale a los pocos días de terminado el mes.

**Qué copiar:** en el primer cuadro ("DESPACHO mensual y acumulado"), la columna **Despacho Nacional → Mensual** de la fila del mes nuevo (en octubre 2026: 877.436 → se escribe `877436`).

**Columnas:** `periodo,toneladas,fuente_url`.

```
2026-10,877436,https://afcp.info/ESTADISTICAS/DESPACHO-MENSUAL/P202610/P202610.html
```

Esa misma página trae el mes anterior ya corregido. Si cambió, actualizá también esa fila: por ejemplo, la página de octubre corrige septiembre.

## `indice_construya.csv` — Índice Construya

**De dónde:** Grupo Construya, <https://www.grupoconstruya.com.ar/> → "Índice Construya" (informe mensual de prensa).

**Columnas:** `periodo,indice,var_mm_desest,fuente_url`.
- `indice`: el valor del índice del mes (serie original, si el informe la publica).
- `var_mm_desest`: la variación mensual desestacionalizada que publica el informe, en % (ej. `-2.3`). Opcional.

## `escrituras_pba.csv` — Escrituras en Provincia de Buenos Aires

**De dónde:** el Colegio de Escribanos de la Provincia de Buenos Aires (<https://www.colescba.org.ar/>) publica el PDF "Estadística de compraventas, hipotecas, fideicomiso, desagregado por mes" (actos sobre inmuebles de la Provincia). Se actualiza a mitad de mes con el mes anterior.

**Qué copiar** (última página del PDF, fila del mes nuevo):
- `compraventas`: columna **COMPRAVENTA → Cant. Actos** (en septiembre 2026: 12.971 → `12971`).
- `hipotecas`: la columna **HIPOTECA → Cant. Actos** que viene a continuación (en septiembre 2026: 1.823 → `1823`). Desde 2012 hay una sola columna de hipotecas, que es el total.

**Columnas:** `periodo,compraventas,hipotecas,fuente_url`.

```
2026-09,12971,1823,https://www.colescba.org.ar/
```

Alimenta la tarjeta "Hipotecas en Provincia de Buenos Aires" y la regla de la lectura del mes "el crédito hipotecario empuja…".

## `costo_m2_cac.csv` — Costo por m² (Cámara Argentina de la Construcción) — opcional

**De dónde:** <https://www.camarco.org.ar/> → indicadores de costo de la construcción.

**Columnas:** `periodo,costo_m2,fuente_url` (pesos por m² del mes).

## `nota_del_mes.md` — Nota de gerencia

Texto libre para la reunión. Se muestra debajo de la "Lectura del mes" y en el informe imprimible. Escribí debajo del comentario. Si lo dejás vacío, la sección no aparece.
