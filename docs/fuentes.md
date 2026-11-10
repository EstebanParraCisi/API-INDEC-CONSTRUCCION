# Fuentes de datos — relevamiento Fase 1

> Relevado el 10/11/2026 consultando cada API en vivo (incluida la API INDEC con token). Todo lo marcado ✅ fue verificado con una consulta real.

## Resumen

| Fuente | Estado | Comentario |
|---|---|---|
| API INDEC (`api.indec.gob.ar/v1`) | ✅ | Tablas, columnas y aperturas verificadas con token. Sin token devuelve 401. |
| API Series de Tiempo (datos.gob.ar) | ✅ | ISAC e insumos, IPC, salarios y empleo funcionan. Hace falta un `User-Agent` de navegador: con el de Python devuelve 403. |
| API BCRA v4.0 | ✅ | Todas las variables pedidas existen y tienen datos hasta noviembre de 2026. |
| Permisos de edificación | ❌ sin API | No está en Series de Tiempo ni en el catálogo de la API INDEC. Ver §4. |
| Fuentes manuales (AFCP, Construya, Escribanos PBA, CAC) | — | Se cargan por CSV, según el plan. |

### Valores de control (§3.5 del plan)

| Control | Esperado | Calculado con Series de Tiempo | OK |
|---|---|---|---|
| ISAC ago-2026 i.a. | −4,4% | −4,36% (`33.2_ISAC_NIVELRAL_0_M_18_63`: 146,86 / 153,56) | ✅ |
| ISAC acumulado ene–ago 2026 vs 2025 | +0,8% | +0,79% (promedio de 8 meses / promedio de 8 meses) | ✅ |
| ICC GBA sep-2026 (m/m 1,5%; acum. 23,9%; i.a. 31,3%; mat. 22,8%; MO 38,7%) | idem | API INDEC: 1,5 · 23,9 · 31,3 · 22,8 · 38,7 (variaciones publicadas en la tabla). El ETL además las recalcula desde el índice. | ✅ |

---

## 1. API INDEC

- Base: `https://api.indec.gob.ar/v1/`. La spec OpenAPI 3.1.0 se sirve en la misma raíz (`GET /`).
- Autenticación: `Authorization: Bearer <JWT>`.
- Filtros estilo PostgREST: `select`, `limit`, `offset`, `order`, `col=eq.valor`, `ilike`, `in`, `gte`, etc.
- **Paginación: máximo 1000 filas por respuesta**, aunque `limit` sea mayor. Ordenar siempre por la clave primaria completa (si no, se pueden repetir o perder filas entre páginas). `Prefer: count=exact` devuelve el total en `Content-Range`, con status 206.
- La columna `observaciones` trae los signos convencionales (`*` provisorio, `**` preliminar, `...` no disponible, `s` confidencial, etc.). El ETL los guarda en `obs`.
- Período: `periodo` = `AAAAMM` (texto), además de las columnas numéricas `anio` y `mes`.

