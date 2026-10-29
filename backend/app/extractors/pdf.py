"""Extracción de tablas de PDFs digitales con pdfplumber."""

from __future__ import annotations

from pathlib import Path
from typing import Any

import pdfplumber

from ..config import MAX_COLS, MAX_ROWS
from ..models import CellValue
from .clean import is_blank, to_cell, trim_grid
from .types import RawTable

# Estrategias probadas en orden: primero líneas dibujadas, después alineación
# por texto (PDFs sin bordes, típicos de Excel impreso).
STRATEGIES: tuple[dict[str, str], ...] = (
    {"vertical_strategy": "lines", "horizontal_strategy": "lines"},
    {"vertical_strategy": "text", "horizontal_strategy": "text"},
)


def _grid_from_raw(raw: list[list[Any]]) -> list[list[CellValue]]:
    grid: list[list[CellValue]] = []
    for row in raw[:MAX_ROWS]:
        grid.append([to_cell(cell) for cell in row[:MAX_COLS]])
    return trim_grid(grid)


def _is_real_table(grid: list[list[CellValue]]) -> bool:
    if len(grid) < 2:
        return False
    width = max(len(row) for row in grid)
    if width < 2:
        return False
    filled = sum(
        1 for row in grid for cell in row if not is_blank(cell)
    )
    return filled >= max(4, len(grid))


def extract_pdf(path: Path) -> tuple[list[RawTable], list[str]]:
    tables: list[RawTable] = []
    warnings: list[str] = []

    with pdfplumber.open(path) as pdf:
        if not pdf.pages:
            return [], ["El PDF no tiene páginas."]

        for page_number, page in enumerate(pdf.pages, start=1):
            grids: list[list[list[CellValue]]] = []

            for strategy in STRATEGIES:
                try:
                    candidate = page.extract_tables(strategy) or []
                except Exception:  # pdfplumber puede fallar con layouts raros
                    continue
                cleaned = [g for g in (_grid_from_raw(t) for t in candidate) if _is_real_table(g)]
                if cleaned:
                    grids = cleaned
                    break

            if not grids:
                continue

            for index, grid in enumerate(grids, start=1):
                truncated = len(grid) >= MAX_ROWS
                label = f"Página {page_number}"
                if len(grids) > 1:
                    label += f" · tabla {index}"
                tables.append(
                    RawTable(
                        kind="page",
                        location=f"{page_number}:{index}",
                        label=label,
                        grid=grid,
                        truncated=truncated,
                    )
                )

    if not tables:
        warnings.append(
            "No se detectaron tablas. Puede ser un PDF escaneado (imagen) o un "
            "layout sin filas/columnas reconocibles."
        )

    return tables, warnings
