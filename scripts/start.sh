#!/usr/bin/env bash
# Arranca el visor en modo "app local": un solo puerto (8000) sirviendo el
# frontend compilado. Es idempotente: si ya está corriendo, no levanta otro.
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
export PATH="$HOME/.local/lib/node/bin:$PATH"

PORT="${PORT:-8000}"
HOST="${HOST:-127.0.0.1}"
URL="http://127.0.0.1:$PORT"

RUN_DIR="$ROOT/.run"
PID_FILE="$RUN_DIR/server.pid"
LOG_FILE="$RUN_DIR/server.log"

mkdir -p "$RUN_DIR"

health() {
  curl -fsS -m 2 "$URL/api/health" >/dev/null 2>&1
}

if health; then
  echo "El visor ya está corriendo: $URL"
  exit 0
fi

if [ ! -x "$ROOT/.venv/bin/python" ]; then
  echo "Falta el entorno de Python. Corré primero: ./scripts/setup.sh" >&2
  exit 1
fi

needs_build=0
if [ ! -f "$ROOT/frontend/dist/index.html" ]; then
  needs_build=1
elif [ -n "$(find "$ROOT/frontend/src" "$ROOT/frontend/index.html" \
  "$ROOT/frontend/vite.config.ts" "$ROOT/frontend/public" \
  -newer "$ROOT/frontend/dist/index.html" -print -quit 2>/dev/null)" ]; then
  needs_build=1
fi

if [ "$needs_build" = "1" ]; then
  if ! command -v npm >/dev/null; then
    echo "Falta Node/npm. Corré primero: ./scripts/setup.sh" >&2
    exit 1
  fi
  if [ ! -d "$ROOT/frontend/node_modules" ]; then
    echo "Instalando dependencias del frontend…"
    (cd "$ROOT/frontend" && npm install --no-fund --no-audit)
  fi
  echo "Compilando el frontend…"
  (cd "$ROOT/frontend" && npm run build >/dev/null)
fi

# Si el puerto está ocupado por otra cosa, avisamos con un mensaje claro.
if ! health && (exec 3<>"/dev/tcp/127.0.0.1/$PORT") 2>/dev/null; then
  echo "El puerto $PORT ya está en uso por otro programa." >&2
  echo "Cerrá ese programa o probá con: PORT=8010 ./scripts/start.sh" >&2
  exit 1
fi

rm -f "$PID_FILE"
nohup setsid "$ROOT/.venv/bin/python" -m uvicorn app.main:app \
  --app-dir "$ROOT/backend" --host "$HOST" --port "$PORT" \
  >"$LOG_FILE" 2>&1 </dev/null &
echo $! >"$PID_FILE"

for _ in $(seq 1 60); do
  if health; then
    echo "Visor de Datos listo en $URL"
    echo "Log:    $LOG_FILE"
    echo "Detener: ./scripts/stop.sh"
    exit 0
  fi
  if ! kill -0 "$(cat "$PID_FILE")" 2>/dev/null; then
    break
  fi
  sleep 0.25
done

echo "El servidor no llegó a arrancar. Últimas líneas del log:" >&2
tail -n 20 "$LOG_FILE" >&2 || true
rm -f "$PID_FILE"
exit 1
