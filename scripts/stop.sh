#!/usr/bin/env bash
# Detiene el servidor que levantó scripts/start.sh.
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
PID_FILE="$ROOT/.run/server.pid"

stopped=0

if [ -f "$PID_FILE" ]; then
  pid="$(cat "$PID_FILE")"
  if [ -n "$pid" ] && kill -0 "$pid" 2>/dev/null; then
    kill "$pid" 2>/dev/null || true
    for _ in $(seq 1 40); do
      kill -0 "$pid" 2>/dev/null || break
      sleep 0.15
    done
    kill -9 "$pid" 2>/dev/null || true
    stopped=1
  fi
  rm -f "$PID_FILE"
fi

# Respaldo: procesos de este proyecto que hayan quedado huérfanos.
for pid in $(pgrep -f "uvicorn app.main:app --app-dir $ROOT/backend" 2>/dev/null || true); do
  kill "$pid" 2>/dev/null || true
  stopped=1
done

if [ "$stopped" = "1" ]; then
  echo "Visor de Datos detenido."
else
  echo "No había ningún servidor corriendo."
fi
