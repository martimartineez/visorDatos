"""Normalización de celdas y de la grilla extraída."""

from __future__ import annotations

import datetime as dt
import math
from typing import Any

from ..models import CellValue


def to_cell(value: Any) -> CellValue:
    """Convierte cualquier valor de openpyxl/pdfplumber/csv a algo serializable."""
    if value is None:
        return None
    if isinstance(value, bool):
        return value
    if isinstance(value, (dt.datetime, dt.date, dt.time)):
        return value.isoformat()
    if isinstance(value, (int, float)):
        if isinstance(value, float) and (math.isnan(value) or math.isinf(value)):
            return None
        return value
    text = str(value).strip()
    return text or None


def is_blank(value: CellValue) -> bool:
    return value is None or (isinstance(value, str) and not value.strip())


def trim_grid(grid: list[list[CellValue]]) -> list[list[CellValue]]:
    """Quita filas y columnas totalmente vacías de los bordes."""
    rows = [row for row in grid if any(not is_blank(cell) for cell in row)]
    if not rows:
        return []

    width = max(len(row) for row in rows)
    padded = [list(row) + [None] * (width - len(row)) for row in rows]

    occupied = [
        col for col in range(width) if any(not is_blank(row[col]) for row in padded)
    ]
    if not occupied:
        return []

    first, last = occupied[0], occupied[-1]
    return [row[first : last + 1] for row in padded]


def dedupe_headers(raw: list[CellValue], width: int) -> list[str]:
    """Genera nombres de columna únicos y no vacíos a partir de una fila."""
    names: list[str] = []
    seen: dict[str, int] = {}
    for index in range(width):
        value = raw[index] if index < len(raw) else None
        base = "" if is_blank(value) else str(value).strip()
        base = " ".join(base.split()) or f"Columna {index + 1}"
        count = seen.get(base, 0)
        seen[base] = count + 1
        names.append(base if count == 0 else f"{base} ({count + 1})")
    return names