| Tabla | Desde | Clave primaria / orden | Columnas |
|---|---|---|---|
| `icc_precios_construccion` | nov-2015 | indicador, codigo_apertura, codigo_CPC_1, clasificador, nivel, descripcion, periodo, anio, mes, tipo_de_indicador, tipo_de_indicador_descripcion, region, unidad_de_medida | + `valor`, `observaciones` |
| `sipm_precios_mayoristas` | dic-2015 | operativo, indicador, clasificador, nivel, codigo_apertura, descripcion, periodo, anio, mes, tipo_de_indicador, tipo_de_indicador_descripcion, region, unidad_de_medida | + `valor`, `observaciones` |
| `estimador-mensual-de-actividad-economica-sectores` | ene-2004 | anio, mes, codigo, descripcion, periodo, tipo_de_indicador | + `valor`, `observaciones`. `codigo` = letra ClaNAE04 (Construcción = **F**, a confirmar) |
| `estimador-mensual-de-actividad-economica-nivel-general` | ene-2004 | tipo_de_indicador_descripcion, anio, mes, periodo, tipo_de_indicador | + `valor`, `observaciones` (original, desestacionalizada, tendencia-ciclo) |
| `ipc_nacional` | dic-2016 | clasificador, nivel, codigo, descripcion, periodo, anio, mes, indicador, tipo_de_indicador, tipo_de_indicador_descripcion, region, unidad_de_medida | + `valor`, `observaciones` |
| `indice_salarios` | nov-2015 | clasificador, nivel, codigo, descripcion, periodo, anio, mes, indicador, tipo_de_indicador, tipo_de_indicador_descripcion, unidad_de_medida | + `valor`, `observaciones` |
| `redeterminacion_precios_contratos_obras_publicas` | dic-2015 | indicador, operativo, inciso, descripcion_inciso, codigo_apertura, clasificador, nivel, descripcion, origen, periodo, anio, mes, tipo_de_indicador, tipo_de_indicador_descripcion, region, unidad_de_medida | + `codigo_CPC_1`, `codigo_CIUU_3`, `valor`, `observaciones` |
| `estimaciones_poblacion_departamento_2022_2035` | 2022 | departamento_cod, sexo_cod, fecha | jurisdiccion_cod, jurisdiccion_nom, departamento_nom, rmba, sexo_nom, `poblacion` |

Además de `valor`, las filas traen `valor_null`, que es la razón de nulo.

### Valores verificados (consultas del 10/11/2026)

`tipo_de_indicador` usa los mismos códigos en ICC, IPC, salarios y SIPM: `Indice`, `v_m`, `v_ia`, `v_acum` (desde diciembre del año anterior) e `incidencia` (solo ICC). En el EMAE sectores son `Índice base 2004=100` y `Variación porcentual interanual`.

**ICC** (`region = GBA`, índice base 1993 reexpresado ene-22=100, último dato **2026-09**, marcado provisorio):

| Apertura | `codigo_apertura` | `nivel` |
|---|---|---|
| Nivel general | `0` | Nivel general |
| Materiales | `01` | Capitulo |
| Mano de obra | `02` (grupos `02-01` asalariada, `02-02` subcontratos) | Capitulo / Grupo |
| Gastos generales | `03` | Capitulo |
| Cemento portland normal, en bolsa | `01-37440-11` | Producto (solo variaciones, sin índice) |
| Acero aletado conformado, en barra | `01-41242-11` | Producto |
| Arena fina | `01-15310-11` | Producto |
| Ladrillo cerámico hueco | `01-37350-11` | Producto |
| Ítems de obra (albañilería, estructura, pintura, sanitaria…) | `IT-01` … `IT-13` | Ítems |

**EMAE sectores:** Construcción = `codigo = F`. Último dato **2026-08**: índice 133,39 y −2,5% i.a. Nivel general: series original, desestacionalizada y tendencia-ciclo, también con último dato 2026-08.

**IPC** (`codigo = 0`, `nivel = Nivel General`, `indicador = IPC base Dic16=100`). Regiones: `Nacional`, `GBA`, `Pampeana`, `Noreste`, `Noroeste`, `Cuyo`, `Patagonia`. Último dato **2026-09**: Nacional 1,9% m/m y 33,4% i.a.; GBA 2,0% m/m y 33,5% i.a. Para deflactar se usa el IPC **GBA**, porque el ICC también es GBA.

**Índice de salarios** (`clasificador = IS 2001`). Códigos: `0` nivel general, `100` total registrado, `110` privado registrado, `120` público, `200` no registrado. Último dato **2026-08** (en Series de Tiempo llega a 2026-07). Se usa `110` (privado registrado) para salario real.

**SIPM.** `indicador` toma los valores `IPIM` (precios internos al por mayor), `IPIB` e `IPP`. Se usa **IPIM**, región "Total del país", último dato **2026-09**. Aperturas elegidas:

