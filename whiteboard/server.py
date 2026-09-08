#!/usr/bin/env python3
"""
Whiteboard Local Server for Arquitetura de Computadores
Provides static file serving and API endpoints for saving canvas state,
exporting PNG for AI inspection, and loading templates/feedback.
"""

import http.server
import socketserver
import os
import sys

if hasattr(sys.stdout, 'reconfigure'):
    sys.stdout.reconfigure(encoding='utf-8')

import json
import base64
import time
import webbrowser
from datetime import datetime

PORT = 8080
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
REPO_DIR = os.path.dirname(BASE_DIR)
SNAPSHOTS_DIR = os.path.join(BASE_DIR, 'snapshots')
TEMPLATES_DIR = os.path.join(BASE_DIR, 'templates')

os.makedirs(SNAPSHOTS_DIR, exist_ok=True)
os.makedirs(TEMPLATES_DIR, exist_ok=True)

# Curated catalog of all course diagrams
TEMPLATES_CATALOG = [
    # 0. Prova Real Oficial (UFSM)
    {
        "filename": "prova_q1_add3.jpg",
        "title": "🏆 Prova Q1: add3 $rd, $rs, $rt (Monociclo)",
        "category": "🏆 Prova Real (UFSM)",
        "badge": "Prova",
        "desc": "Questão 1 da prova real (3.0 pts). Adicionar instrução rd = rs + rt + rd modificando o banco de registradores e inserindo 2ª ULA."
    },
    {
        "filename": "prova_q2_subabs.jpg",
        "title": "🏆 Prova Q2: subabs $rd, $rs, $rt (Monociclo)",
        "category": "🏆 Prova Real (UFSM)",
        "badge": "Prova",
        "desc": "Questão 2 da prova real (3.0 pts). Adicionar instrução rd = |rs - rt|. Cuidado com a seleção pelo bit de sinal!"
    },
    {
        "filename": "prova_q3_relu.jpg",
        "title": "🏆 Prova Q3: relu $rs (Multiciclo + FSM)",
        "category": "🏆 Prova Real (UFSM)",
        "badge": "Prova",
        "desc": "Questão 3 da prova real (4.0 pts). Instrução if (rs > 0) rs = rs else rs = 0 no multiciclo com novos estados na FSM."
    },
    {
        "filename": "prova1_pag_1.jpg",
        "title": "🏆 Prova Completa - Página 1 (Q1 add3)",
        "category": "🏆 Prova Real (UFSM)",
        "badge": "Prova",
        "desc": "Enunciado e datapath original da Questão 1 da prova."
    },
    {
        "filename": "prova1_pag_2.jpg",
        "title": "🏆 Prova Completa - Página 2 (Q2 subabs)",
        "category": "🏆 Prova Real (UFSM)",
        "badge": "Prova",
        "desc": "Enunciado e datapath original da Questão 2 da prova."
    },
    {
        "filename": "prova1_pag_3.jpg",
        "title": "🏆 Prova Completa - Página 3 (Q3 relu)",
        "category": "🏆 Prova Real (UFSM)",
        "badge": "Prova",
        "desc": "Enunciado e diagrama multiciclo original da Questão 3 da prova."
    },

    # 1. Incompletos para Praticar / Preencher
    {
        "filename": "incompleto_mono_sem_controle.jpg",
        "title": "Monociclo em Branco (Sem Linhas de Controle)",
        "category": "Incompletos (Para Praticar)",
        "badge": "Treino",
        "desc": "Datapath completo com blocos e MUXes, mas sem fios de controle. Ideal para desenhar os sinais de cada instrução."
    },
    {
        "filename": "incompleto_multi_sem_controle.jpg",
        "title": "Multiciclo em Branco (Bloco Operacional com MUXes)",
        "category": "Incompletos (Para Praticar)",
        "badge": "Treino",
        "desc": "Bloco operacional com IR, MDR, A, B, ALUOut e MUXes, pronto para traçar a propagação dos passos."
    },
    {
        "filename": "incompleto_mono_add_sub_lw_sw.jpg",
        "title": "Monociclo Básico (ADD, SUB, LW, SW)",
        "category": "Incompletos (Para Praticar)",
        "badge": "Treino",
        "desc": "Datapath simplificado sem branch e sem jump, para praticar as primeiras instruções."
    },
    {
        "filename": "incompleto_mono_apenas_regs_alu.jpg",
        "title": "Monociclo Inicial (Apenas Banco de Registradores e ULA)",
        "category": "Incompletos (Para Praticar)",
        "badge": "Treino",
        "desc": "Blocos essenciais de operações Tipo R para entender o fluxo de dados entre registradores e ULA."
    },
    {
        "filename": "incompleto_multi_apenas_registradores.jpg",
        "title": "Multiciclo Inicial (Registradores Internos)",
        "category": "Incompletos (Para Praticar)",
        "badge": "Treino",
        "desc": "Esquemático com os registradores temporários IR, MDR, A, B, ALUOut para praticar a lógica de multiplexação."
    },

    # 2. Completos de Referência
    {
        "filename": "completo_mono_datapath_controle.jpg",
        "title": "Monociclo Completo com Controle",
        "category": "Completos (Referência)",
        "badge": "Completo",
        "desc": "Caminho de dados monociclo com unidade de controle principal, ALU Control e todos os barramentos azuis."
    },
    {
        "filename": "completo_mono_com_jump.jpg",
        "title": "Monociclo Completo com Jump",
        "category": "Completos (Referência)",
        "badge": "Completo",
        "desc": "Datapath completo com suporte à instrução incondicional Jump (formato J) e MUX do PC."
    },
    {
        "filename": "completo_mono_tabela_sinais.jpg",
        "title": "Tabela da Verdade dos Sinais de Controle (Monociclo)",
        "category": "Completos (Referência)",
        "badge": "Tabela",
        "desc": "Tabela oficial dos sinais RegDst, ALUSrc, MemtoReg, RegWrite, MemRead, MemWrite, Branch, ALUOp."
    },
    {
        "filename": "completo_multi_datapath.jpg",
        "title": "Multiciclo Completo com Controle",
        "category": "Completos (Referência)",
        "badge": "Completo",
        "desc": "Caminho de dados multiciclo completo com sinais IorD, ALUSelA, ALUSelB, PCSource, IRWrite, etc."
    },
    {
        "filename": "completo_multi_fsm_10_estados.png",
        "title": "FSM Multiciclo Completa (10 Estados)",
        "category": "Completos (Referência)",
        "badge": "FSM",
        "desc": "Máquina de estados finitos detalhada de 10 estados (0 a 9) com todas as condições de transição e sinais."
    },
    {
        "filename": "completo_multi_excecoes.jpg",
        "title": "Multiciclo Completo com Exceções",
        "category": "Completos (Referência)",
        "badge": "Exceções",
        "desc": "Hardware estendido para suporte a exceções (EPC, Cause, registrador de status, vetor 0x80000180)."
    },
    {
        "filename": "completo_multi_fsm_excecoes.jpg",
        "title": "FSM Completa com Estados de Exceção (10 e 11)",
        "category": "Completos (Referência)",
        "badge": "FSM",
        "desc": "FSM estendida com os estados 10 (Instrução Indefinida) e 11 (Overflow Aritmético)."
    },

    # 3. Os 5 Passos do Multiciclo
    {
        "filename": "passo_1_busca_fetch.jpg",
        "title": "Passo 1: Busca de Instrução (IR = Mem[PC]; PC = PC + 4)",
        "category": "Passos Multiciclo",
        "badge": "Passo 1",
        "desc": "Destaque do caminho percorrido durante a busca da instrução e incremento do PC."
    },
    {
        "filename": "passo_2_decodificacao_branch.jpg",
        "title": "Passo 2: Decodificação e Branch Antecipado",
        "category": "Passos Multiciclo",
        "badge": "Passo 2",
        "desc": "Leitura de registradores (A e B) e cálculo antecipado do endereço de salto na ULA."
    },
    {
        "filename": "passo_3_tipo_r_execucao.jpg",
        "title": "Passo 3: Execução Tipo R (ALUOut = A op B)",
        "category": "Passos Multiciclo",
        "badge": "Passo 3",
        "desc": "Cálculo da operação aritmética ou lógica na ULA para instruções Tipo R."
    },
    {
        "filename": "passo_4_tipo_r_writeback.jpg",
        "title": "Passo 4: Write-Back Tipo R (Reg[rd] = ALUOut)",
        "category": "Passos Multiciclo",
        "badge": "Passo 4",
        "desc": "Gravação do resultado da ULA no registrador de destino rd."
    },
    {
        "filename": "passo_3_memoria_endereco.jpg",
        "title": "Passo 3: Memória (Cálculo de Endereço A + offset)",
        "category": "Passos Multiciclo",
        "badge": "Passo 3",
        "desc": "Cálculo do endereço efetivo de memória para instruções LW e SW."
    },
    {
        "filename": "passo_4_load_leitura.jpg",
        "title": "Passo 4: Leitura da Memória (MDR = Mem[ALUOut])",
        "category": "Passos Multiciclo",
        "badge": "Passo 4",
        "desc": "Acesso de leitura à memória de dados para instrução LW."
    },
    {
        "filename": "passo_5_load_writeback.jpg",
        "title": "Passo 5: Write-Back LW (Reg[rt] = MDR)",
        "category": "Passos Multiciclo",
        "badge": "Passo 5",
        "desc": "Conclusão do LW: gravação do dado da memória no registrador rt."
    },
    {
        "filename": "passo_4_store_memoria.jpg",
        "title": "Passo 4: Escrita na Memória SW (Mem[ALUOut] = B)",
        "category": "Passos Multiciclo",
        "badge": "Passo 4",
        "desc": "Gravação do dado do registrador B na memória de dados (conclusão do SW)."
    },
    {
        "filename": "passo_3_branch_desvio.jpg",
        "title": "Passo 3: Decisão de Branch (if A == B then PC = ALUOut)",
        "category": "Passos Multiciclo",
        "badge": "Passo 3",
        "desc": "Comparação de registradores na ULA e atualização condicional do PC."
    },
    {
        "filename": "passo_3_jump_salto.jpg",
        "title": "Passo 3: Salto Incondicional Jump",
        "category": "Passos Multiciclo",
        "badge": "Passo 3",
        "desc": "Atualização do PC com o endereço de 26 bits deslocado."
    },

    # 4. Exercícios dos Slides
    {
        "filename": "exercicio_4_1_and.jpg",
        "title": "Exercício 4.1: Sinais e Recursos da Instrução AND",
        "category": "Exercícios dos Slides",
        "badge": "Ex 4.1",
        "desc": "Identificar sinais de controle e blocos ativos/inativos para a instrução AND Rd, Rs, Rt."
    },
    {
        "filename": "exercicio_4_2_lwi.jpg",
        "title": "Exercício 4.2: Implementando Nova Instrução LWI Rt, Rd(Rs)",
        "category": "Exercícios dos Slides",
        "badge": "Ex 4.2",
        "desc": "Load Word com deslocamento em registrador. Quais blocos e sinais adicionar ao datapath?"
    },
    {
        "filename": "exercicio_4_3_speedup.jpg",
        "title": "Exercício 4.3: Latências, Multiplicador e Speedup",
        "category": "Exercícios dos Slides",
        "badge": "Ex 4.3",
        "desc": "Calcular tempo de ciclo com e sem multiplicador e avaliar o ganho real de desempenho."
    },
    {
        "filename": "exercicio_4_4_caminho_critico.jpg",
        "title": "Exercício 4.4: Caminho Crítico e Tempo de Relógio",
        "category": "Exercícios dos Slides",
        "badge": "Ex 4.4",
        "desc": "Calcular o ciclo para processadores que só fazem fetch, branch relativo ou condicional."
    },
    {
        "filename": "exercicio_5_8_jr.jpg",
        "title": "Exercício 5.8: Adicionando Instrução JR $ra (Jump Register)",
        "category": "Exercícios dos Slides",
        "badge": "Ex 5.8",
        "desc": "Desenhar as modificações necessárias no caminho de dados para suportar PC = Reg[rs]."
    },
    {
        "filename": "exercicio_5_11_lwpi.jpg",
        "title": "Exercício 5.11 a 5.14: LWPI (Pós-Incremento) e SWAP",
        "category": "Exercícios dos Slides",
        "badge": "Ex 5.11",
        "desc": "Por que o Monociclo não suporta LWPI sem duplicar portas e como o Multiciclo resolve em 6 ciclos."
    },
    {
        "filename": "exercicio_5_29_stuck_at.jpg",
        "title": "Exercício 5.29: Falhas Presas (Stuck-at) no Multiciclo",
        "category": "Exercícios dos Slides",
        "badge": "Ex 5.29",
        "desc": "Efeito de sinais presos em 0 ou 1 (IRWrite=0, PCWrite=0, PCWriteCond=0, etc.)."
    },
    {
        "filename": "exercicio_5_49_eret.jpg",
        "title": "Exercício 5.49 e 5.50: Instrução ERET e Tratamento de Exceções",
        "category": "Exercícios dos Slides",
        "badge": "Ex 5.49",
        "desc": "Implementação do retorno de exceção PC = EPC no caminho de dados e FSM."
    }
]

