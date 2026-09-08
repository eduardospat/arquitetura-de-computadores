#!/usr/bin/env python3
"""
Launcher de Compartilhamento Online para o Whiteboard MIPS
Inicia o túnel Cloudflare, copia o link gerado direto para a área de transferência
e exibe as instruções de forma limpa e objetiva.
"""

import os
import sys
import subprocess
import re
import time
import socket

if hasattr(sys.stdout, 'reconfigure'):
    sys.stdout.reconfigure(encoding='utf-8', line_buffering=True)

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
CLOUDFLARED = os.path.join(BASE_DIR, 'cloudflared.exe')

def copy_to_clipboard(text):
    try:
        p = subprocess.Popen('clip', stdin=subprocess.PIPE, shell=True)
        p.communicate(input=text.encode('utf-8'))
        return True
    except Exception:
        return False

def is_port_in_use(port=8080):
    with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
        return s.connect_ex(('127.0.0.1', port)) == 0

def main():
    print("=" * 70)
    print(" 🚀 INICIANDO TÚNEL DE COLABORAÇÃO - WHITEBOARD MIPS")
    print("=" * 70)

    if not os.path.exists(CLOUDFLARED):
        print(f"Erro: {CLOUDFLARED} não foi encontrado.")
        sys.exit(1)

    if not is_port_in_use(8080):
        print("⚠️  Aviso: O servidor do whiteboard (porta 8080) parece não estar ativo.")
        print("Iniciando o servidor local primeiro...")
        server_py = os.path.join(BASE_DIR, 'whiteboard', 'server.py')
        subprocess.Popen([sys.executable, server_py, '--no-browser'])
        time.sleep(1.5)

    print("\n⏳ Conectando aos servidores da Cloudflare...")
    cmd = [
        CLOUDFLARED,
        'tunnel',
        '--edge-ip-version', '4',
        '--protocol', 'http2',
        '--url', 'http://localhost:8080'
    ]

    proc = subprocess.Popen(
        cmd,
        stdout=subprocess.PIPE,
        stderr=subprocess.STDOUT,
        text=True,
        bufsize=1,
        encoding='utf-8',
        errors='replace'
    )

    url = None
    url_pattern = re.compile(r'https://[a-zA-Z0-9-]+\.trycloudflare\.com')

    start_time = time.time()
    for line in proc.stdout:
        m = url_pattern.search(line)
        if m:
            url = m.group(0)
            break
        if time.time() - start_time > 30:
            break

    if not url:
        print("\n❌ Não foi possível obter o link do túnel.")
        print("Verifique sua conexão com a internet.")
        proc.terminate()
        sys.exit(1)

    copied = copy_to_clipboard(url)

    print("\n" + "=" * 70)
    print(" 🎉 TÚNEL ATIVO COM SUCESSO!")
    print("=" * 70)
    print(f"\n 🔗 SEU LINK PÚBLICO:\n    👉  {url}  👈\n")
    if copied:
        print(" 📋 [COPIADO!] O link já está na sua área de transferência.")
        print("    Basta dar Ctrl + V no WhatsApp ou Discord do seu amigo!")
    else:
        print(" 📋 Copie o link acima e envie para seu amigo.")
    print("\n" + "-" * 70)
    print(" ⚠️  IMPORTANTE: NÃO FECHE ESTA JANELA!")
    print(" O túnel precisa ficar aberto aqui enquanto vocês estiverem usando.")
    print(" Quando terminarem de estudar, basta fechar a janela ou teclar Ctrl + C.")
    print("=" * 70 + "\n")

    sys.stdout.flush()

    try:
        # Drain stdout continuously so Windows pipe buffer never blocks cloudflared
        for _ in proc.stdout:
            pass
    except KeyboardInterrupt:
        print("\nEncerrando túnel...")
        proc.terminate()

if __name__ == '__main__':
    main()
