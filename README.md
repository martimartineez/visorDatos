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
- **Filtros**: por valores (texto: tildás qué dejar) y por rango (números: mínimo/máximo). Se
  combinan entre columnas y afectan al gráfico, a la vista previa y al CSV del gráfico.
- **Exportar**: CSV del gráfico agregado (mismos datos y filtros que ves) e imagen **PNG** del
  gráfico tal como se muestra (título, leyenda y total incluidos), además del CSV de la tabla
  completa ya normalizada.
- **App local**: se abre con doble clic, corre en un solo puerto y se puede instalar desde el
  navegador (PWA) para usarla en su propia ventana.
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

El backend solo extrae la grilla; la detección de tipos, el filtrado, la agregación y los gráficos
ocurren en el cliente. Cambiar de gráfico o de filtros no hace ninguna llamada de red.

## Puesta en marcha

Requisitos: Ubuntu/Debian con `python3` (probado con 3.14). El script de setup no necesita `sudo`:
crea un `venv` e instala Node LTS en `~/.local`.

```bash
./scripts/setup.sh   # una sola vez (Python + Node + dependencias)
```

### Uso diario

**Desde Windows (recomendado):** doble clic en `Iniciar Visor.bat` (o en
`Iniciar Visor (sin ventana).vbs` para que no aparezca la consola). Compila el frontend si hace
falta, levanta el servidor y abre <http://127.0.0.1:8000> en el navegador. Si ya estaba corriendo,
solo abre la pestaña.

Para tenerlo a mano: clic derecho sobre el `.vbs` → **Enviar a → Escritorio (crear acceso directo)**.
Después, en Propiedades del acceso directo podés cambiar el icono por `visor.ico`.

Para apagarlo: doble clic en `Detener Visor.bat`.

**Desde la terminal de Ubuntu:**

```bash
./scripts/start.sh   # un solo puerto, en segundo plano (idempotente)
./scripts/stop.sh    # lo detiene
```

`start.sh` recompila solo si cambió el frontend, guarda el PID en `.run/` y espera a que
`/api/health` responda antes de devolver el control. Salida típica:

```
Compilando el frontend…
Visor de Datos listo en http://127.0.0.1:8000
```

### Desarrollo (hot reload)

```bash
./scripts/dev.sh     # backend :8000 + frontend :5173
```

Abrí <http://127.0.0.1:5173>.

### Modo producción manual

```bash
./scripts/build.sh
.venv/bin/python -m uvicorn app.main:app --app-dir backend --host 0.0.0.0 --port 8000
```

Si existe `frontend/dist`, el backend lo sirve en `/` (el build es necesario una sola vez o
después de cada cambio de frontend).

## Instalar como app (PWA)

El visor incluye manifest, iconos y service worker, así que el navegador lo puede instalar como
una app con su propia ventana (sin barra de direcciones):

- **Chrome / Edge**: abrí <http://127.0.0.1:8000> y usá el icono de instalar de la barra de
  direcciones (o menú → *Aplicaciones* → *Instalar este sitio como aplicación*).
- **Requisito**: el service worker solo se registra en el build de producción (`start.sh` o
  `build.sh`), no en `dev.sh`.
- Una vez instalada, la app abre directo en su ventana. El servidor tiene que estar corriendo
  (`Iniciar Visor`); si se cae, la app abre pero no puede procesar archivos nuevos.

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
| `PORT` | `8000` | Solo para `scripts/start.sh` |

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
  public/
    manifest.webmanifest # PWA
    sw.js                # service worker (offline del shell)
    icons/               # iconos 192/512/maskable
  src/
    App.tsx
    components/        # dropzone, fuente, filtros, controles, gráfico, preview
    lib/               # números, tipos de columna, filtros, agregación, CSV y descargas
scripts/
  setup.sh · dev.sh · build.sh · start.sh · stop.sh
Iniciar Visor.bat            # lanzador Windows (con consola)
Iniciar Visor (sin ventana).vbs
Detener Visor.bat
visor.ico                    # icono para el acceso directo
```

## Límites conocidos

- PDFs **escaneados** (imágenes) no se leen: hace falta OCR.
- `.xls` binario viejo no está soportado: guardalo como `.xlsx`.
- Tablas partidas en varias páginas de un PDF quedan como tablas separadas.
- La torta/dona grafica una sola serie (la primera seleccionada).
- Los filtros se aplican en el navegador: afectan al gráfico, a la vista previa y al CSV del
  gráfico, pero **no** a «Descargar tabla completa (CSV)», que baja la tabla original del servidor.
- El backend mantiene los últimos 8 archivos en memoria para exportar; los reinicios los borran.
- La imagen del gráfico se genera en el navegador a partir de lo que se ve en pantalla (2× de
  resolución), así que en el PNG no aparecen los botones de descarga.
- Los lanzadores de Windows asumen la distro `Ubuntu` (ruta `\\wsl$\Ubuntu\...`) y el proyecto en
  `/home/<usuario>/visorDatos`.

## Próximos pasos

- Agrupar series por una segunda dimensión (barras apiladas / agrupadas).
- OCR opcional para PDFs escaneados.
