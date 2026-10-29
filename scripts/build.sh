#!/usr/bin/env bash
# Build de producción: el backend sirve el frontend compilado en el mismo puerto.
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
export PATH="$HOME/.local/lib/node/bin:$PATH"

cd "$ROOT/frontend"
npm run build

echo
echo "Build listo. Servidor único con:"
echo "  .venv/bin/python -m uvicorn app.main:app --app-dir backend --host 0.0.0.0 --port 8000"
