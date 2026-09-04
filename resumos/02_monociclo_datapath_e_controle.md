# Resumo 02: MIPS Monociclo — Caminho de Dados e Unidade de Controle

O processador **Monociclo** executa qualquer instrução em exatamente **1 ciclo de relógio** ($\text{CPI} = 1$).

---

## 1. Visão Geral e Restrições do Monociclo
- **CPI = 1:** Toda instrução completa em uma única batida de relógio.
- **Duração do ciclo ($T_{\text{ciclo}}$):** É limitada pela **instrução mais lenta** de todo o conjunto de instruções (quase sempre o `lw`).
- **Duplicação de Hardware:** Como cada ciclo executa tudo simultaneamente e uma unidade funcional só pode ser usada uma vez por ciclo:
  - São necessárias **duas memórias separadas**: Memória de Instruções (*Instruction Memory*) e Memória de Dados (*Data Memory*).
  - São necessárias **três unidades aritméticas**: 1 ULA principal, 1 somador dedicado para `PC + 4` e 1 somador dedicado para o endereço do `Branch`.

---

## 2. Blocos Funcionais do Caminho de Dados

1. **Contador de Programa (PC):** Registrador de 32 bits que armazena o endereço da instrução corrente.
2. **Memória de Instruções:** Recebe o endereço do PC e fornece a instrução de 32 bits correspondente.
3. **Somador PC+4:** Soma 4 bytes (1 palavra) ao PC incondicionalmente a cada ciclo.
4. **Banco de Registradores (*Register File*):**
   - Entradas de leitura: `Read register 1` (`Instr[25:21]`, `rs`) e `Read register 2` (`Instr[20:16]`, `rt`).
   - Saídas de leitura: `Read data 1` e `Read data 2`.
   - Entrada de escrita: `Write register` (`Instr[20:16]` ou `Instr[15:11]`, selecionado pelo MUX de `RegDst`).
   - Dado de escrita: `Write data` (resultado da ULA ou dado lido da memória, selecionado por `MemtoReg`).
   - Sinal de habilitação: `RegWrite` (1 = escreve no registrador; 0 = não altera).
5. **Extensor de Sinal (*Sign-extend*):** Converte o imediato de 16 bits (`Instr[15:0]`) para 32 bits replicando o bit mais significativo (bit 15).
6. **Multiplexador da ULA (`ALUSrc`):** Escolhe se a segunda entrada da ULA vem do registrador (`Read data 2`) ou do imediato estendido de 32 bits.
7. **ULA (*ALU*):** Executa operações aritméticas e lógicas e produz a saída `Zero` (1 se resultado for zero, 0 caso contrário).
8. **Controle da ULA (*ALU Control*):** Recebe o código `ALUOp` (2 bits) do controle principal e o campo `Funct` (6 bits) da instrução tipo R, gerando a operação de 4 bits para a ULA:
   - `0000` = AND
   - `0001` = OR
   - `0010` = ADD (soma)
   - `0110` = SUB (subtração)
   - `0111` = SLT (set on less than)
   - `1100` = NOR
9. **Memória de Dados:**
   - `MemRead`: Lê palavra do endereço apontado pela saída da ULA.
   - `MemWrite`: Grava `Read data 2` no endereço apontado pela saída da ULA.
10. **Lógica de Branch:**
    - Deslocador `Shift-left 2`: multiplica o imediato por 4.
    - Somador de Branch: soma `(PC + 4)` com `(imediato << 2)`.
    - Porta AND: `PCSrc = Branch AND Zero`.
    - Multiplexador de Branch: se `PCSrc = 1`, o próximo PC recebe o alvo do branch; senão, recebe `PC + 4`.
11. **Lógica de Jump (Salto Incondicional):**
    - Desloca os 26 bits inferiores (`Instr[25:0]`) 2 bits à esquerda (28 bits).
    - Concatena com os 4 bits superiores de `PC + 4`: `(PC + 4)[31:28] || (Instr[25:0] << 2)`.
    - Multiplexador de Jump: seleciona entre a saída do MUX de Branch e o endereço de Jump.

---

## 3. Tabela Completa dos Sinais de Controle

| Instrução | Opcode | RegDst | ALUSrc | MemtoReg | RegWrite | MemRead | MemWrite | Branch | ALUOp1 | ALUOp0 | Jump |
| :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: |
| **R-type** (add, sub...) | `000000` | **1** (`rd`) | **0** (reg) | **0** (ALU) | **1** | **0** | **0** | **0** | 1 | 0 | **0** |
| **lw** | `100011` | **0** (`rt`) | **1** (ext) | **1** (Mem) | **1** | **1** | **0** | **0** | 0 | 0 | **0** |
| **sw** | `101011` | **X** | **1** (ext) | **X** | **0** | **0** | **1** | **0** | 0 | 0 | **0** |
| **beq** | `000100` | **X** | **0** (reg) | **X** | **0** | **0** | **0** | **1** | 0 | 1 | **0** |
| **j** | `000010` | **X** | **X** | **X** | **0** | **0** | **0** | **0** | X | X | **1** |

