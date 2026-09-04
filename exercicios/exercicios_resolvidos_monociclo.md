# Exercícios Resolvidos: MIPS Monociclo

Gabarito comentado passo a passo dos exercícios presentes nos slides de aula do material `mono.pdf` (extraídos do livro *Organização e Projeto de Computadores*, Patterson & Hennessy).

---

## Exercício 4.1 (Slide 26 de `mono.pdf`)
Considere a seguinte instrução:
```assembly
AND Rd, Rs, Rt
# Interpretação: Reg[Rd] = Reg[Rs] AND Reg[Rt]
```

### 4.1.1 Quais são os valores dos sinais de controle gerados pela unidade de controle?
Como `AND` é uma instrução típica do formato R (`opcode = 000000`, `funct = 100100`):
- **`RegDst` = 1** (o registrador de destino é o campo `rd`, bits 15:11).
- **`ALUSrc` = 0** (a 2ª entrada da ULA vem do registrador `rt` / `Read data 2`, e não do imediato).
- **`MemtoReg` = 0** (o dado gravado no registrador vem da saída da ULA).
- **`RegWrite` = 1** (habilita a escrita do resultado no banco de registradores).
- **`MemRead` = 0** (não há leitura da memória de dados).
- **`MemWrite` = 0** (não há escrita na memória de dados).
- **`Branch` = 0** (não é instrução de desvio).
- **`ALUOp` = 10** (indica à ULA Control para inspecionar os bits de `funct` e configurar a operação lógica AND).
- **`Jump` = 0** (não é salto incondicional).

### 4.1.2 Quais recursos (blocos) realizam uma função útil para esta instrução?
1. **Memória de Instruções:** Lê a instrução no endereço `PC`.
2. **Somador do PC:** Calcula `PC + 4`.
3. **Controle Principal & ALU Control:** Decodificam o opcode e funct, gerando os sinais.
4. **Banco de Registradores:** Lê `Reg[Rs]` e `Reg[Rt]`, e mais tarde grava o resultado em `Reg[Rd]`.
5. **MUX do RegDst:** Roteia os bits `[15:11]` para a entrada de escrita.
6. **MUX do ALUSrc:** Roteia `Read data 2` para a entrada inferior da ULA.
7. **ULA:** Executa a operação lógica bit a bit `AND`.
8. **MUX do MemtoReg:** Roteia o resultado da ULA de volta para `Write data` dos registradores.
9. **MUX do Branch:** Repassa `PC + 4` para a entrada do registrador PC.

### 4.1.3 Quais recursos produzem saídas, mas suas saídas NÃO são utilizadas? E quais recursos não produzem saídas?
- **Produzem saídas não utilizadas:**
  - **Extensor de Sinal (Sign-extend):** Estende os 16 bits inferiores, mas a saída é bloqueada pelo MUX `ALUSrc` (pois `ALUSrc = 0`).
  - **Somador de Branch:** Calcula o endereço de branch `(PC+4) + offset`, mas a saída é descartada no MUX do Branch (pois `PCSrc = 0`).
  - **Flag Zero da ULA:** Produz sinal `0` ou `1`, mas a porta AND de branch o bloqueia porque `Branch = 0`.
  - **Memória de Dados:** Com `MemRead = 0` e `MemWrite = 0`, a memória de dados fica inativa (ou sua leitura é flutuante e descartada no MUX `MemtoReg`).
- **Não produzem saídas úteis:**
  - A Memória de Dados (não sofre escrita nem leitura válida).

---

## Exercício 4.2 (Slide 27 de `mono.pdf`)
Considere adicionar a instrução:
```assembly
LWI Rt, Rd(Rs)
# Interpretação: Reg[Rt] = Mem[Reg[Rd] + Reg[Rs]]
```
*(Load Word com deslocamento vindo de registrador em vez de imediato).*

### 4.2.1 Quais blocos existentes (se houver) podem ser usados para esta instrução?
- **PC e Somador PC+4:** Usados normalmente para busca da instrução.
- **Memória de Instruções:** Para buscar a instrução de 32 bits.
- **Memória de Dados:** Para ler a palavra na posição de memória calculada.
- **Banco de Registradores:** Para ler os registradores fonte e escrever no registrador destino.
- **ULA:** Para somar os conteúdos dos dois registradores `Reg[Rd] + Reg[Rs]`.

### 4.2.2 Quais novos blocos funcionais (se houver) são necessários para esta instrução?
1. **Banco de Registradores:** O banco de registradores padrão possui apenas duas portas de leitura (`Read register 1` e `Read register 2`). Em uma instrução comum, lemos `rs` (`[25:21]`) e `rt` (`[20:16]`). 
   - No `LWI`, precisamos ler `Rs` e **`Rd`** (`[15:11]`), enquanto `Rt` (`[20:16]`) é o destino da escrita!
   - Portanto, precisamos de um **novo multiplexador de 2 para 1** antes da porta `Read register 2`, para escolher entre `rt` (`[20:16]`) e `rd` (`[15:11]`).
