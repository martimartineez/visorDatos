"""Heurísticas para detectar la fila de encabezado de una tabla."""

from __future__ import annotations

from ..models import CellValue

MAX_HEADER_SCAN = 10
NUMERIC_RE = "0123456789"


def looks_numeric(text: str) -> bool:
    cleaned = (
        text.strip()
        .replace(" ", "")
        .replace("\u00a0", "")
        .replace("%", "")
        .replace("$", "")
        .replace("€", "")
        .replace("(", "")
        .replace(")", "")
        .replace("+", "")
        .replace("-", "")
        .replace(",", "")
        .replace(".", "")
    )
    return bool(cleaned) and all(ch in NUMERIC_RE for ch in cleaned)


def _usable_cells(row: list[CellValue]) -> list[CellValue]:
    return [cell for cell in row if cell is not None and str(cell).strip() != ""]


def guess_header_row(grid: list[list[CellValue]], width: int) -> int:
    """Elige la fila que más "parece" encabezado (texto, completa, única)."""
    best_row = 0
    best_score = float("-inf")

    for index, row in enumerate(grid[:MAX_HEADER_SCAN]):
        cells = _usable_cells(row)
        if not cells:
            continue

        total = len(cells)
        fill = total / max(width, 1)
        unique = len({str(cell).strip().lower() for cell in cells}) / total
        text_cells = [cell for cell in cells if isinstance(cell, str)]
        text_ratio = (
            sum(1 for cell in text_cells if not looks_numeric(cell)) / total
            if text_cells
            else 0.0
        )
        numeric_ratio = sum(
            1
            for cell in cells
            if isinstance(cell, (int, float))
            or (isinstance(cell, str) and looks_numeric(cell))
        ) / total

        # Un encabezado suele ser una fila llena de etiquetas cortas y distintas.
        score = 2.2 * fill + 1.6 * unique + 1.8 * text_ratio - 1.4 * numeric_ratio

        if total and max(len(str(cell)) for cell in cells) > 80:
            score -= 1.0  # probablemente un título, no un encabezado

        # Si la fila siguiente tiene más números que esta, esta es buen encabezado.
        if index + 1 < len(grid):
            next_cells = _usable_cells(grid[index + 1])
            if next_cells:
                next_numeric = sum(
                    1
                    for cell in next_cells
                    if isinstance(cell, (int, float))
                    or (isinstance(cell, str) and looks_numeric(cell))
                ) / len(next_cells)
                score += 1.2 * (next_numeric - numeric_ratio)

        # Desempate: preferir la fila más alta.
        score -= index * 0.05

        if score > best_score:
            best_score = score
            best_row = index

    return best_row
