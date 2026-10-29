# Visor de Datos

Subí un **PDF**, un **Excel** o un **CSV** y convertí sus tablas en gráficos interactivos.
Detecta las tablas y la fila de encabezado automáticamente; vos elegís qué graficar y cambiás
el tipo de gráfico cuando quieras.

![stack](https://img.shields.io/badge/FastAPI-Python-009688)
![stack](https://img.shields.io/badge/React-TypeScript-3178c6)
![stack](https://img.shields.io/badge/gráficos-Recharts-22b5bf)

## Qué hace

- **Formatos**: `.pdf` (digitales, con texto), `.xlsx` / `.xlsm`, `.csv`, `.tsv`, `.txt`.
- **Excel**: una entrada por hoja; elige la hoja en el panel lateral.
- **PDF**: extrae cada tabla de cada página (detecta tablas por líneas y, si no hay líneas, por
  alineación de texto).
- **CSV**: detecta el separador (`,` `;` tab `|`), el encoding (UTF-8, UTF-8 BOM, Windows-1252,
  Latin-1) y los números en formato español (`1.234,56`, `12 %`, `$ 1.200`, `(123)`).
- **Encabezados**: adivina en qué fila están (por si hay un título arriba) y te deja cambiarla.
- **Gráficos**: barras, barras horizontales, líneas, área, torta, dona y dispersión.
- **Series**: hasta 4 columnas numéricas por gráfico, más agregación (suma, promedio, conteo,
  máximo, mínimo), orden y Top N.
- **Exportar**: CSV del gráfico agregado y CSV de la tabla completa ya normalizada.
- **Local**: los archivos se procesan en tu máquina y se descartan al terminar; no se envían a
  ningún servicio externo.

## Cómo funciona

```
frontend (React + Vite + Recharts)
        │  POST /api/extract (multipart)
        ▼
backend (FastAPI)
   ├── openpyxl   → .xlsx/.xlsm
   ├── pdfplumber → .pdf
   └── csv        → .csv/.tsv/.txt
        │  JSON: tablas como grillas + encabezado sugerido
        ▼
frontend: infiere tipos, agrega y dibuja (todo en el navegador)
```

El backend solo extrae la grilla; la detección de tipos, la agregación y los gráficos ocurren en
el cliente. Cambiar de gráfico no hace ninguna llamada de red.

## Puesta en marcha

Requisitos: Ubuntu/Debian con `python3` (probado con 3.14). El script de setup no necesita `sudo`:
crea un `venv` e instala Node LTS en `~/.local`.

```bash
./scripts/setup.sh   # una sola vez
./scripts/dev.sh     # backend :8000 + frontend :5173
```

Abrí <http://127.0.0.1:5173>.

### Modo producción (un solo proceso)

```bash
./scripts/build.sh
.venv/bin/python -m uvicorn app.main:app --app-dir backend --host 0.0.0.0 --port 8000
```

Si existe `frontend/dist`, el backend lo sirve en `/` (el build es necesario una sola vez o
después de cada cambio de frontend).

## API

| Método | Ruta | Descripción |
| --- | --- | --- |
| `GET` | `/api/health` | Estado, versión y límites |
| `POST` | `/api/extract` | Sube un archivo (`multipart/form-data`, campo `file`) y devuelve las tablas |
| `GET` | `/api/tables/{uploadId}/{tableId}.csv` | Tabla completa normalizada en CSV |
| `GET` | `/api/docs` | Documentación interactiva (Swagger UI) |

Ejemplo:

```bash
curl -F "file=@ventas.xlsx" http://127.0.0.1:8000/api/extract
```

## Configuración

Variables de entorno (todas opcionales):

| Variable | Default | Descripción |
| --- | --- | --- |
| `MAX_UPLOAD_MB` | `30` | Tamaño máximo de archivo |
| `MAX_ROWS` | `20000` | Filas máximas por tabla |
| `MAX_COLS` | `200` | Columnas máximas por tabla |
| `MAX_STORED_UPLOADS` | `8` | Archivos en memoria para exportar (LRU) |
| `CORS_ORIGINS` | `http://localhost:5173,http://127.0.0.1:5173` | Orígenes permitidos |

## Estructura

```
backend/
  app/
    main.py            # endpoints, validaciones, servido del frontend
    models.py          # esquemas de la API (camelCase)
    config.py          # límites y CORS por env
    store.py           # caché LRU de uploads
    extractors/
      excel.py         # openpyxl
      pdf.py           # pdfplumber
      tabular.py       # CSV/TSV
      detect.py        # heurística de fila de encabezado
      clean.py         # normalización de celdas
  requirements.txt
frontend/
  src/
    App.tsx
    components/        # dropzone, panel de fuente, controles, gráfico, preview
    lib/               # parseo numérico, tipos de columna, agregación, CSV
scripts/
  setup.sh · dev.sh · build.sh
```

## Límites conocidos

- PDFs **escaneados** (imágenes) no se leen: hace falta OCR.
- `.xls` binario viejo no está soportado: guardalo como `.xlsx`.
- Tablas partidas en varias páginas de un PDF quedan como tablas separadas.
- La torta/dona grafica una sola serie (la primera seleccionada).
- El backend mantiene los últimos 8 archivos en memoria para exportar; los reinicios los borran.

## Próximos pasos

- Filtros por columna antes de graficar.
- Agrupar series por una segunda dimensión (barras apiladas / agrupadas).
- OCR opcional para PDFs escaneados.
- Exportar el gráfico como PNG.
