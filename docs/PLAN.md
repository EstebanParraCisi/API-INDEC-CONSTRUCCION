# PLAN — Observatorio de la Construcción 2026 (para Gerencia)

> Documento para Claude Code. Leelo completo antes de escribir código. Es el plan, el alcance y las reglas del proyecto.

---

## 0. Contexto y objetivo

Una empresa distribuidora de materiales de construcción (corralón) con dos sucursales en la zona oeste del Gran Buenos Aires (Luján y La Reja, partido de Moreno) necesita una **aplicación web sencilla para la reunión mensual de los dueños**.

**Pregunta que la app tiene que responder cada mes, en menos de 5 minutos de lectura:**

> "¿Cómo viene la construcción y todo lo que la afecta en 2026 comparado con 2025, y qué significa eso para un corralón de zona oeste?"

**Decisiones de alcance (ya confirmadas, no volver a preguntar):**

| Tema | Decisión |
|---|---|
| Audiencia | Dueños, reunión mensual. Lectura tranquila, conclusiones antes que gráficos. |
| Ángulos | Actividad de la construcción · Costos e insumos · Macro y financiamiento · Mercado local zona oeste |
| Datos | **Solo datos públicos.** Nada de ventas ni información interna de la empresa. No nombrar a la empresa en el sitio. |
| Período | **Todo 2026, siempre comparado contra 2025** (mes vs mismo mes, y acumulado enero–último mes). |
| Stack | Next.js (App Router) + TypeScript, desplegado en Vercel. |

---

## 1. Principios (no negociables)

1. **Datos reales o nada.** Nunca inventar, interpolar ni completar un número. Si una serie no tiene dato para un mes, se muestra "sin dato" y la fecha del último dato disponible.
2. **Cada indicador muestra su fuente y su último período publicado.** Las fuentes tienen rezagos distintos (dólar: diario; ISAC: ~5–6 semanas; escrituras: ~3–4 semanas). El usuario tiene que ver qué tan fresco es cada número.
3. **Conclusión primero, gráfico después.** Cada bloque arranca con una frase en castellano llano ("La actividad cayó 4,4% interanual en agosto, pero el acumulado del año sigue 0,8% arriba de 2025").
4. **Nunca sumar ni promediar índices de distinta base.** Las comparaciones se hacen con variaciones porcentuales (m/m, i.a., acumulado).
5. **Simple.** Una sola página principal con scroll + un modo "informe" imprimible. Sin login, sin base de datos, sin paneles configurables en la v1.
6. **Robusto ante fallas.** La API del INDEC está en BETA. Si una fuente falla, la app sigue funcionando con el último dato guardado y lo indica.

---

## 2. Arquitectura

### Decisión clave: datos pre-procesados en el repo, no consultas en vivo

```
[Fuentes públicas] --(script ETL mensual/diario)--> /data/*.json (versionado en git)
                                                          |
                                                 Next.js lee los JSON en build
                                                          |
                                                    Sitio estático en Vercel
```

**Por qué:** la audiencia mira una vez por mes; los índices son mensuales; la API del INDEC tiene límites de uso y está en beta. Guardar los datos como JSON en el repo da: sitio rapidísimo, cero errores en vivo, historial de cada actualización en git, y cero exposición del token.

### Componentes

- `scripts/etl/` — un módulo por fuente (`indec.ts`, `seriesTiempo.ts`, `bcra.ts`, `manual.ts`). Cada uno descarga, normaliza y escribe `/data/<indicador>.json`.
- `scripts/etl/run.ts` — orquestador. Corre todas las fuentes; si una falla, **conserva el JSON anterior** y registra el error en `/data/_status.json`.
- `/data/manual/*.csv` — fuentes sin API que se cargan a mano una vez por mes (ver §3.4).
- **GitHub Action** (`.github/workflows/update-data.yml`): corre el ETL todos los días hábiles a las 9:00 ART, commitea si hubo cambios → Vercel redeploya solo.
  - Alternativa si no se usa GitHub Actions: Vercel Cron + Vercel Blob. Preferir GitHub Action por simplicidad.
- **Secretos:** `INDEC_API_TOKEN` como secret de GitHub Actions. Nunca en el código ni en variables `NEXT_PUBLIC_*`.

### Formato normalizado de cada serie

