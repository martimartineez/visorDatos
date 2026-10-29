"""Tipos internos del proceso de extracción."""

from __future__ import annotations

from dataclasses import dataclass, field
from typing import Literal

from ..models import CellValue

TableKind = Literal["sheet", "page", "csv"]


@dataclass
class RawTable:
    kind: TableKind
    label: str
    grid: list[list[CellValue]]
    location: str | None = None
    truncated: bool = False
    header_row: int = 0
    columns: list[str] = field(default_factory=list)
