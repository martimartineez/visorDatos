"""Esquemas de entrada/salida de la API (JSON en camelCase)."""

from __future__ import annotations

from typing import Literal

from pydantic import BaseModel, ConfigDict
from pydantic.alias_generators import to_camel

CellValue = str | int | float | bool | None


class ApiModel(BaseModel):
    model_config = ConfigDict(alias_generator=to_camel, populate_by_name=True)


class ColumnInfo(ApiModel):
    index: int
    name: str


class ExtractedTable(ApiModel):
    id: str
    label: str
    kind: Literal["sheet", "page", "csv"]
    location: str | None = None
    header_row: int
    column_count: int
    row_count: int
    truncated: bool
    columns: list[ColumnInfo]
    grid: list[list[CellValue]]


class ExtractResponse(ApiModel):
    upload_id: str
    filename: str
    kind: Literal["excel", "pdf", "csv"]
    tables: list[ExtractedTable]
    warnings: list[str] = []


class HealthResponse(ApiModel):
    status: str
    version: str
    max_upload_mb: int
    max_rows: int
