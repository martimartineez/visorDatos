"""Extracción de hojas de Excel (.xlsx/.xlsm) con openpyxl."""

from __future__ import annotations

from pathlib import Path

from openpyxl import load_workbook

from ..config import MAX_COLS, MAX_ROWS
from ..models import CellValue
from .clean import to_cell, trim_grid
from .types import RawTable


def extract_excel(path: Path) -> tuple[list[RawTable], list[str]]:
    workbook = load_workbook(path, read_only=True, data_only=True)
    tables: list[RawTable] = []
    warnings: list[str] = []

    try:
        for sheet in workbook.worksheets:
            grid: list[list[CellValue]] = []
            truncated = False

            for row in sheet.iter_rows(values_only=True):
                if len(grid) >= MAX_ROWS:
                    truncated = True
                    break
                if len(row) > MAX_COLS:
                    truncated = True
                grid.append([to_cell(value) for value in row[:MAX_COLS]])

            grid = trim_grid(grid)
            if not grid:
                continue

            if truncated:
                warnings.append(
                    f"La hoja «{sheet.title}» supera el límite de {MAX_ROWS} filas: "
                    "se muestran las primeras."
                )

            tables.append(
                RawTable(
                    kind="sheet",
                    location=sheet.title,
                    label=f"Hoja «{sheet.title}»",
                    grid=grid,
                    truncated=truncated,
                )
            )
    finally:
        workbook.close()

    if not tables:
        warnings.append("El archivo no tiene hojas con datos.")

    return tables, warnings
