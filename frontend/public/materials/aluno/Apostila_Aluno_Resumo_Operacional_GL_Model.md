# Apostila do Aluno - Resumo Operacional GL Model

> Material educacional. Trading envolve risco financeiro real. Este material não é recomendação individual, sinal automático, promessa de lucro ou garantia de aprovação em mesa proprietária.

## 1. A Frase Central

Antes de qualquer entrada, escreva mentalmente:

```text
Neste regime,
nesta zona,
este fluxo confirma esta tese,
com esta invalidação,
e este alvo.
```

Se você não consegue preencher essa frase, ainda não existe trade.

## 2. Ordem da Decisão

1. Contexto: que tipo de dia é?
2. Mapa: onde estão POC, VAH, VAL, HVN, LVN, IB, AVWAP e Gamma?
3. Zona: o preço está em região de decisão ou no meio do valor?
4. Família operacional: Edge, Abs/FA, Breakout ou Reteste?
5. Confirmação: Order Flow confirma ou nega?
6. Invalidação: onde a tese morre?
7. Alvo: onde faz sentido realizar?

## 3. Conceitos Essenciais

### POC

Centro de gravidade do volume. Em dias rotacionais, costuma virar alvo natural.

### VAH e VAL

Bordas da área de valor. Podem gerar rejeição, aceitação, breakout, failure auction ou reteste.

### HVN

Região de alta negociação. Representa memória de aceitação. As bordas do HVN são mais importantes do que o meio.

### LVN

Região de baixa negociação. Pode virar vazio de aceleração, alvo de Repair/Rebalance ou zona de falha.

### IB

Faixa inicial do pregão regular. IBH é a máxima do bloco inicial; IBL é a mínima. Aceitação fora da IB pode favorecer expansão. Falha fora da IB pode favorecer retorno para dentro.

## 4. As 4 Famílias Operacionais

### 1. Edge HVN

Usar quando o preço chega na borda de uma HVN ou acumulação.

Compra:

- preço testa fundo da HVN;
- rejeita abaixo;
- volta para dentro;
- fluxo confirma defesa.

Venda:

- preço testa topo da HVN;
- rejeita acima;
- volta para dentro;
- fluxo confirma perda de eficiência compradora.

Invalidação:

- atrás da borda;
- atrás do pavio de rejeição;
- atrás da absorção;
- ou atrás do leilão anterior aceito.

Alvos:

- POC;
- meio da HVN;
- VAH/VAL;
- borda oposta;
- LVN;
- AVWAP relevante.

Erro fatal: operar no meio da HVN.

### 2. Absorção / Failure Auction

Usar quando o preço tenta romper uma região, varre liquidez e não aceita fora.

Sinais:

- sweep acima ou abaixo;
- agressão forte sem progresso;
- retorno para dentro da região;
- agressor preso.

Invalidação:

- se o preço aceita fora da região varrida.

Alvos:

- retorno à VAH/VAL;
- POC;
- borda oposta;
- HVN anterior.

### 3. Breakout com Aceitação

Usar quando o preço rompe uma região e constrói valor fora.

Sinais:

- rompimento de VAH/VAL, HVN, IB ou LVN;
- aceitação fora;
- continuidade;
- volume/fluxo a favor;
- reteste segurando o nível.

Invalidação:

- se o preço volta e aceita dentro do valor antigo.

Alvos:

- próximo LVN;
- topo/fundo da IB;
- próxima HVN;
- Call Wall ou Put Wall;
- região de Gamma.

### 4. Reteste / Pullback

Usar quando um nível já foi aceito e vira defesa.

Sinais:

- rompimento anterior aceito;
- retorno ao nível;
- contra-agressão falha;
- fluxo volta a favor da tese.

Invalidação:

- perda do nível aceito;
- retorno ao leilão anterior.

Alvos:

- próxima liquidez;
- LVN;
- HVN seguinte;
- IB;
- Wall relevante.

## 5. As 8 Leituras do HUD

As oito leituras não são oito setups independentes. Elas são diagnósticos que se encaixam nas quatro famílias.

| Leitura | Significado | Conduta |
|---|---|---|
| Edge | Defesa de borda | Esperar rejeição e retorno |
| Abs/FA | Falha de rompimento | Procurar agressor preso |
| Break | Aceitação fora | Esperar continuidade ou reteste |
| Reteste | Nível aceito vira defesa | Operar a favor se fluxo confirmar |
| VA80 | Retorno para dentro da Value Area | Alvos em POC e borda oposta |
| IB | Faixa inicial do dia | Breakout, FA ou espera |
| Repair/Rebalance | Reparo de vazio/LVN | Tratar vazio como alvo primeiro |
| AVWAP | Custo institucional | Defesa ou perda de custo |

## 6. Repair/Rebalance

Repair/Rebalance acontece quando o mercado deixou uma região com pouca negociação e depois volta para reparar essa área.

O gráfico geralmente mostra:

- deslocamento rápido;
- LVN;
- single prints;
- pouca negociação entre dois valores;
- retorno buscando reequilíbrio.

Três cenários:

1. Repair completo: preço atravessa o vazio e alcança o HVN/valor anterior.
2. Repair parcial: preço repara parte do vazio e volta a expandir.
3. Repair falha: preço entra no vazio, rejeita e retorna para a origem.

Regra prática:

> O vazio é alvo antes de ser entrada. Procure origem defensável, confirmação por fluxo e invalidação clara.

## 7. Stop Técnico e Invalidação

O stop não deve ser um número aleatório. Ele deve ficar onde a tese morre.

Exemplos:

- compra em fundo HVN: abaixo da borda, pavio ou absorção;
- venda em topo HVN: acima da borda, pavio ou failure auction;
- breakout: atrás do nível aceito;
- reteste: atrás da defesa;
- Gamma: atrás da Wall/fronteira somente quando há confluência com o leilão;
- leilão anterior: se o preço expande, não deveria voltar para dentro do valor antigo.

## 8. Quando Não Operar

Recuse o trade quando:

- preço está no meio da HVN;
- não existe borda;
- o alerta tocou, mas o contexto não confirmou;
- fluxo aparece fora da zona;
- Gamma está isolado;
- stop técnico não cabe;
- alvo não paga o risco;
- notícia macro muda a liquidez;
- você não consegue formar a frase operacional.

## 9. Rotina Diária

Antes do pregão:

- revisar agenda macro;
- marcar POC, VAH, VAL, HVN, LVN;
- identificar IB quando formar;
- marcar AVWAPs relevantes;
- revisar Gamma, se houver dados;
- definir cenários de aceitação e rejeição;
- escolher operacionais preferenciais.

Durante:

- esperar preço chegar na zona;
- ler HUD;
- confirmar com fluxo;
- definir invalidação;
- executar ou recusar.

Depois:

- salvar print antes/depois;
- registrar tese;
- registrar erro;
- revisar se o trade seguiu o plano.

