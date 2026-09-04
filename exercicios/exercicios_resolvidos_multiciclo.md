# Exercícios Resolvidos: MIPS Multiciclo e Falhas de Hardware

Gabarito comentado dos exercícios presentes nos slides de aula do material `multi.pdf` (extraídos do livro *Organização e Projeto de Computadores*, Patterson & Hennessy).

---

## Exercício 5.2 & 5.3: Falhas Presas (*Stuck-at Faults*) (Slide 50)
Descreva o efeito que uma falha presa em 0 (*stuck-at-0*, o sinal fica sempre 0) ou presa em 1 (*stuck-at-1*, sempre 1) causa no datapath:

### 1. `RegWrite = 0` (Preso em 0)
- **Efeito:** O banco de registradores nunca é escrito.
- **Instruções afetadas:** Todas as instruções que gravam resultados em registradores falharão! (Tipo R como `add`, `sub`, `and`, `or`, além de `lw` e `addi`).
- **Instruções que continuam funcionando:** `sw`, `beq`, `bne`, `j` (pois elas não gravam em registradores).

### 2. `ALUOp0 = 0` ou `ALUOp1 = 0`
- Para instruções Tipo R, `ALUOp` deve ser `10`. Se `ALUOp1 = 0`, o controle da ULA interpretará como `00` (soma) para todas as instruções Tipo R. Subtrações (`sub`), comparações (`slt`) e operações lógicas falharão.
- Para `beq`, `ALUOp` deve ser `01` (subtração). Se `ALUOp0 = 0`, a ULA fará uma soma em vez de subtração, gerando erro na verificação da igualdade (`Zero` só ativaria se $A + B = 0$).

### 3. `Branch = 0` (Preso em 0)
- **Efeito:** A porta AND que gera `PCSrc` receberá sempre 0.
- **Instruções afetadas:** `beq` nunca tomará o desvio, mesmo quando a condição for verdadeira. O programa sempre executará sequencialmente.

### 4. `MemRead = 0` (Preso em 0)
- **Efeito:** A memória de dados nunca é lida.
- **Instruções afetadas:** O `lw` carregará dados inválidos/lixo para os registradores.

### 5. `MemWrite = 0` (Preso em 0)
- **Efeito:** A memória de dados nunca é atualizada.
- **Instruções afetadas:** O `sw` falha silenciosamente sem gravar dados na memória.

---

## Exercício 5.8: Adicionando a Instrução `jr $ra` (Jump Register) (Slide 50)
A instrução `jr rs` faz:
$$\text{PC} \leftarrow \text{Reg}[rs]$$

### Modificações no Datapath:
1. Puxar um barramento da saída `Read data 1` do banco de registradores (que contém o valor de `Reg[rs]`) até o multiplexador que seleciona a fonte do PC.
2. Adicionar uma nova entrada no MUX do PC (ou expandir o MUX de 2 para 3 ou 4 entradas).
3. Adicionar um sinal de controle para selecionar esta nova entrada quando o campo `Funct` indicar `jr` (`001000 = 8`).

---

## Exercício 5.11 & 5.12: Instrução Load Word com Pós-Incremento (`l_inc` / `LWPI`) (Slide 51 e 57 a 62)
A instrução executa duas tarefas em uma só:
```assembly
lw   $rs, L($rt)
addi $rt, $rt, 1   # ou 4 para palavras
```

### 5.12 Por que é impossível implementar no Monociclo sem modificar o Banco de Registradores?
- No monociclo padrão, o banco de registradores possui **apenas 1 porta de escrita** (`Write register` e `Write data`).
- A instrução com pós-incremento precisa gravar **dois valores diferentes em dois registradores distintos no mesmo ciclo**:
  1. O dado vindo da memória precisa ser gravado em `Reg[rs]`.
  2. O valor incrementado precisa ser gravado em `Reg[rt]`.
- Como só há uma porta de escrita, seria fisicamente impossível sem adicionar uma 2ª porta de escrita de 32 bits no banco de registradores.

