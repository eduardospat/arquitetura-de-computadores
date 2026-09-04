# Resumo 04: Fórmulas e Cálculos de Desempenho (Mono vs Multiciclo)

Este documento reúne todas as equações matemáticas, regras de dimensionamento de clock e exemplos numéricos que caem nas questões de cálculo da **Prova 1**.

---

## 1. Equação Fundamental do Desempenho da CPU

$$T_{\text{CPU}} = N \times \text{CPI} \times T_{\text{clk}} = \frac{N \times \text{CPI}}{f_{\text{clk}}}$$

Onde:
- $T_{\text{CPU}}$: Tempo de execução do programa (em segundos).
- $N$ (*Instruction Count*): Número total de instruções executadas pelo programa dinamicamente.
- $\text{CPI}$ (*Cycles Per Instruction*): Média de ciclos de relógio necessários por instrução.
- $T_{\text{clk}}$ (*Clock Period*): Período do ciclo de relógio (em segundos, ns, ps).
- $f_{\text{clk}}$ (*Clock Rate / Frequência*): $f = \frac{1}{T_{\text{clk}}}$ (em Hz, MHz, GHz).

---

## 2. Cálculo do CPI Médio Ponderado (Multiciclo)

Como cada tipo de instrução leva um número distinto de ciclos no processador multiciclo, calculamos a média ponderada pela frequência relativa (mix) de cada instrução:

$$\text{CPI}_{\text{médio}} = \sum_{i=1}^{k} \left( \text{Frequência}_i \times \text{CPI}_i \right)$$

Onde $\sum \text{Frequência}_i = 100\% = 1.0$.

### Ciclos Padrão no MIPS Multiciclo:
- **`lw` (Load):** 5 ciclos (Busca $\rightarrow$ Decod $\rightarrow$ Endereço $\rightarrow$ Memória $\rightarrow$ WriteBack)
- **`sw` (Store):** 4 ciclos (Busca $\rightarrow$ Decod $\rightarrow$ Endereço $\rightarrow$ Memória)
- **Tipo R (add, sub...):** 4 ciclos (Busca $\rightarrow$ Decod $\rightarrow$ ULA $\rightarrow$ WriteBack)
- **`beq` (Branch):** 3 ciclos (Busca $\rightarrow$ Decod $\rightarrow$ Decisão de Salto)
- **`j` (Jump):** 3 ciclos (Busca $\rightarrow$ Decod $\rightarrow$ Atualiza PC)

---

## 3. Exemplo Prático Clássico (Slide 27 e 28 do Material de Multiciclo)

### Dados:
- Atraso de acesso à memória: $1.0\text{ ns}$
- Atraso do banco de registradores: $0.5\text{ ns}$
- Atraso da ULA: $0.5\text{ ns}$
- Somadores: $0.3\text{ ns}$
- Demais blocos (MUX, portas): $0\text{ ns}$
- Mix do GCC:
  - $22\%$ loads
  - $11\%$ stores
  - $49\%$ tipo R
  - $16\%$ branches
  - $2\%$ jumps

### Passo 1: Tempo de Ciclo no Monociclo
No monociclo, o ciclo é o caminho crítico da instrução mais longa (`lw`):
$$T_{\text{mono}} = 1.0\text{ (I-Mem)} + 0.5\text{ (Regs)} + 0.5\text{ (ALU)} + 1.0\text{ (D-Mem)} + 0.5\text{ (RegWrite)} = \mathbf{3.5\text{ ns}}$$
$$f_{\text{mono}} = \frac{1}{3.5\text{ ns}} \approx \mathbf{285.7\text{ MHz}}$$
$$\text{CPI}_{\text{mono}} = 1.0$$
$$T_{\text{CPU, mono}} = N \times 1.0 \times 3.5\text{ ns} = \mathbf{3.5 \times 10^{-9} \times N\text{ s}}$$

### Passo 2: Tempo de Ciclo no Multiciclo (Versão 1 GHz)
No multiciclo, o ciclo de relógio é limitado pelo **estágio individual mais lento**.
- Acesso à memória = $1.0\text{ ns}$
- Acesso ao banco de registradores = $0.5\text{ ns}$
- Operação na ULA = $0.5\text{ ns}$
- Logo: $T_{\text{multi}} = \max(1.0, 0.5, 0.5) = \mathbf{1.0\text{ ns}} \implies f = \mathbf{1\text{ GHz}}$.

Cálculo do $\text{CPI}_{\text{médio}}$:
$$\text{CPI} = (0.22 \times 5) + (0.11 \times 4) + (0.49 \times 4) + (0.16 \times 3) + (0.02 \times 3)$$
$$\text{CPI} = 1.10 + 0.44 + 1.96 + 0.48 + 0.06 = \mathbf{4.04}$$

Tempo de execução no multiciclo (1 GHz):
$$T_{\text{CPU, multi (1 GHz)}} = N \times 4.04 \times 1.0\text{ ns} = \mathbf{4.04 \times 10^{-9} \times N\text{ s}}$$
*(Neste caso particular, o monociclo foi mais rápido porque o acesso à memória de 1 ns penalizou todas as etapas rápidas de 0.5 ns).*