class WhiteboardHandler(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=BASE_DIR, **kwargs)

    def end_headers(self):
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type')
        self.send_header('Cache-Control', 'no-cache, no-store, must-revalidate')
        super().end_headers()

    def do_OPTIONS(self):
        self.send_response(200)
        self.end_headers()

    def do_GET(self):
        if self.path == '/api/templates':
            self.handle_get_templates()
        elif self.path == '/api/status':
            self.handle_get_status()
        elif self.path == '/api/ai-feedback':
            self.handle_get_ai_feedback()
        else:
            super().do_GET()

    def do_POST(self):
        if self.path == '/api/save':
            self.handle_save_board()
        elif self.path == '/api/ai-feedback':
            self.handle_post_ai_feedback()
        else:
            self.send_error(404, 'Endpoint não encontrado')

    def handle_get_templates(self):
        templates = []
        for item in TEMPLATES_CATALOG:
            fpath = os.path.join(TEMPLATES_DIR, item['filename'])
            if os.path.exists(fpath):
                templates.append({
                    'filename': item['filename'],
                    'url': f"/templates/{item['filename']}",
                    'title': item['title'],
                    'category': item['category'],
                    'badge': item.get('badge', ''),
                    'desc': item.get('desc', '')
                })

        self.send_response(200)
        self.send_header('Content-Type', 'application/json; charset=utf-8')
        self.end_headers()
        self.wfile.write(json.dumps(templates, ensure_ascii=False).encode('utf-8'))

    def handle_get_status(self):
        board_png = os.path.join(BASE_DIR, 'current_board.png')
        feedback_file = os.path.join(BASE_DIR, 'ai_feedback.json')
        
        has_board = os.path.exists(board_png)
        mtime = os.path.getmtime(board_png) if has_board else 0
        
        has_feedback = os.path.exists(feedback_file)
        feedback_mtime = os.path.getmtime(feedback_file) if has_feedback else 0

        status = {
            'has_board': has_board,
            'board_last_modified': datetime.fromtimestamp(mtime).isoformat() if has_board else None,
            'has_feedback': has_feedback,
            'feedback_last_modified': datetime.fromtimestamp(feedback_mtime).isoformat() if has_feedback else None
        }

        self.send_response(200)
        self.send_header('Content-Type', 'application/json; charset=utf-8')
        self.end_headers()
        self.wfile.write(json.dumps(status).encode('utf-8'))

    def handle_get_ai_feedback(self):
        feedback_file = os.path.join(BASE_DIR, 'ai_feedback.json')
        feedback_data = {"notes": [], "timestamp": None}
        if os.path.exists(feedback_file):
            try:
                with open(feedback_file, 'r', encoding='utf-8') as f:
                    feedback_data = json.load(f)
            except Exception as e:
                feedback_data = {"error": str(e), "notes": []}

        self.send_response(200)
        self.send_header('Content-Type', 'application/json; charset=utf-8')
        self.end_headers()
        self.wfile.write(json.dumps(feedback_data, ensure_ascii=False).encode('utf-8'))

    def handle_post_ai_feedback(self):
        content_length = int(self.headers.get('Content-Length', 0))
        post_data = self.rfile.read(content_length)
        feedback_file = os.path.join(BASE_DIR, 'ai_feedback.json')
        try:
            payload = json.loads(post_data.decode('utf-8'))
            with open(feedback_file, 'w', encoding='utf-8') as f:
                json.dump(payload, f, indent=2, ensure_ascii=False)
            self.send_response(200)
            self.send_header('Content-Type', 'application/json; charset=utf-8')
            self.end_headers()
            self.wfile.write(json.dumps({'status': 'ok', 'saved': True}).encode('utf-8'))
        except Exception as e:
            self.send_error(500, f'Erro ao salvar feedback: {e}')

    def handle_save_board(self):
        content_length = int(self.headers.get('Content-Length', 0))
        post_data = self.rfile.read(content_length)
        
        try:
            payload = json.loads(post_data.decode('utf-8'))
            image_data = payload.get('image', '')
            state_data = payload.get('state', {})
            timestamp_str = datetime.now().strftime('%Y%m%d_%H%M%S')

            # Process Base64 PNG image
            if image_data.startswith('data:image/png;base64,'):
                b64_str = image_data.split('data:image/png;base64,')[1]
                img_bytes = base64.b64decode(b64_str)

                # Save current_board.png (for AI view_file)
                current_png = os.path.join(BASE_DIR, 'current_board.png')
                with open(current_png, 'wb') as f:
                    f.write(img_bytes)

                root_png = os.path.join(REPO_DIR, 'current_board.png')
                try:
                    with open(root_png, 'wb') as f:
                        f.write(img_bytes)
                except Exception:
                    pass

                # Save snapshot
                snapshot_png = os.path.join(SNAPSHOTS_DIR, f'snapshot_{timestamp_str}.png')
                with open(snapshot_png, 'wb') as f:
                    f.write(img_bytes)

            # Save current_board.json (vector elements)
            current_json = os.path.join(BASE_DIR, 'current_board.json')
            with open(current_json, 'w', encoding='utf-8') as f:
                json.dump(state_data, f, indent=2, ensure_ascii=False)

            root_json = os.path.join(REPO_DIR, 'current_board.json')
            try:
                with open(root_json, 'w', encoding='utf-8') as f:
                    json.dump(state_data, f, indent=2, ensure_ascii=False)
            except Exception:
                pass

            self.send_response(200)
            self.send_header('Content-Type', 'application/json; charset=utf-8')
            self.end_headers()
            response = {
                'status': 'ok',
                'timestamp': timestamp_str,
                'message': 'Quadro salvo com sucesso! O assistente de IA já consegue visualizar o desenho.',
                'image_path': 'whiteboard/current_board.png'
            }
            self.wfile.write(json.dumps(response, ensure_ascii=False).encode('utf-8'))
        except Exception as e:
            self.send_error(500, f'Erro ao salvar quadro: {e}')

