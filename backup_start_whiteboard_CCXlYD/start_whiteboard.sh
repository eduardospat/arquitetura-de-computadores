#!/usr/bin/env bash
set -euo pipefail

cd -- "$(dirname -- "${BASH_SOURCE[0]}")"

if ! command -v python3 >/dev/null 2>&1; then
    echo "Erro: instale o Python 3 para iniciar o whiteboard." >&2
    exit 1
fi

exec python3 -u whiteboard/server.py "$@"