| Insumo | Nivel | `codigo_apertura` | i.a. sep-26 |
|---|---|---|---|
| Nivel general IPIM | Nivel general | `NG` | 29,2% |
| Cemento y cal | Clase | `2694` | 37,6% |
| Artículos de hormigón, cemento y yeso | Clase | `2695` | 29,5% |
| Arcilla y cerámica para uso estructural (ladrillos) | Clase | `2693` | 12,2% |
| Cerámica no estructural (pisos, revestimientos, sanitarios) | Clase | `2691` | 28,7% |
| Productos de minerales ferrosos en formas básicas (hierro y acero) | Grupo | `271` | 7,5% |
| Productos metálicos para uso estructural | Clase | `2811` | 22,8% |
| Pinturas, barnices y enduidos | Clase | `2422` | 20,9% |
| Vidrio y productos de vidrio | Grupo | `261` | 22,2% |
| Productos de plástico (caños, etc.) | Grupo | `252` | 25,5% |
| Maderas aserradas | Grupo | `201` | 17,2% |

**Redeterminación de obra pública.** Tiene incisos muy útiles para un corralón: `n` Cemento, `s` Hormigón, `m` Aceros (hierro aletado), `q` Arena, `b` Albañilería, `c` Pisos y revestimientos, `h` Caños de PVC, `r` Artefactos para baño y grifería, `w` Membrana impermeabilizante, `k` Asfaltos. Propuesta: usarla como complemento del bloque de costos, con el i.a. por inciso.

**Población** (`jurisdiccion_cod = 06`). No hay fila de total: el ETL suma los valores de `sexo_cod` 1 (Mujer) y 2 (Varón). Códigos de partido verificados: Exaltación de la Cruz `06266`, General Rodríguez `06364`, Luján `06497`, Marcos Paz `06525`, Mercedes `06532`, Moreno `06560`, Pilar `06638`.

---

## 2. API Series de Tiempo (datos.gob.ar)

- Datos: `https://apis.datos.gob.ar/series/api/series/?ids=…&start_date=2025-01-01&format=json&limit=1000`
- Metadatos: agregar `&metadata=full`; se valida `field.time_index_end ≥ 2026-01-01`.
- **Ojo:** `time_index_end` no alcanza para validar. Hay series que dicen terminar en 2026 pero todos sus valores son `null` (ver "descartadas"). El ETL también valida que exista al menos un valor no nulo en 2026.

### ISAC (dataset vigente, base 2004, ids `33.x`)

Último período con dato: **2026-08**.

| Serie | id | Unidad |
|---|---|---|
| ISAC nivel general (original) | `33.2_ISAC_NIVELRAL_0_M_18_63` | Índice 2004=100 |
| ISAC desestacionalizado | `33.2_ISAC_SIN_EDAD_0_M_23_56` | Índice 2004=100 |
| ISAC tendencia-ciclo | `33.2_ISAC_CICLOCIA_0_M_20_62` | Índice 2004=100 |
| ISAC var. i.a. (publicada, para control) | `33.2_I_2004_M_4` | proporción (−0,0436) |

**Insumos.** El dataset tiene tres variantes por insumo: `33.3` = original, `33.4` = desestacionalizada, `33.5` = tendencia-ciclo.

