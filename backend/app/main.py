"""API del Visor de Datos: sube un archivo, devuelve sus tablas como JSON."""

from __future__ import annotations

import csv
import io
import re
import tempfile
import zipfile
from pathlib import Path

from fastapi import FastAPI, File, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, Response
from fastapi.staticfiles import StaticFiles

from .config import (
    ALLOWED_EXTENSIONS,
    CORS_ORIGINS,
    FRONTEND_DIST,
    MAX_STORED_UPLOADS,
    MAX_UPLOAD_BYTES,
    MAX_UPLOAD_MB,
    MAX_ROWS,
)
from .extractors.clean import dedupe_headers
from .extractors.detect import guess_header_row
from .extractors.excel import extract_excel
from .extractors.pdf import extract_pdf
from .extractors.tabular import extract_tabular
from .extractors.types import RawTable
from .models import ColumnInfo, ExtractResponse, ExtractedTable, HealthResponse
from .store import UploadStore, StoredUpload

VERSION = "0.1.0"
CHUNK_SIZE = 1024 * 1024

app = FastAPI(
    title="Visor de Datos",
    description="Extrae tablas de PDF, Excel y CSV y las devuelve listas para graficar.",
    version=VERSION,
    docs_url="/api/docs",
    openapi_url="/api/openapi.json",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=CORS_ORIGINS,
    allow_methods=["GET", "POST"],
    allow_headers=["*"],
    expose_headers=["Content-Disposition"],
)

store = UploadStore(MAX_STORED_UPLOADS)


@app.get("/api/health", response_model=HealthResponse, tags=["sistema"])
def health() -> HealthResponse:
    return HealthResponse(
        status="ok",
        version=VERSION,
        max_upload_mb=MAX_UPLOAD_MB,
        max_rows=MAX_ROWS,
    )


def _extract(path: Path, kind: str, suffix: str) -> tuple[list[RawTable], list[str]]:
    if kind == "excel":
        return extract_excel(path)
    if kind == "pdf":
        return extract_pdf(path)
    return extract_tabular(path, suffix)


def _validate_signature(path: Path, kind: str, suffix: str) -> None:
    """Detecta el clásico archivo renombrado (.xls guardado como .xlsx, etc.)."""
    with path.open("rb") as handle:
        head = handle.read(8)

    if kind == "pdf" and not head.startswith(b"%PDF"):
        raise HTTPException(
            status_code=415,
            detail="El archivo no parece un PDF válido (no empieza con %PDF).",
        )
    if kind == "excel" and not zipfile.is_zipfile(path):
        raise HTTPException(
            status_code=415,
            detail="El archivo Excel no es un .xlsx/.xlsm válido. Si es un .xls "
            "viejo, abrilo en Excel o LibreOffice y guardalo como .xlsx.",
        )


def _prepare_table(raw: RawTable, index: int) -> ExtractedTable:
    if not raw.grid:
        raise ValueError("tabla vacía")

    width = max(len(row) for row in raw.grid)
    grid = [list(row) + [None] * (width - len(row)) for row in raw.grid]

    raw.grid = grid
    raw.header_row = guess_header_row(grid, width)
    raw.columns = dedupe_headers(grid[raw.header_row], width)

    columns = [
        ColumnInfo(index=position, name=name)
        for position, name in enumerate(raw.columns)
    ]

    return ExtractedTable(
        id=f"t{index + 1}",
        label=raw.label,
        kind=raw.kind,
        location=raw.location,
        header_row=raw.header_row,
        column_count=width,
        row_count=max(len(grid) - raw.header_row - 1, 0),
        truncated=raw.truncated,
        columns=columns,
        grid=grid,
    )


