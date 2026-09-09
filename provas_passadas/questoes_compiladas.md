# Questões das provas passadas de Arquitetura de Computadores

UFSM, Departamento de Eletrônica e Computação. Avaliação 1, professor Mateus Beck Rutzig.

Compilação dos enunciados impressos presentes nos arquivos desta pasta. As respostas manuscritas, notas e correções não foram transcritas. Tabelas de resposta foram deixadas em branco. A formatação e a pontuação foram ajustadas para leitura, preservando números, operações e condições dos exercícios.

Os conjuntos A, B, C e D identificam as fontes, sem atribuir datas de aplicação. Há 14 questões. Os diagramas são indicados por uma descrição de uma linha.

| Conjunto | Fonte | Questões |
|---|---|---|
| A | `1.jpeg` | A1 a A3 |
| B | `IMG_20230117_095147.jpg` e `IMG_20230117_095209.jpg` | B1 a B5 |
| C | `IMG_5960.jpeg` e `IMG_5961.jpeg` | C1 a C3 |
| D | `mono e multi prova.pdf`, páginas 1 e 2 | D1 a D3 |

## Conjunto A

Fonte: `1.jpeg`.

### A1. Tempo de execução

Questão 1, 1,5 ponto.

Considerando um programa que tenha as estatísticas mostradas na tabela abaixo e execute 750 milhões de instruções, encontre o tempo de execução deste programa nos processadores abaixo.

| TIPO R | BEQ | LW | SW |
|---|---|---|---|
| 45% | 20% | 20% | 15% |

a. MIPS Multiciclo, 333 MHz, considerando a máquina de estados ilustrada na última folha da prova.

b. MIPS Monociclo, 1,5 GHz.

Nota da compilação: a última folha mencionada não está identificada entre os arquivos deste conjunto. Não foi substituída por uma FSM de outra prova.

### A2. Sinais de controle no monociclo

Questão 2, 2,0 pontos.

Descreva o efeito causado ao executar as instruções abaixo no MIPS Monociclo com os sinais de controle nos valores demonstrados. Preencha a tabela abaixo mostrando quais instruções continuam funcionando, ou não, para cada uma das situações separadamente.

**Add**

| Sinal imposto | Funciona? Sim ou não | Por quê? |
|---|---|---|
| RegDst = 1 | | |
| MemtoReg = 1 | | |
| AluSrc = 1 | | |

**Beq**

| Sinal imposto | Funciona? Sim ou não | Por quê? |
|---|---|---|
| RegDst = 1 | | |
| MemtoReg = 1 | | |
| AluSrc = 1 | | |

### A3. Sinais no quarto ciclo do multiciclo

Questão 3, 2,0 pontos.

Descreva o efeito causado ao executar as instruções abaixo no MIPS Multiciclo com os sinais de controle nos valores demonstrados no **QUARTO ciclo** de execução da instrução. Preencha a tabela abaixo mostrando quais instruções continuam funcionando, ou não, para cada uma das situações separadamente.

**Lw**

| Sinal imposto | Funciona? Sim ou não | Por quê? |
|---|---|---|
| RegDst = 0 | | |
| MemtoReg = 1 | | |
| IorD = 1 | | |
| AluSrcB = 11 | | |

**Add**

| Sinal imposto | Funciona? Sim ou não | Por quê? |
|---|---|---|
| RegDst = 0 | | |
| MemtoReg = 0 | | |
| IorD = 1 | | |
| AluSrcB = 10 | | |

## Conjunto B

Fontes: `IMG_20230117_095147.jpg`, questões 1 a 4, e `IMG_20230117_095209.jpg`, questão 5.

### B1. Tempo de execução

Questão 1, 1,0 ponto.

Considerando um programa que tenha as estatísticas mostradas na tabela abaixo e execute 1.300.000 instruções, encontre o tempo de execução deste programa nos processadores abaixo.

| ALU | BEQ | LW | ST |
|---|---|---|---|
| 45% | 19% | 25% | 11% |

a. MIPS Multiciclo, 700 MHz.

b. MIPS Monociclo, 2,5 GHz.

Nota da compilação: a tabela original usa a sigla `ST`.

### B2. Sinais de controle de BEQ no monociclo

Questão 2, 1,0 ponto.

Descreva o efeito causado ao executar as instruções abaixo no MIPS Monociclo com os sinais de controle nos valores demonstrados. Preencha a tabela abaixo mostrando quais instruções continuam funcionando, ou não, para cada uma das situações separadamente.

**BEQ**

| Sinal imposto | Funciona? Sim ou não | Por quê? |
|---|---|---|
| RegDst = 0 | | |
| MemtoReg = 0 | | |
| AluSrc = 0 | | |

### B3. Sinais de LW no quarto ciclo do multiciclo

Questão 3, 1,0 ponto.

Descreva o efeito causado ao executar as instruções abaixo no MIPS Multiciclo com os sinais de controle nos valores demonstrados no **QUARTO ciclo** de execução da instrução. Preencha a tabela abaixo mostrando quais instruções continuam funcionando, ou não, para cada uma das situações separadamente.

**LW**

| Sinal imposto | Funciona? Sim ou não | Por quê? |
|---|---|---|
| RegDst = 0 | | |
| MemtoReg = 0 | | |
| IorD = 0 | | |
| AluSrcA = 0 | | |

### B4. Implementação de ADDI no monociclo

Questão 4, 3,5 pontos.

Explique e desenhe as modificações no datapath e forneça os sinais de controle para executar a instrução `ADDI RT, RS, #IMED` no MIPS Monociclo. A instrução ADDI é do tipo I e realiza a seguinte operação:

