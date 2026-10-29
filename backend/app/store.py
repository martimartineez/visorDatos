"""Caché en memoria de los archivos subidos (LRU, sin base de datos)."""

from __future__ import annotations

import threading
import uuid
from collections import OrderedDict
from dataclasses import dataclass, field

from .extractors.types import RawTable
from .models import ColumnInfo


@dataclass
class StoredUpload:
    id: str
    filename: str
    kind: str
    tables: dict[str, RawTable] = field(default_factory=dict)
    columns: dict[str, list[ColumnInfo]] = field(default_factory=dict)


class UploadStore:
    """Guarda los últimos N archivos parseados para exportar o reprocesar."""

    def __init__(self, capacity: int) -> None:
        self._capacity = max(capacity, 1)
        self._items: OrderedDict[str, StoredUpload] = OrderedDict()
        self._lock = threading.Lock()

    def put(self, filename: str, kind: str) -> StoredUpload:
        upload = StoredUpload(id=uuid.uuid4().hex, filename=filename, kind=kind)
        with self._lock:
            self._items[upload.id] = upload
            while len(self._items) > self._capacity:
                self._items.popitem(last=False)
        return upload

    def get(self, upload_id: str) -> StoredUpload | None:
        with self._lock:
            upload = self._items.get(upload_id)
            if upload is not None:
                self._items.move_to_end(upload_id)
            return upload
