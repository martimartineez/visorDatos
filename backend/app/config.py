"""Configuración del backend, vía variables de entorno."""

from __future__ import annotations

import os
from pathlib import Path

BACKEND_DIR = Path(__file__).resolve().parent.parent
PROJECT_DIR = BACKEND_DIR.parent
FRONTEND_DIST = PROJECT_DIR / "frontend" / "dist"

# Límites de seguridad: el servidor nunca carga un archivo completo en memoria
MAX_UPLOAD_MB = int(os.getenv("MAX_UPLOAD_MB", "30"))
MAX_UPLOAD_BYTES = MAX_UPLOAD_MB * 1024 * 1024

# Filas/columnas máximas que se procesan por tabla
MAX_ROWS = int(os.getenv("MAX_ROWS", "20000"))
MAX_COLS = int(os.getenv("MAX_COLS", "200"))

# Cuántos uploads quedan en memoria (LRU)
MAX_STORED_UPLOADS = int(os.getenv("MAX_STORED_UPLOADS", "8"))

ALLOWED_EXTENSIONS = {
    ".xlsx": "excel",
    ".xlsm": "excel",
    ".csv": "csv",
    ".tsv": "csv",
    ".txt": "csv",
    ".pdf": "pdf",
}

CORS_ORIGINS = [
    origin.strip()
    for origin in os.getenv(
        "CORS_ORIGINS",
        "http://localhost:5173,http://127.0.0.1:5173",
    ).split(",")
    if origin.strip()
]