def run_server(port=PORT, open_browser=True):
    actual_port = port
    server = None
    for p in range(port, port + 10):
        try:
            server = socketserver.TCPServer(("", p), WhiteboardHandler)
            actual_port = p
            break
        except OSError:
            continue

    if not server:
        print(f"Erro: Não foi possível vincular a nenhuma porta a partir de {port}")
        sys.exit(1)

    url = f"http://localhost:{actual_port}"
    print("=" * 65)
    print(" 🚀 QUADRO BRANCO - ARQUITETURA DE COMPUTADORES")
    print(f" 📡 Servidor rodando em: {url}")
    print(f" 📂 Arquivo sincronizado com a IA: {os.path.join(BASE_DIR, 'current_board.png')}")
    print("=" * 65)
    print(" Dica: Desenhe, cole imagens (Ctrl+V) ou carregue templates.")
    print(" Clique em '💾 Salvar para IA' para atualizar a visão do assistente.")
    print(" Pressione Ctrl+C no terminal para encerrar.")
    print("=" * 65)

    if open_browser:
        webbrowser.open(url)

    try:
        server.serve_forever()
    except KeyboardInterrupt:
        print("\nEncerrando servidor...")
        server.shutdown()

if __name__ == '__main__':
    open_b = '--no-browser' not in sys.argv
    run_server(PORT, open_browser=open_b)
