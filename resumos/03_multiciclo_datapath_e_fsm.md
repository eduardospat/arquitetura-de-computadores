# Resumo 03: MIPS Multiciclo — Caminho de Dados, FSM e Exceções

No processador **Multiciclo**, cada instrução é dividida em uma sequência de **passos**, onde cada passo é executado em exatamente **1 ciclo de relógio curto**.

---

## 1. Vantagens do Multiciclo sobre o Monociclo

| Característica | Monociclo | Multiciclo |
| :--- | :--- | :--- |
| **CPI (Ciclos por Instrução)** | Fixo em 1 para todas as instruções | Variável: 3 (`beq`, `j`), 4 (tipo R, `sw`), 5 (`lw`) |
| **Período do Relógio ($T_{\text{ciclo}}$)** | Determinado pela instrução mais longa (`lw`, ~3.5 ns) | Determinado pela **etapa mais longa** (memória, ~1.0 ns) |
| **Memórias** | 2 memórias separadas (Instrução e Dados) | **1 única memória compartilhada** (Instrução + Dados) |
| **Unidades Aritméticas** | 3 unidades (ULA + 2 somadores) | **1 única ULA** (reutilizada em ciclos distintos) |
| **Desperdício de Tempo** | Alto: instruções rápidas esperam o ciclo inteiro | Baixo: instruções rápidas terminam mais cedo |

---

## 2. Novos Componentes do Caminho de Dados Multiciclo

### 2.1 Registradores Internos (Não Arquiteturais)
São registradores invisíveis ao programador assembly, usados para armazenar dados entre ciclos adjacentes:
1. **`IR` (Instruction Register):** Guarda a instrução lida na busca para uso nos passos seguintes. Possui sinal de controle de escrita `IRWrite`.
2. **`MDR` (Memory Data Register):** Guarda o dado lido da memória (em instruções `lw`) até que seja gravado no banco de registradores.
3. **`A` e `B`:** Guardam temporariamente os operandos lidos do banco de registradores.
4. **`ALUOut`:** Guarda a saída da ULA calculada no passo anterior.

### 2.2 Novos Multiplexadores e Sinais de Controle
1. **`IorD` (Instruction or Data):**
   - `0`: O endereço enviado para a memória vem do **PC** (busca de instrução).
   - `1`: O endereço enviado para a memória vem do **ALUOut** (acesso a dados em `lw` ou `sw`).
2. **`ALUSelA`:**
   - `0`: 1º operando da ULA é o **PC**.
   - `1`: 1º operando da ULA é o registrador **A** (`rs`).
3. **`ALUSelB` (2 bits):**
   - `00`: 2º operando da ULA é o registrador **B** (`rt`).
   - `01`: 2º operando da ULA é a **constante 4** (usado para `PC + 4` no passo 1).
   - `10`: 2º operando da ULA é o **imediato estendido com sinal** (cálculo de endereço base+offset).
   - `11`: 2º operando da ULA é o **imediato estendido e deslocado 2 bits à esquerda** (cálculo antecipado do branch no passo 2).
4. **`PCSource` (2 bits):**
   - `00`: Saída direta da ULA (`PC + 4` no passo 1).
   - `01`: Conteúdo do registrador `ALUOut` (alvo do `branch` no passo 3).
   - `10`: Endereço de `Jump` concatenado: `PC[31:28] || (IR[25:0] << 2)`.
5. **Sinais de Escrita do PC:**
   - `PCWrite`: Escrita incondicional no PC (no passo 1 e no `jump`).
   - `PCWriteCond`: Escrita condicional (no `beq`: `PCWriteFinal = PCWrite OR (PCWriteCond AND Zero)`).

---

## 3. Os 5 Passos de Execução (RTL)

### Passo 1: Busca da Instrução (*Instruction Fetch*) — Comum a Todas
- **Ações:**
  - $IR \leftarrow \text{Memory}[PC]$
  - $PC \leftarrow PC + 4$
- **Sinais Ativos:** `MemRead = 1`, `IorD = 0`, `IRWrite = 1`, `ALUSelA = 0`, `ALUSelB = 01`, `ALUOp = 00`, `PCSource = 00`, `PCWrite = 1`.

### Passo 2: Decodificação e Busca de Registradores (*Decode & Reg Fetch*) — Comum a Todas
- **Ações:**
  - $A \leftarrow \text{Reg}[IR[25:21]]$
  - $B \leftarrow \text{Reg}[IR[20:16]]$
  - $ALUOut \leftarrow PC + (\text{SignExt}(IR[15:0]) \ll 2)$ *(cálculo antecipado do branch)*
- **Sinais Ativos:** `ALUSelA = 0`, `ALUSelB = 11`, `ALUOp = 00`.

### Passo 3: Execução, Cálculo de Endereço ou Conclusão de Salto
- **Se Tipo R:**
  - $ALUOut \leftarrow A \text{ op } B$
  - Sinais: `ALUSelA = 1`, `ALUSelB = 00`, `ALUOp = 10`.
- **Se Referência à Memória (`lw` ou `sw`):**
  - $ALUOut \leftarrow A + \text{SignExt}(IR[15:0])$
  - Sinais: `ALUSelA = 1`, `ALUSelB = 10`, `ALUOp = 00`.