### Como o Multiciclo resolve isso facilmente? (Slides 57 a 62)
No multiciclo, as duas escritas acontecem em **ciclos separados**:
- **Ciclo 1:** Busca da instrução (`PC = PC + 4`).
- **Ciclo 2:** Decodificação e leitura de registradores.
- **Ciclo 3:** ULA calcula o endereço de memória: $ALUOut = A + \text{offset}$.
- **Ciclo 4:** Memória lê o dado: $MDR = \text{Mem}[ALUOut]$.
- **Ciclo 5:** 1ª escrita: $\text{Reg}[rs] \leftarrow MDR$ e a ULA calcula o incremento: $ALUOut = A + 4$.
- **Ciclo 6:** 2ª escrita: $\text{Reg}[rt] \leftarrow ALUOut$.
> Total de **6 ciclos**, sem necessidade de duplicar portas de escrita no hardware!

---

## Exercício 5.14: Implementando `swap $rs, $rt` (Slide 51)
A instrução troca o conteúdo de dois registradores:
$$\text{temp} = \text{Reg}[rs]; \quad \text{Reg}[rs] = \text{Reg}[rt]; \quad \text{Reg}[rt] = \text{temp};$$

### Emulação por Software:
Com um registrador temporário `$t0` livre:
```assembly
add $t0, $rs, $zero   # temp = rs
add $rs, $rt, $zero   # rs = rt
add $rt, $t0, $zero   # rt = temp
```
Leva **3 instruções**.

### Análise de Desempenho do Enunciado:
Se adicionar a instrução em hardware aumentar o ciclo de relógio em $10\%$, qual percentual de swaps no programa justificaria a mudança?
- Seja $p$ o percentual de instruções `swap` no código:
  - Sem a instrução em hardware: cada swap vira 3 instruções. Tempo relativo $= (1 - p + 3p) \times 1.0 = (1 + 2p)$.
  - Com a instrução em hardware: 1 instrução por swap, mas relógio $10\%$ mais lento ($1.10$). Tempo relativo $= 1 \times 1.10 = 1.10$.
  - Para a melhoria valer a pena ($T_{\text{novo}} \le T_{\text{antigo}}$):
    $$1.10 \le 1 + 2p \implies 2p \ge 0.10 \implies \mathbf{p \ge 0.05 \quad (5\%)}$$
- Se mais de $5\%$ das instruções forem `swap`, vale a pena implementar em hardware.

---

## Exercício 5.29: Falhas Presas no Processador Multiciclo (Slide 52)

### a) `IRWrite = 0` (Preso em 0)
- O registrador de instruções (`IR`) nunca carrega uma nova instrução na fase de busca (Passo 1).
- **Consequência:** O processador executará repetidamente a primeira instrução para sempre, travando a máquina.

### b) `PCWrite = 0` (Preso em 0)
- O PC nunca é atualizado na busca (`PC = PC + 4`) nem em instruções de `jump`.
- **Consequência:** A máquina nunca avança para as próximas instruções sequenciais.

### c) `PCWriteCond = 0` (Preso em 0)
- Desvios condicionais (`beq`) nunca conseguem atualizar o PC quando a condição for verdadeira.
- **Consequência:** Loops e estruturas `if-else` não desviam nunca.

---

## Exercício 5.49 & 5.50: Exceções e Instrução `eret` (Slide 53)
- **`eret` (Exception Return):** Restaura a execução do programa de usuário após o Sistema Operacional tratar a interrupção.
- **Ação no Datapath:**
  $$\text{PC} \leftarrow \text{EPC}$$
  E restaura o modo de usuário nos bits de status da CPU.
- Para suportar `eret` no caminho de dados:
  - Conecta-se a saída do registrador `EPC` como uma das entradas do multiplexador de entrada do PC.
  - A unidade de controle ativa a seleção correspondente no MUX do PC e ativa `PCWrite = 1`.