| Insumo | Original (`33.3`) | Desestacionalizada (`33.4`) | Original con datos 2025–26 |
|---|---|---|---|
| Cemento portland | `33.3_ISAC_CEMENAND_0_0_21_29` | `33.4_ISAC_CEMENAND_0_0_21_24` | ❌ todo `null` |
| Hormigón elaborado | `33.3_ISAC_HORMIADO_0_0_23_36` | `33.4_ISAC_HORMIADO_0_0_23_66` | ✅ |
| Hierro redondo y aceros | `33.3_ISAC_HIERRION_0_0_49_36` | `33.4_ISAC_HIERRION_0_0_49_34` | ✅ |
| Ladrillos huecos | `33.3_ISAC_LADRICOS_0_0_21_27` | `33.4_ISAC_LADRICOS_0_0_21_3` | ✅ |
| Cales | `33.3_ISAC_CALESLES_0_0_10_7` | `33.4_ISAC_CALESLES_0_0_10_20` | ✅ |
| Yeso | `33.3_ISAC_YESOESO_0_0_9_54` | `33.4_ISAC_YESOESO_0_0_9_99` | ✅ |
| Placas de yeso | `33.3_ISAC_PLACAESO_0_0_19_5` | `33.4_ISAC_PLACAESO_0_0_19_55` | ✅ |
| Pinturas para construcción | `33.3_ISAC_PINTUION_0_0_31_13` | `33.4_ISAC_PINTUION_0_0_31_26` | ✅ |
| Pisos y revestimientos cerámicos | `33.3_ISAC_PISOSCOS_0_0_37_22` | `33.4_ISAC_PISOSCOS_0_0_37_54` | ✅ |
| Artículos sanitarios de cerámica | `33.3_ISAC_ARTICICA_0_0_37_38` | `33.4_ISAC_ARTICICA_0_0_37_66` | ❌ todo `null` |
| Asfalto | `33.3_ISAC_ASFALLTO_0_0_12_97` | `33.4_ISAC_ASFALLTO_0_0_12_6` | ❌ todo `null` |
| Mosaicos graníticos y calcáreos | `33.3_ISAC_MOSAIEOS_0_0_36_91` | `33.4_ISAC_MOSAIEOS_0_0_36_95` | ✅ |
| Resto | `33.3_ISAC_RESTOSTO_0_0_10_50` | `33.4_ISAC_RESTOSTO_0_0_10_0` | ❌ todo `null` |

**Decisión propuesta:** para el ranking i.a. de insumos usar la serie **original** cuando existe. Para cemento, sanitarios y asfalto (sin original publicado) usar la **desestacionalizada** y marcarla así en la UI. Una i.a. sobre la desestacionalizada es comparable mes contra mismo mes, pero no es idéntica a la original. Alternativa: usar los despachos de la AFCP (CSV manual) como dato de cemento.

### Macro y empleo

| Serie | id | Frecuencia | Último dato | Uso |
|---|---|---|---|---|
| IPC Nacional, nivel general (dic-2016=100) | `148.3_INIVELNAL_DICI_M_26` | mensual | 2026-08 | respaldo del IPC si falla la API INDEC |
| Índice de salarios, total (oct-2016=100) | `149.1_TL_INDIIOS_OCTU_0_21` | mensual | 2026-07 | salarios reales |
| Índice de salarios, registrado privado | `149.1_SOR_PRIADO_OCTU_0_25` | mensual | 2026-07 | salarios reales |
| Asalariados registrados privados, Construcción (con estacionalidad) | `152.1_CTRUCCIEST_2009_M_16` | mensual | 2026-06 | **empleo registrado en la construcción** |
| Empleo registrado privado, Construcción (trimestral, SIPA) | `155.1_CTRUCCIION_C_0_0_12` | trimestral | 2025-T4 | alternativa trimestral |
| EMAE original, nivel general | `143.3_NO_PR_2004_A_21` | mensual | 2026-07 | respaldo del EMAE general |
| EMAE desestacionalizado | `143.3_NO_PR_2004_A_31` | mensual | 2026-07 | respaldo |

### Descartadas

- `32.x` (ISAC base 2004 "DISCONTINUADO"): terminan en 2015.
- `11.3_VMATC_2004_M_12` (EMAE Construcción mensual): los metadatos dicen fin 2026-07, pero **todos los valores desde 2024 son `null`**. El EMAE Construcción sale de la API INDEC (`estimador-mensual-de-actividad-economica-sectores`).
- ICC: **no hay** series vigentes del ICC en Series de Tiempo. Se toma solo de la API INDEC.
- REM IPC (`430.1_REM_…`): llega solo hasta 2025-12. El REM se toma del BCRA.