2. Alternativamente, se o banco tivesse 3 portas de leitura, não precisaria de MUX, mas no datapath padrão MIPS, adicionar esse multiplexador de seleção de endereço de leitura resolve sem duplicar o banco de registradores.

### 4.2.3 Quais novos sinais de controle precisamos da unidade de controle para suportar esta instrução?
1. **Novo sinal de controle `ReadReg2Src`:** Controla o novo MUX na entrada de `Read register 2` (seleciona `rt` para instruções normais ou `rd` para `LWI`).
2. Sinais existentes reconfigurados:
   - `ALUSrc = 0` (usa `Read data 2`, que contém `Reg[Rd]`, somando com `Reg[Rs]`).
   - `ALUOp = 00` (soma de endereço).
   - `MemRead = 1` (lê da memória de dados).
   - `MemWrite = 0`.
   - `MemtoReg = 1` (dado vem da memória para os registradores).
   - `RegDst = 0` (destino da escrita é `rt`).
   - `RegWrite = 1` (grava na memória de registradores).

---

## Exercício 4.3 (Slide 28 de `mono.pdf`)
Considere as latências:
- I-Mem: $400\text{ ps}$
- Add: $100\text{ ps}$
- Mux: $30\text{ ps}$
- ALU: $120\text{ ps}$
- Regs: $200\text{ ps}$
- D-Mem: $350\text{ ps}$
- Control: $100\text{ ps}$

Adicionar um multiplicador à ULA adiciona $+300\text{ ps}$ à latência da ULA (nova latência da ULA = $120 + 300 = 420\text{ ps}$) e reduz em $5\%$ as instruções ($N_{\text{novo}} = 0.95 \times N_{\text{antigo}}$).

### 4.3.1 Qual o tempo de ciclo com e sem a melhoria?
- **Sem melhoria ($T_{\text{antigo}}$):**
  Caminho crítico (`lw`):
  $$T_{\text{antigo}} = t_{\text{I-Mem}} + t_{\text{Regs}} + t_{\text{ALU}} + t_{\text{D-Mem}} + t_{\text{Mux}} = 400 + 200 + 120 + 350 + 30 = \mathbf{1100\text{ ps}}$$
- **Com melhoria ($T_{\text{novo}}$):**
  $$T_{\text{novo}} = 400 + 200 + 420 + 350 + 30 = \mathbf{1400\text{ ps}}$$

### 4.3.2 Qual o speedup alcançado?
$$\text{Speedup} = \frac{T_{\text{CPU, antigo}}}{T_{\text{CPU, novo}}} = \frac{N \times 1 \times 1100\text{ ps}}{(0.95 \times N) \times 1 \times 1400\text{ ps}} = \frac{1100}{1330} \approx \mathbf{0.827}$$
*(Como Speedup < 1, o sistema teve uma desaceleração de aproximadamente 17.3%).*

---

## Exercício 4.4 (Slide 29 de `mono.pdf`)
Tabela de latências dos blocos:
| I-Mem | Add | Mux | ALU | Regs | D-Mem | Sign-Extend | Shift-Left-2 |
| :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: |
| 200ps | 70ps | 20ps | 90ps | 90ps | 250ps | 15ps | 10ps |

### 4.4.1 Se o processador apenas buscasse instruções consecutivas, qual seria o ciclo de relógio?
Caminho apenas de busca: PC $\rightarrow$ I-Mem e PC $\rightarrow$ Add (PC+4) $\rightarrow$ Mux $\rightarrow$ PC.
- Caminho da memória de instrução: $200\text{ ps}$.
- Caminho do somador de PC: $70\text{ ps (Add)} + 20\text{ ps (Mux)} = 90\text{ ps}$.
- Como a memória demora mais:
  $$T_{\text{ciclo}} = \max(t_{\text{I-Mem}}, t_{\text{Add}} + t_{\text{Mux}}) = \max(200, 90) = \mathbf{200\text{ ps}}$$

### 4.4.2 Datapath para desvio incondicional relativo ao PC:
Caminho do endereço de desvio:
$\text{I-Mem} \rightarrow \text{Sign-Extend} \rightarrow \text{Shift-Left-2} \rightarrow \text{Add (Branch)} \rightarrow \text{Mux} \rightarrow \text{PC}$
$$T_{\text{desvio}} = 200\text{ (I-Mem)} + 15\text{ (SignExt)} + 10\text{ (Shift)} + 70\text{ (Add)} + 20\text{ (Mux)} = \mathbf{315\text{ ps}}$$

### 4.4.3 Se suportar desvios condicionais (BEQ):
No `beq`, além do cálculo do endereço de salto ($315\text{ ps}$), é preciso comparar os registradores na ULA:
$$\text{Caminho de Comparação} = 200\text{ (I-Mem)} + 90\text{ (Regs)} + 90\text{ (ALU Zero)} + 20\text{ (Mux)} = \mathbf{400\text{ ps}}$$
Como $400\text{ ps} > 315\text{ ps}$, o ciclo de relógio deve ser de no mínimo **$400\text{ ps}$**.