### Passo 3: Otimização do Multiciclo com Memória em 2 Ciclos (Versão 2 GHz)
E se dividirmos o acesso à memória em **2 ciclos de relógio de $0.5\text{ ns}$ cada**?
- Novo período de relógio: $T_{\text{multi}} = \mathbf{0.5\text{ ns}} \implies f = \mathbf{2\text{ GHz}}$.
- Novo número de ciclos por instrução:
  - `lw`: precisa de 2 ciclos para busca da instrução + 1 decod + 1 ULA + 2 ciclos para leitura de dados + 1 regwrite = **7 ciclos**.
  - `sw`: precisa de 2 ciclos para busca + 1 decod + 1 ULA + 2 ciclos para escrita de dados = **6 ciclos**.
  - Tipo R: 2 ciclos para busca + 1 decod + 1 ULA + 1 regwrite = **5 ciclos**.
  - `beq`: 2 ciclos para busca + 1 decod + 1 branch = **4 ciclos**.
  - `jump`: 2 ciclos para busca + 1 decod + 1 jump = **4 ciclos**.

Novo $\text{CPI}_{\text{médio}}$:
$$\text{CPI} = (0.22 \times 7) + (0.11 \times 6) + (0.49 \times 5) + (0.18 \times 4)$$
$$\text{CPI} = 1.54 + 0.66 + 2.45 + 0.72 = \mathbf{5.37}$$

Novo tempo de CPU:
$$T_{\text{CPU, multi (2 GHz)}} = N \times 5.37 \times 0.5\text{ ns} = \mathbf{2.685 \times 10^{-9} \times N\text{ s}}$$

### Passo 4: Cálculo do Speedup (Ganho de Desempenho)
$$\text{Speedup} = \frac{T_{\text{CPU, mono}}}{T_{\text{CPU, multi (2 GHz)}}} = \frac{3.5 \times 10^{-9} \times N}{2.685 \times 10^{-9} \times N} \approx \mathbf{1.303} \quad (30.3\%\text{ mais rápido!})$$

---

## 4. Exercício 4.3 (Patterson & Hennessy) — Trade-Off de Adicionar Multiplicador

### Enunciado Resumido:
- Latências originais:
  - I-Mem = $400\text{ ps}$
  - Add = $100\text{ ps}$
  - Mux = $30\text{ ps}$
  - ALU = $120\text{ ps}$
  - Regs = $200\text{ ps}$
  - D-Mem = $350\text{ ps}$
  - Control = $100\text{ ps}$
- Proposta de melhoria: Adicionar um circuito multiplicador integrado à ULA.
  - Isso aumenta a latência da ULA em $+300\text{ ps}$ (nova latência = $120 + 300 = 420\text{ ps}$).
  - Isso reduz o total de instruções executadas em $5\%$ ($N_{\text{novo}} = 0.95 \times N_{\text{antigo}}$), pois não precisa mais emular multiplicação por software.

### Resolução:
1. **Tempo de ciclo sem melhoria:**
   $$T_{\text{antigo}} = t_{\text{I-Mem}} + t_{\text{Regs}} + t_{\text{ALU}} + t_{\text{D-Mem}} + t_{\text{Mux}} + t_{\text{Regs(setup)}}$$
   $$T_{\text{antigo}} = 400 + 200 + 120 + 350 + 30 = \mathbf{1100\text{ ps}}$$

2. **Tempo de ciclo com melhoria:**
   $$T_{\text{novo}} = 400 + 200 + 420 + 350 + 30 = \mathbf{1400\text{ ps}}$$

3. **Speedup obtido:**
   $$\text{Speedup} = \frac{T_{\text{antigo total}}}{T_{\text{novo total}}} = \frac{N_{\text{antigo}} \times \text{CPI} \times 1100\text{ ps}}{0.95 \times N_{\text{antigo}} \times \text{CPI} \times 1400\text{ ps}} = \frac{1100}{0.95 \times 1400} = \frac{1100}{1330} \approx \mathbf{0.827}$$
   > **Conclusão:** O speedup foi $< 1$ (ou seja, o processador ficou **$17.3\%$ mais lento**). A melhoria **não** vale a pena!

---

## 5. Exercícios do Slide 54 (Multiciclo)

1. **Questão 1:** Programa com $20\%$ memória, $30\%$ desvios e $50\%$ aritméticas, com custos em ciclos de 5, 3 e 2, respectivamente. Qual o CPI médio?
   $$\text{CPI} = (0.20 \times 5) + (0.30 \times 3) + (0.50 \times 2) = 1.0 + 0.9 + 1.0 = \mathbf{2.9}$$

2. **Questão 2:** Conseguiu-se reduzir o custo de desvios para 1 ciclo. Qual o novo CPI?
   $$\text{CPI}_{\text{novo}} = (0.20 \times 5) + (0.30 \times 1) + (0.50 \times 2) = 1.0 + 0.3 + 1.0 = \mathbf{2.3}$$

3. **Questão 3:** O preço para reduzir o desvio foi um aumento de $20\%$ no ciclo de relógio ($T_{\text{novo}} = 1.2 \times T_{\text{antigo}}$). Qual o ganho em tempo final?
   $$\frac{T_{\text{novo}}}{T_{\text{antigo}}} = \frac{N \times 2.3 \times (1.2 \times T_{\text{antigo}})}{N \times 2.9 \times T_{\text{antigo}}} = \frac{2.76}{2.9} \approx \mathbf{0.9517}$$
   $$\text{Speedup} = \frac{1}{0.9517} \approx \mathbf{1.0507} \quad (\mathbf{5.07\%\text{ de ganho de desempenho}})$$
