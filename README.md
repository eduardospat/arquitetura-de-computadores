# 🚀 Espaço de Estudos — Arquitetura de Computadores (Prova 1: Monociclo & Multiciclo)

Repositório configurado para o estudo prático e aprofundado da disciplina de **Arquitetura de Computadores** (UFSM / Livro *Computer Organization and Design* — Patterson & Hennessy), com foco total na **Prova 1**: **MIPS Monociclo e Multiciclo (Datapaths, Sinais de Controle e Cálculos de Desempenho)**.

---

## 🎨 1. Whiteboard Interativo Integrado com IA

Você tem um **quadro branco digital local** feito sob medida para desenhar caminhos de dados, colar esquemáticos, traçar sinais e fazer contas, com **sincronização visual direta comigo (seu assistente de IA)**!

### Como iniciar o Whiteboard:
- **Opção 1 (Windows):** Dê um duplo clique no arquivo `start_whiteboard.bat`.
- **Opção 2 (Terminal):**
  ```powershell
  python start_whiteboard.py
  ```
- O navegador abrirá automaticamente em `http://localhost:8080`.

### Principais Recursos do Whiteboard:
1. **Cole Imagens Instantaneamente (`Ctrl + V`):** Tire um print de qualquer livro, slide ou anotação e aperte `Ctrl+V` dentro do quadro. A imagem será inserida exatamente onde você quiser.
2. **Templates de Datapath em 1 Clique:** No menu superior, selecione qualquer esquemático oficial da matéria (*Monociclo Completo*, *Multiciclo Completo*, *FSM de 10 Estados*, *Tratamento de Exceções*, ou qualquer um dos exercícios dos slides). O diagrama é carregado na tela pronto para você rabiscar por cima!
3. **Ferramentas de Datapath:**
   - ✏️ **Caneta Livre:** Para desenhar fios e anotações.
   - 🖍️ **Marca-Texto (Highlighter):** Pincel semitransparente ideal para destacar o caminho ativo dos dados e instruções.
   - ➡️ **Setas de Barramento:** Para indicar direção do fluxo de sinais.
   - 📐 **Carimbos de MUX e ULA:** Desenhe multiplexadores e blocos de ULA rapidamente.
   - 🔤 **Texto:** Clique e digite equações, valores de sinais (`RegWrite=1`, `ALUSrc=0`) e passos.
   - 🔍 **Pan & Zoom Infinito:** Segure a barra de **Espaço** e arraste com o mouse para navegar; use a roda do mouse para dar zoom.
4. **Sincronização com o Assistente de IA:**
   - Quando você terminar um desenho ou cálculo, clique no botão **"💾 Salvar para IA"** (ou aperte `Ctrl + S`).
   - O quadro exporta a imagem em alta resolução para `whiteboard/current_board.png`.
   - No chat, basta me dizer:
     > *"Dá uma olhada no quadro que acabei de desenhar. O caminho da instrução LWI está certo?"*
     > *"Fiz o cálculo de CPI no whiteboard, confere meus passos?"*
   - Eu irei inspecionar visualmente a imagem do quadro e te dar o retorno ponto a ponto!

---

## 📁 2. Estrutura do Repositório

```
arquitetura-de-computadores/
│
├── start_whiteboard.py                     # Inicializador do quadro em Python
├── start_whiteboard.bat                    # Atalho de duplo-clique no Windows
│
├── materiais/                              # Slides oficiais da disciplina (PDF)
│   ├── arq.pdf                             # Tópico 1 - Arquitetura MIPS (Instruções, Registradores)
│   ├── mono.pdf                            # Tópico 2 - MIPS Monociclo & Exercícios
│   └── multi.pdf                           # Tópico 3 - MIPS Multiciclo & Exercícios
│
├── resumos/                                # Resumos teóricos completos e mastigados
│   ├── 01_mips_instrucoes_e_formatos.md     # Formatos R, I, J, registradores e modos de endereçamento
│   ├── 02_monociclo_datapath_e_controle.md  # Caminho de dados, sinais e extensão para novas instruções
│   ├── 03_multiciclo_datapath_e_fsm.md      # Os 5 passos (RTL), FSM de 10 estados e exceções
│   └── 04_formulas_e_calculos_desempenho.md # Todas as fórmulas da prova (CPI, Clock, Speedup)
│
├── exercicios/                             # Gabaritos e questões de treino
│   ├── exercicios_resolvidos_monociclo.md  # Resoluções passo a passo dos exercícios 4.1 a 4.4 dos slides
│   ├── exercicios_resolvidos_multiciclo.md # Resoluções dos exercícios 5.2 a 5.50 e cálculo de CPI
│   └── banco_de_treino_prova1.md           # Questões inéditas estilo prova com gabarito oculto
│
├── ferramentas/                            # Scripts auxiliares para conferir cálculos e sinais
│   ├── calculadora_desempenho.py           # CLI para calcular tempo de ciclo, CPI e speedup
│   └── verificador_sinais.py               # Consulta rápida da tabela de sinais por instrução
│
└── whiteboard/                             # Aplicação local do quadro branco
    ├── index.html                          # Interface do quadro
    ├── app.js                              # Lógica de desenho, zoom, colagem e auto-sync
    ├── style.css                           # Estilos da interface
    ├── server.py                           # Servidor HTTP local com auto-save em PNG
    ├── templates/                          # Imagens extraídas dos PDFs prontas para uso
    ├── current_board.png                   # Imagem do quadro atual lida pela IA
    └── current_board.json                  # Estado vetorial do quadro
```