```ts
type Serie = {
  id: string;              // "isac_general"
  nombre: string;          // "Actividad de la construcción (ISAC)"
  unidad: string;          // "Índice 2004=100" | "$ por USD" | "%"
  frecuencia: "diaria" | "mensual" | "trimestral";
  fuente: string;          // "INDEC"
  fuenteUrl: string;
  actualizado: string;     // ISO, cuándo corrió el ETL
  ultimoPeriodo: string;   // "2026-08"
  datos: { periodo: string; valor: number | null; obs?: string }[]; // desde 2025-01
};
```

Las series diarias (dólar, tasas) se guardan también agregadas a **promedio mensual** para poder comparar contra 2025 mes a mes.

---

## 3. Fuentes de datos (verificadas en noviembre 2026)

### 3.1 API INDEC (requiere token gratuito)

- Base: `https://api.indec.gob.ar/v1/` — estilo PostgREST, JSON, token en header. Token vence a los 12 meses.
- **Paso 1 obligatorio:** descargar la especificación OpenAPI (está publicada en la API) y confirmar nombres exactos de tablas y columnas antes de escribir el ETL. No asumir nombres.
- Tablas a usar:

| Tabla | Para qué |
|---|---|
| `icc_precios_construccion` | ICC Gran Buenos Aires: nivel general, materiales, mano de obra, gastos generales, y grupos de materiales |
| `sipm_precios_mayoristas` | Precios mayoristas de insumos clave (cemento, hierro, cerámicos, etc. — elegir aperturas tras explorar) |
| `estimador-mensual-de-actividad-economica-sectores` | EMAE sector Construcción vs nivel general |
| `estimador-mensual-de-actividad-economica-nivel-general` | Actividad económica general |
| `ipc_nacional` | Inflación mensual (Nacional y región GBA, nivel general) — para pasar todo a términos reales |
| `indice_salarios` | Salarios (poder de compra de los clientes) |
| `redeterminacion_precios_contratos_obras_publicas` | Termómetro de costos de obra pública |
| `estimaciones_poblacion_departamento_2022_2035` | Población de los partidos de zona oeste |

### 3.2 API Series de Tiempo (datos.gob.ar, sin token)

- Búsqueda: `https://apis.datos.gob.ar/series/api/search/?q=<texto>`
- Datos: `https://apis.datos.gob.ar/series/api/series/?ids=<id1>,<id2>&start_date=2025-01-01&format=json`
- **Ojo:** hay datasets marcados "(DISCONTINUADO)" (ids `32.x`, terminan en 2015). Usar solo los del dataset vigente del ISAC (ids que empiezan con `33.`), y **validar en el ETL que `time_index_end` sea ≥ 2026**; si no, fallar con error claro.
- Series a usar (descubrir los ids exactos con el endpoint de búsqueda y dejarlos fijos en `scripts/etl/config.ts`):
  - ISAC nivel general (serie original y desestacionalizada)
  - Insumos ISAC: cemento portland, hormigón elaborado, hierro redondo y aceros, ladrillos huecos, cal, yeso, placas de yeso, pinturas, cerámicos, sanitarios, asfalto
  - Puestos de trabajo registrados en la construcción
  - Superficie autorizada por permisos de edificación (indicador adelantado)

### 3.3 API BCRA (sin token)

- `https://api.bcra.gob.ar/estadisticas/v4.0/Monetarias` — listar variables y tomar ids de:
  - Tipo de cambio mayorista (Com. A 3500) y minorista
  - Tasa TAMAR / BADLAR (costo del dinero)
  - Valor UVA (ajuste de créditos hipotecarios)
  - Stock de préstamos hipotecarios al sector privado
  - Inflación esperada REM 12 meses
- La v3.0 está deprecada: usar solo v4.0.
- Respetar paginación (`limit` máx. 3000) y pedir solo desde 2025-01-01.

### 3.4 Fuentes sin API — carga manual mensual (CSV)

Son de las más útiles para un corralón, pero no tienen API. Se cargan a mano en `/data/manual/` (5 minutos por mes). El ETL las lee, valida columnas y las convierte al mismo formato.

| Archivo | Fuente | Dato |
|---|---|---|
| `despachos_cemento.csv` | AFCP (Asociación de Fabricantes de Cemento Portland) | Toneladas despachadas por mes |
| `indice_construya.csv` | Grupo Construya | Índice y variación m/m desest. e i.a. |
| `escrituras_pba.csv` | Colegio de Escribanos de la Provincia de Buenos Aires | Compraventas e hipotecas por mes |
| `costo_m2_cac.csv` (opcional) | Cámara Argentina de la Construcción | Costo por m² |
| `nota_del_mes.md` | Gerencia | Comentario libre del responsable para la reunión |

