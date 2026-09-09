#!/usr/bin/env bash
set -euo pipefail

cd -- "$(dirname -- "${BASH_SOURCE[0]}")"

if ! command -v cloudflared >/dev/null 2>&1; then
    echo "Erro: instale o cloudflared e adicione-o ao PATH." >&2
    echo "https://developers.cloudflare.com/cloudflare-one/networks/connectors/cloudflare-tunnel/downloads/" >&2
    exit 1
fi

work_dir=$(mktemp -d)
server_pid=
tunnel_pid=

cleanup() {
    trap - EXIT INT TERM
    if [[ -n "$tunnel_pid" ]]; then
        kill "$tunnel_pid" 2>/dev/null || true
        wait "$tunnel_pid" 2>/dev/null || true
    fi
    if [[ -n "$server_pid" ]]; then
        kill "$server_pid" 2>/dev/null || true
        wait "$server_pid" 2>/dev/null || true
    fi
    rm -rf -- "$work_dir"
}
trap cleanup EXIT
trap 'exit 130' INT
trap 'exit 143' TERM

bash ./start_whiteboard.sh "$@" >"$work_dir/server.log" 2>&1 &
server_pid=$!

# O servidor tenta as portas 8080 a 8089. Use a URL que ele anunciou.
local_url=
for ((attempt = 0; attempt < 100; attempt++)); do
    if ! kill -0 "$server_pid" 2>/dev/null; then
        cat "$work_dir/server.log" >&2
        echo "Erro: o whiteboard encerrou antes de abrir o túnel." >&2
        exit 1
    fi
    local_url=$(sed -n 's/.*Servidor rodando em: \(http:\/\/localhost:[0-9]*\).*/\1/p' "$work_dir/server.log")
    [[ -n "$local_url" ]] && break
    sleep 0.1
done

if [[ -z "$local_url" ]]; then
    cat "$work_dir/server.log" >&2
    echo "Erro: o whiteboard não anunciou uma porta em 10 segundos." >&2
    exit 1
fi

cat "$work_dir/server.log"
echo "Compartilhe o link https://...trycloudflare.com que aparecer abaixo."
echo "Ctrl+C encerra o túnel e o whiteboard iniciado por este script."

# Configuração vazia evita interferência de túneis configurados na máquina.
printf '{}\n' >"$work_dir/cloudflared.yml"
cloudflared tunnel --config "$work_dir/cloudflared.yml" --no-autoupdate \
    --url "${local_url/localhost/127.0.0.1}" &
tunnel_pid=$!

# Se um dos processos encerrar, o trap também encerra o outro.
wait -n "$server_pid" "$tunnel_pid"
