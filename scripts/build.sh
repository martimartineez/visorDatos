#!/usr/bin/env bash
# Build de producción: el backend sirve el frontend compilado en el mismo puerto.
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
export PATH="$HOME/.local/lib/node/bin:$PATH"

cd "$ROOT/frontend"
npm run build

echo
echo "Build listo. Para levantar la app:"
echo "  ./scripts/start.sh"