Columnas mínimas: `periodo (YYYY-MM), valor, fuente_url`. Crear los CSV con encabezados y **sin datos inventados**; dejar un README explicando de dónde sacar cada número.

### 3.5 Valores de control (para tests)

Datos oficiales publicados en 2026, para verificar que el ETL calcula bien:

- ISAC agosto 2026: **−4,4% i.a.**; acumulado ene–ago 2026: **+0,8%** vs 2025 (INDEC).
- ICC GBA septiembre 2026: **+1,5% m/m**; acumulado año **23,9%**; i.a. **31,3%**. Materiales i.a. **22,8%**, mano de obra i.a. **38,7%** (INDEC).

Si el ETL no reproduce estos números (±0,1 p.p.), algo está mal en la serie o el cálculo.

---

## 4. Contenido de la app

### 4.1 Encabezado

- Título: "Observatorio de la Construcción 2026"
- Selector de mes de referencia (por defecto: último mes con ISAC publicado).
- Línea de frescura: "Datos actualizados al DD/MM/AAAA · ISAC hasta agosto · ICC hasta septiembre · dólar hasta ayer".

### 4.2 Bloque 0 — Resumen del mes (lo primero que se ve)

- **6 tarjetas KPI**, cada una con: valor, variación i.a., acumulado 2026 vs 2025, flecha y semáforo.
  1. Actividad de la construcción (ISAC)
  2. Costo de la construcción (ICC) vs inflación
  3. Despachos de cemento
  4. Permisos de edificación (superficie) — indicador adelantado
  5. Hipotecas en Provincia de Buenos Aires
  6. Dólar mayorista (promedio del mes)
- **"Lectura del mes":** 4–6 frases generadas **por reglas deterministas** (no por IA), a partir de los datos. Ejemplos de reglas:
  - Si ISAC i.a. < 0 y acumulado > 0 → "La actividad se enfrió en el mes, pero el año todavía viene arriba de 2025."
  - Si ICC mano de obra i.a. − ICC materiales i.a. > 5 p.p. → "La mano de obra encarece la obra mucho más que los materiales: hay margen relativo en precio de materiales frente al costo total de construir."
  - Si ICC materiales m/m < IPC m/m → "Los materiales suben por debajo de la inflación: atención a márgenes si los costos de reposición suben más que la lista."
  - Si permisos i.a. > 0 → "Más superficie autorizada anticipa demanda en los próximos 3–6 meses."
  - Si hipotecas PBA i.a. > 20% → "El crédito hipotecario empuja compraventas y refacciones en la provincia."
  - Cada regla en un archivo `lib/lectura.ts`, con test unitario.
- **Nota del mes** (desde `nota_del_mes.md`) si existe.

### 4.3 Bloque 1 — Actividad de la construcción

- ISAC 2026 vs 2025: gráfico de dos líneas (ene–dic), con serie desestacionalizada como opción.
- **Insumos ISAC, ranking i.a. del último mes** (barras horizontales): qué insumos crecen y cuáles caen. Resaltar los que vende un corralón: cemento, cal, ladrillos, hierro, hormigón elaborado, cerámicos, sanitarios, pinturas, yeso.
- EMAE construcción vs EMAE general.
- Empleo registrado en la construcción.
- Permisos de edificación (superficie autorizada).
- Despachos de cemento (AFCP) e Índice Construya.

### 4.4 Bloque 2 — Costos e insumos

- ICC: nivel general, materiales, mano de obra, gastos generales. Acumulado 2026 vs mismo período 2025.
- **ICC vs IPC**: ¿construir se encarece más o menos que la vida en general?
- Precios mayoristas (SIPM) de insumos clave, variación i.a. y acumulada.
- Materiales en dólares: ICC materiales deflactado por el dólar mayorista (¿están caros o baratos en USD?).
- Redeterminación de obra pública (si la apertura es útil tras explorarla).

### 4.5 Bloque 3 — Macro y financiamiento

- Inflación mensual 2026 vs 2025 y esperada (REM).
- Dólar mayorista y minorista, promedio mensual.
- Tasas (TAMAR/BADLAR): costo del dinero para financiar stock y para clientes.
- Créditos hipotecarios: stock y valor UVA.
- Salarios reales (índice de salarios deflactado por IPC).

### 4.6 Bloque 4 — Mercado local zona oeste