---

## 3. API BCRA v4.0 (sin token)

- Lista de variables: `GET https://api.bcra.gob.ar/estadisticas/v4.0/Monetarias?limit=3000` (1610 variables).
- Datos: `GET https://api.bcra.gob.ar/estadisticas/v4.0/Monetarias/{id}?desde=2025-01-01&hasta=AAAA-MM-DD&limit=3000&offset=…`
- Respuesta: `results[0].detalle[] = {fecha, valor}`, en orden descendente.

| Variable | id | Periodicidad | Unidad | Último dato (al 10/11) |
|---|---|---|---|---|
| Tipo de cambio mayorista de referencia (Com. A 3500) | **5** | diaria | $ por USD | 05/11/2026 · 1.545,40 |
| Tipo de cambio minorista (promedio vendedor) | **4** | diaria | $ por USD | 05/11/2026 · 1.571,84 |
| TAMAR bancos privados (TNA) | **44** | diaria | % n.a. | 04/11/2026 · 23,56 |
| BADLAR bancos privados (TNA) | **7** | diaria | % n.a. | 04/11/2026 · 21,50 |
| UVA (31/3/16 = 14,05) | **31** | diaria | $ | 10/11/2026 · 2.185,48 |
| Préstamos hipotecarios al sector privado (stock) | **1348** | diaria | millones de $ | 03/11/2026 |
| Tasa de préstamos hipotecarios UVA | **1240** | mensual | % n.a. | 2026-10 · 6,65 |
| Inflación esperada REM, mediana próx. 12 meses | **29** | mensual | % | 2026-10 · 21,8 |
| Inflación mensual (dato INDEC replicado por BCRA) | **27** | mensual | % | 2026-09 · 1,9 |
| Inflación interanual | **28** | mensual | % | 2026-09 · 33,4 |

Las series diarias se agregan a **promedio mensual** (dólar, tasas, UVA) y a **fin de mes** (stock de préstamos hipotecarios).

---

## 4. Permisos de edificación (indicador adelantado)

No aparecen en Series de Tiempo ("permisos" devuelve 0 resultados) ni en el catálogo de la API INDEC. INDEC los publica dentro de los cuadros de "Indicadores de coyuntura de la actividad de la construcción" (superficie cubierta autorizada en una nómina de municipios). Hay dos opciones:

1. **CSV manual** (`data/manual/permisos_edificacion.csv`), cargado desde el cuadro de INDEC. Es la opción simple.
2. Descarga automática del cuadro de INDEC: frágil, porque el nombre y el formato del archivo cambian.

⏳ Falta revisar si la nómina incluye algún partido de zona oeste (Luján, Moreno, Pilar…). Si los incluye, sería el único dato municipal de actividad del bloque 4.

## 5. Fuentes manuales (sin cambios respecto del plan)

`despachos_cemento.csv` (AFCP), `indice_construya.csv`, `escrituras_pba.csv` (Colegio de Escribanos PBA), `costo_m2_cac.csv` (opcional), `nota_del_mes.md` y, si se acepta §4, `permisos_edificacion.csv`.

## 6. Frescura esperada (a hoy, 10/11/2026)

| Indicador | Último período | Fuente |
|---|---|---|
| ISAC e insumos | 2026-08 | Series de Tiempo |
| ICC | 2026-09 | API INDEC ✅ |
| IPC | 2026-09 (INDEC y BCRA) · 2026-08 en Series de Tiempo | API INDEC ✅ |
| EMAE (general y construcción) | 2026-08 | API INDEC ✅ |
| SIPM | 2026-09 | API INDEC ✅ |
| Salarios | 2026-08 | API INDEC ✅ |
| Empleo construcción | 2026-06 | Series de Tiempo |
| Dólar, tasas, UVA | diario (hasta 05/11) | BCRA |
| REM | 2026-10 | BCRA |