@app.post("/api/extract", response_model=ExtractResponse, tags=["datos"])
async def extract(file: UploadFile = File(...)) -> ExtractResponse:
    filename = Path(file.filename or "archivo").name
    suffix = Path(filename).suffix.lower()
    kind = ALLOWED_EXTENSIONS.get(suffix)
    if kind is None:
        permitidos = ", ".join(sorted(ALLOWED_EXTENSIONS))
        raise HTTPException(
            status_code=415,
            detail=f"Formato «{suffix or 'sin extensión'}» no soportado. Usá: {permitidos}.",
        )

    handle = tempfile.NamedTemporaryFile(delete=False, suffix=suffix)
    temp_path = Path(handle.name)
    size = 0
    try:
        while chunk := await file.read(CHUNK_SIZE):
            size += len(chunk)
            if size > MAX_UPLOAD_BYTES:
                raise HTTPException(
                    status_code=413,
                    detail=f"El archivo supera el máximo de {MAX_UPLOAD_MB} MB.",
                )
            handle.write(chunk)
        handle.close()

        if size == 0:
            raise HTTPException(status_code=422, detail="El archivo está vacío.")

        _validate_signature(temp_path, kind, suffix)

        try:
            raw_tables, warnings = _extract(temp_path, kind, suffix)
        except HTTPException:
            raise
        except Exception as error:  # noqa: BLE001 - se devuelve al usuario
            raise HTTPException(
                status_code=422,
                detail=f"No se pudo leer el archivo: {error}",
            ) from error
    finally:
        handle.close()
        temp_path.unlink(missing_ok=True)

    if not raw_tables:
        raise HTTPException(
            status_code=422,
            detail=" ".join(warnings) or "No se encontraron tablas con datos en el archivo.",
        )

    upload = store.put(filename, kind)

    tables: list[ExtractedTable] = []
    for index, raw in enumerate(raw_tables):
        table = _prepare_table(raw, index)
        upload.tables[table.id] = raw
        upload.columns[table.id] = table.columns
        tables.append(table)

    return ExtractResponse(
        upload_id=upload.id,
        filename=filename,
        kind=kind,  # type: ignore[arg-type]
        tables=tables,
        warnings=warnings,
    )


def _lookup(upload_id: str, table_id: str) -> tuple[StoredUpload, RawTable]:
    upload = store.get(upload_id)
    if upload is None:
        raise HTTPException(
            status_code=404,
            detail="La sesión de este archivo expiró. Volvé a subirlo.",
        )
    table = upload.tables.get(table_id)
    if table is None:
        raise HTTPException(status_code=404, detail="La tabla solicitada no existe.")
    return upload, table


def _safe_name(filename: str) -> str:
    stem = Path(filename).stem or "tabla"
    stem = re.sub(r"[^A-Za-z0-9._-]+", "_", stem).strip("_") or "tabla"
    return f"{stem}.csv"


@app.get("/api/tables/{upload_id}/{table_id}.csv", tags=["datos"])
def export_table(upload_id: str, table_id: str) -> Response:
    upload, table = _lookup(upload_id, table_id)

    buffer = io.StringIO()
    writer = csv.writer(buffer, lineterminator="\n")
    writer.writerow(table.columns)
    for row in table.grid[table.header_row + 1 :]:
        writer.writerow(["" if cell is None else cell for cell in row])

    return Response(
        content="\ufeff" + buffer.getvalue(),
        media_type="text/csv; charset=utf-8",
        headers={
            "Content-Disposition": f'attachment; filename="{_safe_name(upload.filename)}"'
        },
    )


if FRONTEND_DIST.is_dir():
    app.mount("/assets", StaticFiles(directory=FRONTEND_DIST / "assets"), name="assets")

    @app.get("/{full_path:path}", include_in_schema=False)
    def spa(full_path: str) -> FileResponse:
        if full_path.startswith("api/"):
            raise HTTPException(status_code=404, detail="Ruta no encontrada.")
        candidate = (FRONTEND_DIST / full_path).resolve()
        if full_path and candidate.is_file() and FRONTEND_DIST.resolve() in candidate.parents:
            return FileResponse(candidate)
        return FileResponse(FRONTEND_DIST / "index.html")
