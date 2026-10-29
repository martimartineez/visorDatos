"""Lectura de CSV/TSV con detección de encoding y separador."""

from __future__ import annotations

import csv
import io
from pathlib import Path

from ..config import MAX_COLS, MAX_ROWS
from ..models import CellValue
from .clean import to_cell, trim_grid
from .types import RawTable

ENCODINGS = ("utf-8-sig", "utf-8", "cp1252", "latin-1")
DELIMITERS = (",", ";", "\t", "|")


def _decode(data: bytes) -> tuple[str, str]:
    for encoding in ENCODINGS:
        try:
            return data.decode(encoding), encoding
        except UnicodeDecodeError:
            continue
    return data.decode("latin-1", errors="replace"), "latin-1"


def _detect_delimiter(sample: str, suffix: str) -> str:
    try:
        return csv.Sniffer().sniff(sample, delimiters=",;\t|").delimiter
    except csv.Error:
        pass

    lines = [line for line in sample.splitlines() if line.strip()][:5]
    if not lines:
        return "\t" if suffix == ".tsv" else ","

    counts = {delimiter: sum(line.count(delimiter) for line in lines) for delimiter in DELIMITERS}
    best = max(counts, key=lambda key: counts[key])
    if counts[best] == 0:
        return "\t" if suffix == ".tsv" else ","
    return best


def extract_tabular(path: Path, suffix: str) -> tuple[list[RawTable], list[str]]:
    text, encoding = _decode(path.read_bytes())
    if not text.strip():
        return [], ["El archivo está vacío."]

    delimiter = _detect_delimiter(text[:65536], suffix)

    grid: list[list[CellValue]] = []
    truncated = False
    reader = csv.reader(io.StringIO(text), delimiter=delimiter, quotechar='"')
    try:
        for row in reader:
            if len(grid) >= MAX_ROWS:
                truncated = True
                break
            if len(row) > MAX_COLS:
                truncated = True
            grid.append([to_cell(cell) for cell in row[:MAX_COLS]])
    except csv.Error as error:
        return [], [f"No se pudo interpretar el CSV: {error}"]

    grid = trim_grid(grid)
    if not grid:
        return [], ["El archivo no contiene filas con datos."]

    warnings: list[str] = []
    if encoding not in ("utf-8", "utf-8-sig"):
        warnings.append(
            f"El archivo no era UTF-8; se leyó como {encoding}. Revisá los acentos."
        )
    if truncated:
        warnings.append(f"El archivo supera el límite de {MAX_ROWS} filas o {MAX_COLS} columnas.")

    label = "Datos del archivo"
    return [
        RawTable(kind="csv", label=label, grid=grid, truncated=truncated)
    ], warnings