```text
RT ← RS + IMED
```

Imagem: datapath MIPS monociclo com unidade de controle, sinais de controle e caminho de jump.

### B5. Implementação de SWAP no multiciclo

Questão 5, 3,5 pontos.

Explique e desenhe as modificações no datapath e forneça os sinais de controle de **CADA CICLO** para executar a instrução `SWAP RT, RS` no MIPS Multiciclo. A instrução SWAP é do tipo R e realiza a troca do conteúdo dos registradores RS e RT.

Imagem: datapath MIPS multiciclo com sinais de controle e máquina de estados de 0 a 9.

## Conjunto C

Fontes: `IMG_5960.jpeg`, questões 1 e 2, e `IMG_5961.jpeg`, questão 3.

### C1. Load com pós-incremento no monociclo

Questão 1, 3,5 pontos.

Explique e desenhe as modificações no datapath e forneça os sinais de controle para executar a instrução Load com pós-incremento `LWPI RT, RS, IMED` no MIPS Monociclo. A instrução LWPI é do tipo I e realiza as seguintes operações na mesma instrução:

```text
RT ← MEM[RS + (IMED)32]  // acesso à memória idêntico ao load
RS ← RS + 4             // soma da base com o valor 4 e escrita em RS do valor atualizado
```

Imagem: datapath MIPS monociclo com unidade de controle, sinais de controle e caminho de jump.

### C2. Remoção de registradores do multiciclo

Questão 2, 3,0 pontos.

Verifique as seguintes situações no MIPS multiciclo:

**a. Caso o registrador ALUOut seja removido do processador:**

1. Qual seria o caminho dos dados do terceiro ciclo da instrução SW?
2. Seguindo os tempos de propagação vistos em aula, `ALU = 0,5 ns`, `MEM = 1,0 ns`, `BR = 0,5 ns` e `Restante = 0 ns`, qual seria o caminho crítico do processador? Qual seria a frequência de operação?

**b. Caso os registradores A e B fossem removidos do processador:**

1. Quantos ciclos a instrução Jump levaria? E a instrução ADD?
2. Seguindo os tempos de propagação vistos em aula, `ALU = 0,5 ns`, `MEM = 1,0 ns`, `BR = 0,5 ns` e `Restante = 0 ns`, qual seria o caminho crítico do processador? Qual seria a frequência de operação?

**c. Caso os registradores ALUOut e Memory Data Register fossem removidos do processador:**

1. Quantos ciclos a instrução BEQ levaria? E a instrução LW?
2. Seguindo os tempos de propagação vistos em aula, `ALU = 0,5 ns`, `MEM = 1,0 ns`, `BR = 0,5 ns` e `Restante = 0 ns`, qual seria o caminho crítico do processador? Qual seria a frequência de operação?

### C3. Implementação de SWAP no multiciclo

Questão 3, 3,5 pontos.

Explique e desenhe as modificações no datapath e forneça os sinais de controle de **CADA CICLO** para executar a instrução `SWAP RT, RS` no MIPS Multiciclo. A instrução SWAP é do tipo R e realiza a troca do conteúdo dos registradores RS e RT.

Imagem: datapath MIPS multiciclo com sinais de controle e máquina de estados de 0 a 9.

Nota da compilação: o enunciado se repete em B5, mas foi mantido por pertencer a outra fonte.

## Conjunto D

Fonte: `mono e multi prova.pdf`, páginas 1 e 2.

### D1. Implementação de ADD3 no monociclo

Questão 1, 3,0 pontos. Página 1 do PDF, parte superior.

A instrução `add3`, ao ser incorporada no MIPS, pode aumentar a eficiência do processador pela diminuição no número total de instruções executadas ao desenvolver a soma de 3 operandos. **Desenhe e explique as modificações no datapath** e defina os sinais de controle do MIPS Monociclo para adicionar essa instrução.

```text
add3 $rd, $rs, $rt
rd = rs + rt + rd
```

Imagem: datapath MIPS monociclo com unidade de controle, sinais de controle e caminho de jump.

### D2. Implementação de SUBABS no monociclo

Questão 2, 3,0 pontos. Página 1 do PDF, parte inferior.

Operações com módulo são muito utilizadas em processamento digital de sinais. A instrução `subabs`, ao ser incorporada no MIPS, pode aumentar a eficiência do processador neste tipo de aplicações. **Desenhe e explique as modificações no datapath** e defina os sinais de controle do MIPS Monociclo para adicionar essa instrução.

```text
subabs $rd, $rs, $rt
rd = |rs - rt|
```

Imagem: datapath MIPS monociclo com unidade de controle, sinais de controle e caminho de jump.

### D3. Implementação de ReLU no multiciclo

Questão 3, 4,0 pontos. Página 2 do PDF.

A ReLU é uma abreviação para *rectified linear unit*, ou unidade linear retificada, uma função de ativação largamente utilizada em redes neurais. Ela produz resultados no intervalo `[0, ∞]`. A função ReLU retorna 0 para todos os valores negativos e o próprio valor para valores positivos. **Desenhe e explique as modificações no datapath e na máquina de estados** do MIPS Multiciclo para adicionar essa instrução.

```text
Relu Rs

Se Rs > 0
    Rs = Rs
Senão
    Rs = 0
```

Imagem: datapath MIPS multiciclo com sinais de controle e máquina de estados de 0 a 9.

Nota da compilação: a notação do intervalo acima reproduz o impresso, incluindo o fechamento junto ao infinito.
