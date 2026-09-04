# Resumo 01: Arquitetura MIPS — Instruções, Formatos e Registradores

Este guia resume os conceitos fundamentais da arquitetura MIPS (base do livro *Patterson & Hennessy* e das aulas de Arquitetura de Computadores) necessários para a Prova 1.

---

## 1. Características Gerais da Arquitetura MIPS
- **Arquitetura RISC** (Reduced Instruction Set Computer): conjunto reduzido de instruções simples com tamanho fixo.
- **Palavra (Word):** 32 bits (4 bytes).
- **Instruções:** Todas têm exatamente 32 bits.
- **Registradores:** 32 registradores de uso geral de 32 bits (`$0` a `$31`).
- **Arquitetura Load/Store:** Apenas instruções de *load* e *store* acessam a memória; operações aritméticas/lógicas operam exclusivamente sobre registradores.
- **Alinhamento de Memória:** O MIPS é endereçado a **byte**, mas palavras de 32 bits devem ser alinhadas em múltiplos de 4 (endereços terminam em `00` em binário).

---

## 2. Mapa dos 32 Registradores MIPS

| Número | Nome simbólico | Uso convencional | Preservado em chamada? |
| :---: | :---: | :--- | :---: |
| `$0` | `$zero` | Constante 0 rígida em hardware (não pode ser alterado) | N/A |
| `$1` | `$at` | Reservado para o Assembler (pseudo-instruções) | Não |
| `$2 - $3` | `$v0 - $v1` | Valores de retorno de funções e avaliação de expressões | Não |
| `$4 - $7` | `$a0 - $a3` | Argumentos/parâmetros para chamadas de função | Não |
| `$8 - $15` | `$t0 - $t7` | Temporários (podem ser sobrescritos por sub-rotinas) | Não |
| `$16 - $23` | `$s0 - $s7` | Salvos (devem ser preservados/restaurados por funções) | **Sim** |
| `$24 - $25` | `$t8 - $t9` | Mais temporários | Não |
| `$26 - $27` | `$k0 - $k1` | Reservados para o Kernel do Sistema Operacional (exceções) | N/A |
| `$28` | `$gp` | *Global Pointer* (acesso rápido a dados estáticos: `0x10008000`) | Sim |
| `$29` | `$sp` | *Stack Pointer* (ponteiro da pilha, cresce de cima para baixo) | **Sim** |
| `$30` | `$fp` | *Frame Pointer* (ponteiro do quadro de procedimento) | **Sim** |
| `$31` | `$ra` | *Return Address* (endereço de retorno, salvo por `jal`) | **Sim** |

---

## 3. Os 3 Formatos de Instrução MIPS

Todas as instruções têm 32 bits e campo de **opcode de 6 bits** (`[31:26]`).

### 3.1 Formato R (Register)
Usado para instruções aritméticas, lógicas e movimentação entre registradores.

```
+-----------+---------+---------+---------+---------+-----------+
|  opcode   |   rs    |   rt    |   rd    |  shamt  |   funct   |
|  (6 bits) | (5 bits)| (5 bits)| (5 bits)| (5 bits)|  (6 bits) |
+-----------+---------+---------+---------+---------+-----------+
    31-26      25-21     20-16     15-11     10-6        5-0
```

- **`opcode` (6 bits):** Para instruções tipo R, é **sempre `000000` (0)**.
- **`rs` (5 bits):** 1º registrador de origem (*source*).
- **`rt` (5 bits):** 2º registrador de origem (*target*).
- **`rd` (5 bits):** Registrador de destino (*destination*).
- **`shamt` (5 bits):** *Shift Amount* (quantidade de deslocamento para `sll`, `srl`, `sra`).
- **`funct` (6 bits):** Código de função específica repassado para a ULA (ex: `add=32`, `sub=34`, `and=36`, `or=37`, `slt=42`).

### 3.2 Formato I (Immediate)
Usado para operações aritméticas com imediato, *loads*, *stores* e desvios condicionais (*branch*).