Ser honesto: hay pocos datos públicos por municipio. Mostrar lo que existe y decirlo.
- Población proyectada 2026 y crecimiento vs 2022 de: Luján, Moreno, General Rodríguez, Pilar, Marcos Paz, Mercedes, Exaltación de la Cruz.
- Escrituras e hipotecas de la Provincia de Buenos Aires (proxy del mercado bonaerense).
- Texto fijo explicando qué datos locales no existen en fuentes públicas (permisos por municipio, etc.) y que se podrían sumar más adelante.

### 4.7 Modo informe (`/informe?mes=2026-09`)

- Versión de una sola página, sin interactividad, optimizada para **imprimir o guardar como PDF** desde el navegador (CSS `@media print`, A4).
- Contenido: tarjetas KPI + lectura del mes + 4 gráficos principales + fuentes.
- Es lo que se lleva a la reunión.

### 4.8 Pie de página

- Lista de fuentes con link y fecha del último dato. Leyenda "Fuente: INDEC" visible (requisito de uso de la API).

---

## 5. Cálculos estándar (`lib/calc.ts`)

- Variación mensual: `v_t / v_{t-1} − 1`
- Variación interanual: `v_t / v_{t-12} − 1`
- Acumulado del año vs año anterior: `promedio(ene..t, 2026) / promedio(ene..t, 2025) − 1` para índices de volumen (ISAC, EMAE, despachos: usar **suma** cuando son cantidades físicas como toneladas o escrituras).
- Acumulado de precios en el año: `v_t / v_{dic 2025} − 1`
- Deflactar: `valor_real_t = valor_nominal_t / IPC_t * IPC_base`
- Todos los porcentajes con 1 decimal y coma decimal (formato es-AR).
- Test unitario de cada función, incluyendo los valores de control de §3.5.

---

## 6. Diseño

- Mobile first (los dueños pueden abrirlo en el celular) pero pensado para verse bien proyectado.
- Paleta sobria: grises + un color de acento. Verde = favorable para el negocio, rojo = desfavorable, gris = neutro. **El semáforo representa impacto en el negocio, no el signo del número** (ej.: costos que suben = rojo; actividad que sube = verde).
- Gráficos: Recharts. Siempre 2025 en gris claro y 2026 en color de acento.
- Tipografía grande en KPIs, números en formato argentino ($ 1.535,20 · 4,4%).
- Modo oscuro opcional, no prioritario.

---

## 7. Fases de trabajo

**Fase 1 — Exploración de datos (sin UI)**
1. Descargar el OpenAPI del INDEC; listar tablas, columnas y valores distintos de las columnas clave (regiones, aperturas, capítulos).
2. Buscar y fijar los ids de Series de Tiempo y del BCRA.
3. Escribir `docs/fuentes.md` con: tabla/serie, id exacto, columnas, frecuencia, último período disponible.
4. **Parar y mostrarme `docs/fuentes.md` antes de seguir.**

**Fase 2 — ETL**
5. Implementar módulos ETL + orquestador + `_status.json`.
6. Tests con los valores de control. Correr el ETL y commitear los JSON.

**Fase 3 — App**
7. Página principal con los 5 bloques.
8. Lectura del mes por reglas + tests.
9. Modo informe imprimible.

**Fase 4 — Automatización y deploy**
10. GitHub Action diaria. Secret `INDEC_API_TOKEN`.
11. Deploy en Vercel. Opcional: protección con contraseña de Vercel.
12. README con: cómo correr local, cómo cargar los CSV manuales cada mes, cómo renovar el token del INDEC (vence a los 12 meses).

---

## 8. Criterios de aceptación

- [ ] Todos los números de la app salen de `/data/*.json` y cada uno muestra fuente y último período.
- [ ] El ETL reproduce los valores de control de §3.5.
- [ ] Si se corta una fuente, la app compila y muestra el último dato guardado con aviso.
- [ ] Cada KPI compara 2026 contra 2025 (mes y acumulado).
- [ ] La lectura del mes se genera sola y cada frase es trazable a una regla con test.
- [ ] El modo informe entra en una hoja A4.
- [ ] Ningún token en el cliente; ningún dato interno de la empresa; el nombre de la empresa no aparece.
- [ ] Lighthouse mobile ≥ 90.

## 9. Fuera de alcance (v1)

Login, base de datos, datos de ventas propias, chat con IA, alertas por mail, comparación con competidores. Dejar la estructura preparada (carpeta `/data` y tipo `Serie`) para sumar en una v2.
