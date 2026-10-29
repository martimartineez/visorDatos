#!/usr/bin/env bash
# Instala todo lo necesario sin sudo: venv de Python + deps, y Node LTS en ~/.local
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
NODE_DIR="$HOME/.local/lib/node"

echo "==> Python"
if ! command -v python3 >/dev/null; then
  echo "Falta python3. Instalalo con: sudo apt install python3" >&2
  exit 1
fi

if [ ! -x "$ROOT/.venv/bin/python" ]; then
  python3 -m venv "$ROOT/.venv" || true
fi

if [ ! -x "$ROOT/.venv/bin/pip" ]; then
  echo "    bootstrapeando pip dentro del venv"
  curl -fsSL https://bootstrap.pypa.io/get-pip.py -o /tmp/get-pip.py
  "$ROOT/.venv/bin/python" /tmp/get-pip.py
fi

"$ROOT/.venv/bin/python" -m pip install --quiet --upgrade pip wheel
"$ROOT/.venv/bin/python" -m pip install --quiet -r "$ROOT/backend/requirements.txt"

echo "==> Node"
if ! command -v npm >/dev/null && [ ! -x "$NODE_DIR/bin/npm" ]; then
  mkdir -p "$HOME/.local/lib"
  VERSION=$(curl -fsSL https://nodejs.org/dist/index.json \
    | python3 -c 'import json,sys; print(next(i["version"] for i in json.load(sys.stdin) if i["lts"]))')
  echo "    instalando Node $VERSION en $NODE_DIR"
  curl -fsSL "https://nodejs.org/dist/$VERSION/node-$VERSION-linux-x64.tar.gz" -o /tmp/node.tar.gz
  tar -xzf /tmp/node.tar.gz -C "$HOME/.local/lib"
  ln -sfn "$HOME/.local/lib/node-$VERSION-linux-x64" "$NODE_DIR"
  grep -q 'local/lib/node/bin' "$HOME/.bashrc" ||
    echo 'export PATH="$HOME/.local/lib/node/bin:$PATH"' >> "$HOME/.bashrc"
fi

export PATH="$NODE_DIR/bin:$PATH"

echo "==> Dependencias del frontend"
cd "$ROOT/frontend"
npm install --no-fund --no-audit

echo
echo "Listo. Arrancá el entorno con:  ./scripts/dev.sh"