```
+-----------+---------+---------+-------------------------------+
|  opcode   |   rs    |   rt    |      imediato / offset        |
|  (6 bits) | (5 bits)| (5 bits)|           (16 bits)           |
+-----------+---------+---------+-------------------------------+
    31-26      25-21     20-16                 15-0
```

- **`opcode` (6 bits):** Identifica a instrução diretamente (ex: `lw=35`, `sw=43`, `beq=4`, `bne=5`, `addi=8`).
- **`rs` (5 bits):** Registrador de origem (ou registrador base de memória).
- **`rt` (5 bits):** 
  - Em `lw` e `addi`: registrador de **destino** dos dados!
  - Em `sw` e `beq`: registrador de **origem** do dado a ser escrito ou comparado!
- **`imediato` (16 bits):** Constante com sinal ou deslocamento de endereço.

### 3.3 Formato J (Jump)
Usado para saltos incondicionais e chamadas de sub-rotina.

```
+-----------+---------------------------------------------------+
|  opcode   |                  endereço / target                |
|  (6 bits) |                      (26 bits)                    |
+-----------+---------------------------------------------------+
    31-26                               25-0
```

- **`opcode` (6 bits):** `j = 2`, `jal = 3`.
- **`target` (26 bits):** Endereço destino em palavras (será multiplicado por 4 / concatenado com os 4 bits superiores do PC).

---

## 4. Modos de Endereçamento MIPS

1. **Endereçamento por Registrador (Register Addressing):**
   - O operando é o conteúdo de um registrador.
   - Exemplo: `add $t0, $s1, $s2` ou `jr $ra`.

2. **Endereçamento por Base / Deslocamento (Base Addressing):**
   - Endereço da memória = conteúdo de um registrador base (`rs`) somado ao imediato de 16 bits com sinal estendido.
   - $\text{Endereço} = \text{Reg}[rs] + \text{SignExt16}(imediato)$.
   - Exemplo: `lw $t0, 32($s3)`, `sw $t0, 0($sp)`.

3. **Endereçamento Imediato (Immediate Addressing):**
   - O operando é a constante de 16 bits presente na própria instrução (estendida com sinal para aritméticas ou com zeros para lógicas).
   - Exemplo: `addi $t0, $s1, 100`, `andi $t0, $s1, 0xFF`.

4. **Endereçamento Relativo ao PC (PC-Relative Addressing):**
   - Usado em desvios condicionais (`beq`, `bne`).
   - O deslocamento na instrução conta **quantas palavras** saltar a partir de `PC + 4`.
   - $\text{Novo PC} = (\text{PC} + 4) + (\text{SignExt16}(imediato) \ll 2)$.
   - Permite saltar em um intervalo de aproximadamente $\pm 128\text{ KB}$ em torno de `PC+4`.

5. **Endereçamento Pseudo-Direto (Pseudodirect Addressing):**
   - Usado em desvios incondicionais (`j`, `jal`).
   - Os 26 bits são deslocados 2 bits à esquerda (28 bits) e concatenados com os 4 bits superiores do `PC + 4`:
   - $\text{Novo PC} = (\text{PC} + 4)[31:28] \mathbin{\Vert} (\text{address}_{26} \ll 2)$.
   - Permite saltar dentro de um bloco contíguo de $2^{28} = 256\text{ MB}$.

---

## 5. Chamadas de Função e Pilha (*Stack*)
- A pilha cresce dos endereços altos para os endereços baixos.
- Alocar espaço: `addi $sp, $sp, -N` (onde N é múltiplo de 4).
- Desalocar espaço: `addi $sp, $sp, +N`.
- **Procedimento Folha (*Leaf*):** Função que não chama outras funções. Geralmente não precisa salvar `$ra`.
- **Procedimento Não-Folha (*Non-leaf*):** Função que chama outras funções. É **obrigatório** salvar `$ra` na pilha logo no início e restaurá-lo antes de retornar (`jr $ra`).
