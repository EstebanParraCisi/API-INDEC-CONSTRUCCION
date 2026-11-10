# Observatorio de la Construcción 2026

Aplicación web para la reunión mensual de gerencia. Responde en menos de 5 minutos de lectura:

> ¿Cómo viene la construcción y todo lo que la afecta en 2026 comparado con 2025, y qué significa eso para un corralón de zona oeste?

Usa **solo datos públicos** (INDEC, BCRA, datos.gob.ar y entidades del sector). Nada interno de la empresa.

- **Página principal** (`/`): 6 tarjetas KPI, la "lectura del mes" y 4 bloques (actividad, costos, macro, zona oeste). Arriba hay un selector de mes.
- **Modo informe** (`/informe?mes=2026-08`): una hoja A4 para imprimir o guardar como PDF (Ctrl+P → "Guardar como PDF").

## Cómo funciona

```
Fuentes públicas ──(ETL diario, GitHub Action)──> data/*.json (en git) ──> Next.js (build estático) ──> Vercel
```

- `scripts/etl/`: un módulo por fuente (`seriesTiempo.ts`, `indec.ts`, `bcra.ts`, `manual.ts`). Los ids exactos de cada serie están en `config.ts`.
- `scripts/etl/run.ts`: orquestador. Si una fuente o serie falla, **conserva el JSON anterior** y registra el error en `data/_status.json`. La app lo muestra como aviso.
- `data/manual/*.csv`: fuentes sin API que se cargan a mano una vez por mes. Ver [`data/manual/README.md`](data/manual/README.md).
- `lib/calc.ts`: variaciones, acumulados y deflactores (§5 del plan). `lib/lectura.ts`: reglas de la lectura del mes. Ambos tienen tests.
- `docs/fuentes.md`: relevamiento de cada fuente (tablas, ids, columnas, frecuencia).

Principios: **datos reales o nada**. Si un mes no tiene dato, se muestra "sin dato" y la fecha del último dato disponible. Nunca se interpola ni se estima.

## Correr en local

Requiere Node 22.

```bash
npm install
```

```bash
export INDEC_API_TOKEN="<tu token>"   # solo para actualizar datos del INDEC
```

```bash
npm run etl      # descarga y actualiza data/*.json (sin token, la fuente INDEC falla y se conservan sus datos)
```

```bash
npm test         # tests de cálculo, ETL, lectura del mes y valores de control
```

```bash
npm run dev      # http://localhost:3000
```

Se puede correr una sola fuente: `npx tsx scripts/etl/run.ts manual` (o `bcra`, `indec`, `seriesTiempo`).

### Valores de control

`tests/control.test.ts` verifica que el ETL reproduzca datos oficiales publicados (ISAC agosto 2026: −4,4% i.a. y +0,8% acumulado; ICC GBA septiembre 2026: +1,5% m/m, 23,9% acumulado, 31,3% i.a., materiales 22,8%, mano de obra 38,7%), con tolerancia de ±0,1 p.p. Si INDEC revisa esos meses, el test puede fallar sin que haya un error de cálculo: en ese caso, actualizá el valor esperado con el dato oficial revisado.

## Carga manual mensual

Una vez por mes, cuando salen los datos (≈ 10 minutos), actualizá los CSV de `data/manual/`:

| Archivo | Fuente | Cuándo sale |
|---|---|---|
| `permisos_edificacion.csv` | INDEC, planilla de 246 municipios | con el ISAC (~6 semanas) |
| `despachos_cemento.csv` | AFCP | primeros días del mes siguiente |
| `indice_construya.csv` | Grupo Construya | primeros días del mes siguiente |
| `escrituras_pba.csv` | Colegio de Escribanos PBA | ~3–4 semanas |
| `costo_m2_cac.csv` (opcional) | Cámara Argentina de la Construcción | mensual |
| `nota_del_mes.md` | Gerencia | antes de la reunión |

El paso a paso de cada archivo está en [`data/manual/README.md`](data/manual/README.md). Se puede editar directo en GitHub (botón ✏️). Al guardar, la app se vuelve a publicar sola.

## Actualización automática

`.github/workflows/update-data.yml` corre el ETL los días hábiles a las 9:00 (hora argentina). Si cambiaron los datos, los commitea, y Vercel vuelve a publicar el sitio. También se puede correr a mano: pestaña **Actions → Actualizar datos → Run workflow**.

### Token del INDEC (vence a los 12 meses)

La API del INDEC necesita un token gratuito, que **vence a los 12 meses**.

1. Registrate en el portal del Catálogo API-INDEC (mail, nombre y organización) y verificá el mail con el código que te mandan.
2. En tu perfil, generá el **JWT Token**. Se muestra **una sola vez**: copialo.
3. En GitHub: **Settings → Secrets and variables → Actions → New repository secret**. Nombre: `INDEC_API_TOKEN`; valor: el token.
4. Anotá la fecha de vencimiento en el calendario.

**Para renovarlo:** generá uno nuevo en el perfil del portal (el anterior queda anulado) y reemplazá el valor del secret `INDEC_API_TOKEN` en GitHub (Settings → Secrets → editar).

Si el token vence o falla, la app sigue funcionando con los últimos datos guardados y muestra un aviso arriba de todo.

**Nunca** pongas el token en el código, en un archivo del repo ni en una variable `NEXT_PUBLIC_*`.

## Deploy en Vercel

1. En Vercel: **Add New → Project → Import** este repositorio de GitHub.
2. Framework: Next.js (se detecta solo). No hace falta configurar variables de entorno: el sitio se arma con los JSON de `data/`.
3. Opcional: **Settings → Deployment Protection** para pedir contraseña.

Cada commit a la rama principal (incluidos los de la actualización automática) vuelve a publicar el sitio.

## Estructura

```
app/                 páginas (/, /informe) y estilos
components/          tarjetas KPI, bloques, gráficos (Recharts)
lib/                 tipos, cálculos, formato es-AR, KPIs y lectura del mes
scripts/etl/         ETL por fuente + orquestador
data/                series normalizadas (*.json), _status.json y data/manual/*.csv
docs/                plan y relevamiento de fuentes
tests/               vitest
```

## Fuera de alcance (v1)

Login, base de datos, ventas propias, chat con IA, alertas por mail, comparación con competidores. La carpeta `data/` y el tipo `Serie` (`lib/types.ts`) ya están preparados para sumar fuentes en una v2.