- **Se `beq` (Termina aqui — 3 ciclos!):**
  - $\text{if } (A == B) \text{ then } PC \leftarrow ALUOut$
  - Sinais: `ALUSelA = 1`, `ALUSelB = 00`, `ALUOp = 01`, `PCSource = 01`, `PCWriteCond = 1`.
- **Se `j` (Termina aqui — 3 ciclos!):**
  - $PC \leftarrow PC[31:28] \mathbin{\Vert} (IR[25:0] \ll 2)$
  - Sinais: `PCSource = 10`, `PCWrite = 1`.

### Passo 4: Acesso à Memória ou Término de Tipo R
- **Se Tipo R (Termina aqui — 4 ciclos!):**
  - $\text{Reg}[IR[15:11]] \leftarrow ALUOut$
  - Sinais: `RegDst = 1`, `RegWrite = 1`, `MemtoReg = 0`.
- **Se `sw` (Termina aqui — 4 ciclos!):**
  - $\text{Memory}[ALUOut] \leftarrow B$
  - Sinais: `MemWrite = 1`, `IorD = 1`.
- **Se `lw`:**
  - $MDR \leftarrow \text{Memory}[ALUOut]$
  - Sinais: `MemRead = 1`, `IorD = 1`.

### Passo 5: Término de `lw` (*Write-Back*) (Termina aqui — 5 ciclos!)
- **Se `lw`:**
  - $\text{Reg}[IR[20:16]] \leftarrow MDR$
  - Sinais: `RegDst = 0`, `RegWrite = 1`, `MemtoReg = 1`.

---

## 4. Máquina de Estados Finitos (FSM) Completa (10 Estados)

```
                       [ Estado 0: Busca ]
                                |
                     [ Estado 1: Decodificação ]
                     /       |           |        \
    (lw ou sw)      /     (tipo R)    (beq)        \ (jump)
                   v         v           v          v
              [Est. 2]   [Est. 6]    [Est. 8]*  [Est. 9]*
              /      \       |
             /        \      v
          (lw)        (sw) [Est. 7]*
          v            v
      [Est. 3]     [Est. 5]*
          |
          v
      [Est. 4]*

* Estados que concluem a instrução e retornam ao Estado 0.
```

### Tabela Resumo dos 10 Estados:
- **Estado 0:** Busca da instrução (`PC = PC + 4`, `IR = Mem[PC]`).
- **Estado 1:** Decodificação, leitura de registradores e pré-cálculo do branch.
- **Estado 2:** Cálculo do endereço de memória ($A + \text{offset}$).
- **Estado 3:** Leitura da memória de dados para `lw` ($MDR = \text{Mem}[ALUOut]$).
- **Estado 4:** Escrita no banco de registradores para `lw` ($\text{Reg}[rt] = MDR$).
- **Estado 5:** Escrita na memória de dados para `sw` ($\text{Mem}[ALUOut] = B$).
- **Estado 6:** Execução da operação na ULA para Tipo R ($ALUOut = A \text{ op } B$).
- **Estado 7:** Escrita no registrador de destino para Tipo R ($\text{Reg}[rd] = ALUOut$).
- **Estado 8:** Conclusão de `beq` (subtrai $A - B$, se zero atualiza $PC = ALUOut$).
- **Estado 9:** Conclusão de `jump` ($PC = \text{alvo jump}$).

---

## 5. Tratamento de Exceções no Multiciclo

### O que são Exceções e Interrupções?
- **Exceção (Interna):** Ocorre de dentro da CPU (ex: *Overflow* aritmético, código de operação inválido/indefinido).
- **Interrupção (Externa):** Ocorre de fora da CPU (ex: requisição de dispositivo de E/S, temporizador de hardware).

### Hardware para Exceções no MIPS:
1. **`EPC` (Exception Program Counter):** Registrador de 32 bits que guarda o endereço da instrução que causou a exceção.
2. **`Cause Register`:** Registrador que informa ao Sistema Operacional o motivo da exceção:
   - No MIPS simplificado dos slides:
     - `bit 0 = 0`: Instrução Indefinida.
     - `bit 0 = 1`: *Overflow* aritmético.
3. **Endereço do Tratador (*Exception Handler*):**
   - Endereço fixo no MIPS: `0x80000180` (o PC é carregado com este endereço para pular para o kernel do SO).

### Novos Estados na FSM para Exceções:
- **Estado 10 (Instrução Indefinida):**
  - Acionado a partir do **Estado 1** se o `opcode` for desconhecido.
  - Sinais: `CauseWrite = 1`, `IntCause = 0`, `EPCWrite = 1`, `PCSource = 11 (0x80000180)`, `PCWrite = 1`.
- **Estado 11 (Overflow Aritmético):**
  - Acionado a partir do **Estado 6/7** se a ULA sinalizar *overflow*.
  - Sinais: `CauseWrite = 1`, `IntCause = 1`, `EPCWrite = 1`, `PCSource = 11 (0x80000180)`, `PCWrite = 1`.
  - Nota importante de prova: O EPC deve salvar `PC - 4` para apontar exatamente para a instrução que gerou o overflow!