> **Legenda de `X` (*Don't Care*):** O valor não afeta o resultado correto da instrução, pois a escrita na memória ou registradores está desabilitada.

---

## 4. O Significado Prático de Cada Sinal de Controle

- **`RegDst`:**
  - `0`: Registrador de destino é `rt` (`bits 20:16`) — usado em `lw` e imediatos.
  - `1`: Registrador de destino é `rd` (`bits 15:11`) — usado em instruções tipo R.
- **`ALUSrc`:**
  - `0`: Segundo operando da ULA vem do registrador `Read data 2`.
  - `1`: Segundo operando da ULA vem do imediato com extensão de sinal de 16 para 32 bits.
- **`MemtoReg`:**
  - `0`: O valor escrito no banco de registradores vem da saída da ULA.
  - `1`: O valor escrito no banco de registradores vem do dado lido da Memória de Dados (`lw`).
- **`RegWrite`:**
  - `0`: Nenhuma escrita no banco de registradores.
  - `1`: O dado na entrada `Write data` é gravado no registrador especificado por `Write register`.
- **`MemRead`:**
  - `1`: Habilita leitura da memória de dados.
- **`MemWrite`:**
  - `1`: Habilita escrita da memória de dados.
- **`Branch`:**
  - `1`: Sinaliza que é uma instrução de branch condicional (testada com a flag `Zero`).
- **`ALUOp` (2 bits):**
  - `00`: Força soma na ULA (usado para calcular endereços de memória em `lw` e `sw`).
  - `01`: Força subtração na ULA (usado para comparar registradores em `beq`).
  - `10`: Informa para olhar o campo `Funct` (usado em instruções tipo R).

---

## 5. Como Modificar o Datapath para Novas Instruções (Questões Típicas de Prova!)

### Caso 1: Instrução `LWI Rt, Rd(Rs)` (Exercício 4.2 do Patterson & Hennessy)
- **Definição:** `Reg[Rt] = Mem[Reg[Rd] + Reg[Rs]]`.
- **Diferença para o `lw` normal:** O deslocamento não é um imediato de 16 bits, mas sim **o conteúdo de outro registrador (`Rd`)**!
- **Modificação no Datapath:**
  1. O banco de registradores precisaria fornecer o conteúdo de `Rd` como uma das leituras, ou o campo `Read register 2` precisaria poder receber `Rd` (`Instr[15:11]`). Logo, adiciona-se um MUX na entrada `Read register 2` com seletor controlado pela unidade de controle.
  2. A ULA precisa somar os conteúdos lidos de `Rs` e `Rd`. Portanto, a entrada da ULA selecionada pelo MUX `ALUSrc` precisa vir do banco de registradores (`ALUSrc = 0`).
  3. O resto do caminho é idêntico ao `lw`: `MemRead = 1`, `MemtoReg = 1`, `RegWrite = 1`, `RegDst = 0` (escreve em `Rt`).

### Caso 2: Instrução `JR $ra` (Jump Register - Exercício 5.8)
- **Definição:** `PC = Reg[rs]`.
- **Modificação no Datapath:**
  1. Conectar a saída `Read data 1` do banco de registradores até uma nova entrada de multiplexador do PC.
  2. Adicionar um sinal de controle `JumpReg` ou expandir o MUX de `PC` para selecionar entre `PC+4`, `Branch Target`, `Jump Target (26 bits)` e `Read data 1`.

---

## 6. Cálculo de Caminho Crítico e Frequência Máxima

Cada instrução atravessa uma cadeia combinacional de componentes. As latências típicas são:
- $t_{\text{I-Mem}}$: Memória de Instruções
- $t_{\text{Regs}}$: Acesso ao Banco de Registradores (leitura ou escrita)
- $t_{\text{ALU}}$: Operação na ULA
- $t_{\text{D-Mem}}$: Memória de Dados
- $t_{\text{Mux}}$: Atraso de multiplexadores

### Latência por Instrução:
1. **`lw` (Caminho mais longo / Caminho Crítico):**
   $$T_{\text{lw}} = t_{\text{I-Mem}} + t_{\text{RegRead}} + t_{\text{ALU}} + t_{\text{D-Mem}} + t_{\text{Mux}} + t_{\text{RegWrite}}$$
2. **Tipo R:**
   $$T_{\text{R}} = t_{\text{I-Mem}} + t_{\text{RegRead}} + t_{\text{ALU}} + t_{\text{Mux}} + t_{\text{RegWrite}}$$
3. **`sw`:**
   $$T_{\text{sw}} = t_{\text{I-Mem}} + t_{\text{RegRead}} + t_{\text{ALU}} + t_{\text{D-Mem}}$$
4. **`beq`:**
   $$T_{\text{beq}} = t_{\text{I-Mem}} + t_{\text{RegRead}} + t_{\text{ALU}} + t_{\text{Mux}}$$

### Exemplo dos Slides da Aula (Slide 25):
- Memórias: $1\text{ ns}$
- ALU: $0.5\text{ ns}$
- Registradores: $0.5\text{ ns}$
- Somadores: $0.3\text{ ns}$
- Demais blocos: $0\text{ ns}$

**Cálculo da instrução `lw`:**
$$T_{\text{ciclo}} = 1\text{ ns (I-Mem)} + 0.5\text{ ns (Regs)} + 0.5\text{ ns (ALU)} + 1\text{ ns (D-Mem)} + 0.5\text{ ns (RegWrite)} = \mathbf{3.5\text{ ns}}$$

**Frequência máxima do Monociclo:**
$$f = \frac{1}{T_{\text{ciclo}}} = \frac{1}{3.5 \times 10^{-9}\text{ s}} \approx \mathbf{285.7\text{ MHz}}$$
