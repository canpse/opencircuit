# Roteiros de teste exploratório (agente com computer use)

Estes roteiros são para um agente com controle real de mouse/teclado/tela
(não um script determinístico). Eles existem para complementar a suíte
automatizada (`npm test`; 363 testes determinísticos no baseline inicial da
[issue #100](testing.md#baseline-inicial)) com o que ela
estruturalmente não consegue ver: como o app realmente se comporta na tela,
pra um usuário de verdade.

**Instrução válida para TODOS os roteiros abaixo, sempre:**

> Além dos passos listados, preste atenção em qualquer outra coisa que
> pareça errada, estranha, lenta ou confusa durante o percurso — mesmo que
> não tenha nada a ver com o que o passo pedia pra verificar. Erro no
> console do browser, layout quebrado, botão que deveria estar
> habilitado e não está, texto cortado, animação que trava, o que for.
> Anote tudo isso separado dos resultados esperado/observado de cada passo.

## Preparação (uma vez, antes de qualquer roteiro)

1. No terminal, na raiz do repositório: `npm install` (só se `node_modules`
   não existir) e depois `npm run dev`.
2. O Vite normalmente sobe em `http://localhost:5173`. Se a porta 5173
   estiver ocupada, ele incrementa silenciosamente (5174, 5175...) —
   confirme no output do terminal qual porta está servindo antes de abrir
   o browser.
3. Abra essa URL no browser. É uma SPA (sem login) — a tela inicial já é o
   editor de circuitos.

Ao final de cada roteiro, reporte no formato:

```
## Roteiro N — <nome>
Resultado: OK / achou problema(s)

Passo a passo (esperado vs observado):
- ...

Outras coisas notadas (fora do roteiro):
- ... (ou "nada digno de nota")
```

---

## Roteiro 1 — Montar um circuito combinacional do zero

Objetivo: confirmar que o fluxo básico de "arrastar porta, ligar fio, ver
resultado" funciona de ponta a ponta.

1. Na barra lateral esquerda (biblioteca de componentes), clique em
   **Input** duas vezes, clicando em seguida em dois pontos vazios do
   canvas pra posicionar cada um (clicar no componente da biblioteca
   seleciona a ferramenta; clicar no canvas posiciona).
2. Clique em **AND** na biblioteca e posicione no canvas, à direita dos
   dois Inputs.
3. Clique em **LED** na biblioteca e posicione à direita do AND.
4. Ligue os fios: clique no pino de saída do primeiro Input, depois no
   pino `a` de entrada do AND (não é drag — é clique, depois clique no
   destino). Repita para o segundo Input no pino `b`. Depois ligue a
   saída do AND na entrada do LED.
5. Clique nos dois Inputs (eles alternam ligado/desligado ao clicar) e
   confirme: o LED só acende quando os dois Inputs estão ligados
   (tabela-verdade do AND). Teste as 4 combinações.

**Esperado**: LED acende exatamente quando ambos Inputs estão ligados, e
apaga em qualquer outra combinação. Os fios mudam de aparência
(ativo/inativo) junto com o valor lógico.

---

## Roteiro 2 — Exemplos com clock: o contador realmente conta?

Objetivo: validar visualmente uma correção recente (o clock estava
"esquecendo" de alternar entre ticks, travando qualquer contador depois do
primeiro tick). Esse bug já foi corrigido no código, mas nunca foi
verificado _na tela_ — só por teste automatizado que lê valores
internos, não que olha o app rodando.

No menu **Aulas** (dropdown no topo), carregue cada um destes exemplos, um
de cada vez (carregar um exemplo substitui o conteúdo da aba atual — use
o botão **+** ao lado das abas do documento pra abrir uma aba nova antes
de cada exemplo, se quiser manter os anteriores abertos):

1. **Flip-Flop D básico**
2. **Registrador 4 bits básico**
3. **Contador binário síncrono (8 bits)**
4. **Contador em anel de Johnson (8 bits)**
5. **Ripple counter assíncrono (não funciona)** — atenção: este exemplo é
   **propositalmente** quebrado (é um exemplo pedagógico mostrando por que
   clock assíncrono não funciona nesse simulador). Ele NÃO deve contar
   direito — isso não é bug. O que importa aqui é só confirmar que o
   próprio ícone/sinal do Clock alterna visualmente a cada Tick (isso sim
   seria bug se travasse, é o mesmo problema que já corrigimos).

Para cada exemplo:

- Clique no botão **Tick** umas 8-10 vezes seguidas, observando os LEDs
  (ou o texto do Registrador/Contador) a cada clique.
- Confirme que os valores mudam de forma consistente a cada Tick (para os
  4 primeiros: contando/capturando corretamente; para o Ripple counter:
  pelo menos o Clock alternando visualmente, mesmo que o resultado final
  não seja um contador correto).
- Depois, teste o botão **Rodar clock** (clock automático) por uns
  segundos e clique em **Pausar clock**. Confirme visualmente que os LEDs
  continuam mudando sozinhos enquanto ele roda.

**Esperado**: nenhum dos 5 exemplos trava com os LEDs congelados depois do
primeiro Tick. Os 4 primeiros contam/capturam corretamente; o Ripple
counter é o único que não conta certo, mas o Clock continua alternando.

---

## Roteiro 3 — Subcircuito: criar, copiar e colar entre abas

Objetivo: revalidar visualmente uma correção anterior (copiar um
subcircuito e colar em outra aba/documento perdia a referência interna, e
o componente colado virava uma caixa sem função, sem pinos de verdade).

1. Numa aba nova, monte um circuito pequeno: dois Inputs → um AND → um
   LED (igual ao Roteiro 1, ou reaproveite se já estiver montado).
2. Selecione os 4 componentes (arraste uma caixa de seleção ao redor
   deles, ou clique em cada um segurando Shift).
3. Clique com o botão direito sobre a seleção e escolha **Transformar em
   subcircuito** no menu de contexto. Dê um nome quando pedido.
4. Confirme: a seleção virou uma única caixa retangular no canvas (o
   subcircuito), com pinos de entrada/saída visíveis na borda.
5. Clique na caixa do subcircuito pra selecioná-la, `Ctrl+C` pra copiar.
6. Clique no botão **+** ao lado das abas pra abrir um documento novo.
7. `Ctrl+V` pra colar.
8. No documento novo: confirme que o subcircuito colado tem os mesmos
   pinos visíveis (não virou uma caixa genérica sem pinos chamada
   "Subcircuito"). Ligue Inputs e um LED nos pinos de fora e confirme que
   ele realmente calcula o AND, igual ao original.

**Esperado**: o subcircuito colado funciona de verdade no documento novo,
com os pinos certos, sem precisar recriar nada.

---

## Roteiro 4 — Desfazer/Refazer

Objetivo: confirmar que o histórico de undo/redo acompanha edições
estruturais e também os Ticks de simulação.

1. Num circuito simples com pelo menos um Clock e um Flip-Flop D (pode
   carregar o exemplo **Flip-Flop D básico** pelo menu Aulas), dê **Tick**
   3 vezes.
2. Aperte `Ctrl+Z` (ou clique **Desfazer**) 3 vezes seguidas.
3. Confirme: o estado volta, tick a tick, até o estado inicial (antes do
   primeiro Tick) — não pula direto pro início nem trava no meio.
4. Aperte `Ctrl+Shift+Z` (ou **Refazer**) 3 vezes e confirme que os ticks
   voltam na ordem certa.
5. Agora edite o circuito estruturalmente (mova um componente, adicione
   uma porta nova) e desfaça essa edição com `Ctrl+Z`. Confirme que só a
   edição estrutural foi desfeita, sem bagunçar o estado da simulação.

**Esperado**: undo/redo sempre volta pro estado exatamente anterior/
seguinte, sem pular passos nem misturar edição estrutural com avanço de
tempo.

---

## Roteiro 5 — Salvar, fechar e reabrir

Objetivo: confirmar que o ciclo salvar → reabrir preserva o circuito
inteiro, incluindo qualquer subcircuito e o estado de memória sequencial.

1. Monte (ou carregue) um circuito com pelo menos um subcircuito (reuse
   o do Roteiro 3) e um Flip-Flop/Latch com Tick já avançado algumas
   vezes.
2. No menu **Arquivo**, clique **Salvar** (ou `Ctrl+S`). Dê um nome se
   pedido.
3. Feche a aba do documento (X na aba) ou recarregue a página inteira do
   browser.
4. No menu **Arquivo → Meus circuitos**, reabra o circuito salvo.
5. Confirme: todos os componentes, fios, o subcircuito (com pinos
   funcionando) e os valores dos LEDs voltaram exatamente como estavam
   antes de fechar.

**Esperado**: nada se perde no ciclo salvar/reabrir — nem a topologia, nem
o subcircuito, nem o estado atual da simulação.

---

## Roteiro 6 — Painéis auxiliares: tabela-verdade e forma de onda

Objetivo: confirmar que os painéis de análise refletem o circuito atual e
não travam com circuitos sequenciais.

1. Com um circuito combinacional pequeno (Roteiro 1) aberto, abra a aba
   lateral **Tabela verdade**. Confirme que ela lista todas as
   combinações de entrada e os resultados batem com o que você viu
   clicando nos Inputs manualmente.
2. Agora abra um circuito com Clock (ex.: **Flip-Flop D básico** de novo).
   Confirme que a aba **Tabela verdade** avisa que o circuito tem memória
   (e não tenta mostrar uma tabela sem sentido).
3. Abra o painel **Formas de onda** (ícone/aba correspondente). Dê Tick
   umas 5 vezes e confirme que o painel desenha uma linha do tempo com
   CLK alternando e Q mudando nos momentos certos — não achatado nem
   defasado em relação ao que os LEDs mostram no canvas.

**Esperado**: os dois painéis refletem fielmente o estado real do
circuito, sem travar, sem ficar vazios indevidamente, sem atraso visível
entre os LEDs do canvas e o painel.

---

## Roteiro 7 — Minha biblioteca (componente pessoal entre documentos)

Objetivo: cobrir uma feature inteira (#18 Fase 4) que nunca foi tocada por
nenhum roteiro anterior — salvar um subcircuito na biblioteca pessoal,
inserir em outro documento, editar a entrada e excluir.

1. Numa aba nova, monte um circuito pequeno e transforme em subcircuito
   (passos 1-4 do Roteiro 3).
2. Clique com o botão direito na caixa do subcircuito no canvas e escolha
   **Salvar na biblioteca**. Repita o teste também pelos outros dois
   pontos de entrada, em ocasiões diferentes: o botão da barra
   "Subcircuitos" e o botão direito no card da definição na barra lateral
   esquerda — os três deveriam levar ao mesmo resultado.
3. Abra outro documento (aba **+**, sem esse subcircuito).
4. No menu **Arquivo**, clique **Minha biblioteca**. Confirme que a
   entrada salva aparece na lista, com nome e data.
5. Clique na entrada pra inserir uma cópia no documento atual. Confirme
   que ela aparece no canvas, funcionando (ligue Inputs/LED nos pinos e
   confirme o cálculo, igual ao Roteiro 3).
6. Abra **Minha biblioteca** de novo e clique **Editar** na entrada —
   confirme que abre pra edição (não deveria afetar a cópia já inserida
   no passo 5: edite algo nela, salve, e confirme que a cópia antiga no
   canvas continua com o comportamento de ANTES da edição — inserir é
   cópia, não link vivo).
7. Insira uma NOVA cópia depois de editar — essa sim deveria refletir a
   versão editada.
8. Abra **Minha biblioteca** de novo e **Excluir** a entrada. Confirme
   que ela some da lista, e que as cópias já inseridas em documentos
   continuam funcionando normalmente (excluir da biblioteca não deveria
   quebrar cópias já espalhadas).

**Esperado**: os três pontos de entrada pra "salvar na biblioteca"
funcionam igual; inserir é sempre cópia independente (editar ou excluir
a entrada da biblioteca depois não afeta cópias já inseridas); a lista
atualiza corretamente após cada ação.

---

## Roteiro 8 — Sinais multi-bit e barramento

Objetivo: cobrir a feature mais recente do projeto (#19), que nunca
apareceu em nenhum roteiro anterior — barramento de 4 bits, hex na
tabela-verdade/forma de onda, e os componentes aritméticos nativos.

1. Numa aba nova, monte: 4 **Input** → **Merge 4** (grupo Barramentos na
   biblioteca) → **Display 4**. Ligue cada Input a um pino `I0`-`I3` do
   Merge 4, e a saída do Merge 4 na entrada do Display 4. O fio entre
   Merge 4 e Display 4 deveria aparecer visualmente mais grosso que um
   fio comum (fio de barramento).
2. Ligue combinações dos 4 Inputs e confirme que o Display 4 mostra o
   dígito hexadecimal certo (ex.: só o Input do bit mais significativo
   ligado deveria mostrar `8`; todos ligados deveria mostrar `F`).
3. Adicione um **Split 4** depois do Merge 4 (Merge 4 → Split 4) e ligue
   cada saída `O0`-`O3` a um LED. Confirme que os LEDs acendem exatamente
   nos bits que você ligou nos Inputs originais — o valor atravessou
   Merge→Split sem se perder.
4. Abra a **Tabela verdade** — confirme que ela mostra os valores em hex
   (não tenta desmontar em bits individuais nem quebra).
5. Monte um **Somador 4 bits** (grupo Barramentos): dois Merge 4
   alimentando as entradas `A`/`B`, saída `SUM` num Display 4, saída
   `Cout` num LED. Teste um caso de overflow: `A=1111` (15) + `B=0001`
   (1) deveria dar `SUM=0000` e `Cout` aceso (15+1=16, estoura 4 bits).
6. Abra o painel **Formas de onda**, dê Tick nos Inputs (se aplicável) ou
   apenas alterne alguns e confirme que o traço do barramento aparece
   como linha tracejada com rótulo hex, não como uma linha booleana comum.

**Esperado**: fio de barramento visualmente distinto, valores hex
corretos em todo lugar (canvas, tabela-verdade, forma de onda), Merge→
Split preserva o valor exato, somador estoura certo no caso de overflow.

---

## Roteiro 9 — Exportar e importar

Objetivo: cobrir o ciclo de exportação/importação, que nenhum roteiro
anterior tocou.

1. Com um circuito montado (pode reaproveitar qualquer um anterior),
   abra o menu **Exportar** e clique **Baixar JSON**. Confirme que um
   arquivo é baixado (verifique a pasta de downloads do browser) e que o
   nome do arquivo faz sentido com o nome do documento.
2. Abra o arquivo baixado num editor de texto e confirme que é um JSON
   válido, com `components`/`wires` reconhecíveis.
3. No menu **Exportar**, clique **Baixar imagem PNG** e depois **Baixar
   imagem SVG**. Confirme que os dois arquivos baixam e, ao abrir, mostram
   o circuito de forma legível (não cortado, não em branco).
4. Abra uma aba nova, vá em **Arquivo → Importar JSON…**, e selecione o
   arquivo JSON baixado no passo 1. Confirme que o circuito é recriado
   fielmente (mesmos componentes, fios, e funcionando ao testar os
   Inputs).
5. Tente importar um arquivo JSON **inválido** de propósito (crie um
   `.json` qualquer com `{"foo": "bar"}` e tente importar). Confirme que
   o app rejeita com uma mensagem clara, em vez de travar ou aceitar
   silenciosamente um circuito quebrado.

**Esperado**: o ciclo exportar→importar preserva o circuito fielmente, os
formatos de imagem saem legíveis, e um JSON inválido é rejeitado com
mensagem, não falha silenciosa.