---

## 🛠️ 3. Ferramentas de Linha de Comando Disponíveis

### Calculadora de Desempenho (Caminho Crítico, CPI e Speedup)
Para testar os cenários de prova ou calcular tempos de ciclo:
```powershell
python ferramentas/calculadora_desempenho.py
```
*O script já vem com as questões dos slides pré-programadas (Slide 27 da UFSM e Exercício 4.3 do livro).*

### Verificador de Sinais de Controle
Para consultar rapidamente os sinais de controle de uma instrução:
```powershell
# Consultar Monociclo:
python ferramentas/verificador_sinais.py lw
python ferramentas/verificador_sinais.py addi
python ferramentas/verificador_sinais.py lwi

# Consultar os 5 passos do Multiciclo:
python ferramentas/verificador_sinais.py --multi
```

---

## 🎯 4. Roteiro Recomendado de Estudos para a Prova 1

1. **Etapa 1: Fundamentos MIPS**
   - Leia [resumos/01_mips_instrucoes_e_formatos.md](file:///C:/Users/Dudu/Documents/GitHub/arquitetura-de-computadores/resumos/01_mips_instrucoes_e_formatos.md).
   - Memorize a divisão de bits dos formatos R (`op 6, rs 5, rt 5, rd 5, shamt 5, funct 6`) e I (`op 6, rs 5, rt 5, imed 16`).

2. **Etapa 2: Monociclo e Sinais de Controle**
   - Leia [resumos/02_monociclo_datapath_e_controle.md](file:///C:/Users/Dudu/Documents/GitHub/arquitetura-de-computadores/resumos/02_monociclo_datapath_e_controle.md).
   - Abra o Whiteboard, carregue o template `01 - Monociclo Datapath e Controle` e use o marca-texto para colorir o caminho que cada instrução percorre (`lw`, `sw`, `beq`, `R-type`).
   - Resolva no quadro o **Exercício 4.2 (`LWI`)** e me peça para verificar.

3. **Etapa 3: Multiciclo e FSM**
   - Leia [resumos/03_multiciclo_datapath_e_fsm.md](file:///C:/Users/Dudu/Documents/GitHub/arquitetura-de-computadores/resumos/03_multiciclo_datapath_e_fsm.md).
   - Entenda a função dos 4 novos registradores internos: `IR`, `MDR`, `A/B`, `ALUOut`.
   - Carregue no Whiteboard a `05 - FSM Máquina de Estados Completa` e revise os 10 estados (0 a 9) e as transições com exceções (10 e 11).

4. **Etapa 4: Cálculos de Desempenho e Speedup**
   - Leia [resumos/04_formulas_e_calculos_desempenho.md](file:///C:/Users/Dudu/Documents/GitHub/arquitetura-de-computadores/resumos/04_formulas_e_calculos_desempenho.md).
   - Treine o cálculo de $\text{CPI}_{\text{médio}} = \sum (\text{Mix}_i \times \text{CPI}_i)$ e o tempo total de CPU: $T = N \times \text{CPI} \times T_{\text{clk}}$.
   - Use a [calculadora de desempenho](file:///C:/Users/Dudu/Documents/GitHub/arquitetura-de-computadores/ferramentas/calculadora_desempenho.py) para conferir suas respostas.

5. **Etapa 5: Simulado Prático**
   - Resolva as questões do [exercicios/banco_de_treino_prova1.md](file:///C:/Users/Dudu/Documents/GitHub/arquitetura-de-computadores/exercicios/banco_de_treino_prova1.md) desenhando no Whiteboard e me chamando no chat!
