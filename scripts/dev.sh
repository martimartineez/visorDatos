#!/usr/bin/env bash
# Levanta backend (FastAPI con reload) y frontend (Vite) en una sola terminal.
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
export PATH="$HOME/.local/lib/node/bin:$PATH"

if [ ! -x "$ROOT/.venv/bin/python" ]; then
  echo "Falta el entorno de Python. Corré primero: ./scripts/setup.sh" >&2
  exit 1
fi

if [ ! -d "$ROOT/frontend/node_modules" ]; then
  echo "Instalando dependencias del frontend…"
  (cd "$ROOT/frontend" && npm install --no-fund --no-audit)
fi

pids=()
cleanup() {
  for pid in "${pids[@]:-}"; do
    kill "$pid" 2>/dev/null || true
  done
}
trap cleanup EXIT INT TERM

echo "Backend  → http://127.0.0.1:8000/api/health  (docs en /api/docs)"
echo "Frontend → http://127.0.0.1:5173"

"$ROOT/.venv/bin/python" -m uvicorn app.main:app \
  --app-dir "$ROOT/backend" --reload --port 8000 &
pids+=($!)

cd "$ROOT/frontend"
npm run dev &
pids+=($!)

wait
