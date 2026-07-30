# Roteiros de teste exploratório

Estes roteiros são executados sob demanda por uma pessoa ou agente com controle
real de mouse, teclado e tela. Eles complementam a
[suíte automatizada](testing.md) com aspectos que exigem observação do produto
renderizado: clareza do fluxo, foco, texto cortado, feedback visual, downloads
e comportamento do navegador.

O [mapa funcional](mapa-funcional.md) é a referência do comportamento atual.
Se o produto e um roteiro divergirem, registre a evidência antes de decidir se
existe regressão ou se a documentação precisa acompanhar uma mudança
deliberada.

Uma suíte E2E ampla não roda obrigatoriamente na CI. A decisão e os critérios
para retomá-la estão em [Testes e cobertura](testing.md#e2e).

## Preparação

### Ambiente isolado

Não execute os fluxos de salvar e excluir usando bancos ou perfil de navegador
com dados importantes. No terminal que executará o servidor, crie uma área
temporária e inicie o Vite:

```bash
EXPLORATION_ROOT="$(mktemp -d)"
mkdir -p "$EXPLORATION_ROOT/firefox-profile"
printf '%s\n' "$EXPLORATION_ROOT"
OPENCIRCUIT_DB="$EXPLORATION_ROOT/circuits.sqlite" \
OPENCIRCUIT_LIBRARY_DB="$EXPLORATION_ROOT/library.sqlite" \
OPENCIRCUIT_SESSION_SECRET="exploratory-session-secret-00000001" \
npm run dev
```

O Vite normalmente usa `http://localhost:5173`, mas pode escolher a próxima
porta livre. Confirme a URL exibida no terminal.

Abra essa URL em um perfil descartável. Em outro terminal, copie para
`EXPLORATION_ROOT` o caminho absoluto impresso pelo primeiro comando. No
Firefox:

```bash
EXPLORATION_ROOT="/tmp/caminho-impresso-pelo-primeiro-terminal"
firefox --no-remote --profile "$EXPLORATION_ROOT/firefox-profile" http://localhost:5173
```

Se outro navegador ou uma ferramenta de computer use for usado, garanta ao
menos que cookies, localStorage, IndexedDB e downloads estejam separados dos
dados habituais. A aplicação não exige login: a API cria uma sessão anônima
assinada para o perfil.

Antes do primeiro roteiro, confirme:

- uma única aba `Sem título` ou outro rascunho vazio;
- Meus circuitos sem entradas;
- Minha biblioteca sem entradas;
- console do navegador sem erro;
- zoom do navegador em 100%.

Ao terminar, feche o servidor e o perfil descartável. Os bancos, a sessão
local e os downloads podem ser descartados junto com `EXPLORATION_ROOT`.

### Verificações transversais

Em todos os roteiros, observe também:

- erros no console;
- ação habilitada ou desabilitada em estado incorreto;
- texto truncado ou sobreposto;
- feedback ausente, confuso ou que desaparece cedo demais;
- foco inicial de diálogos e retorno do foco ao fechar;
- execução por teclado das ações usadas;
- nome acessível de controles sem texto;
- desempenho ou animação perceptivelmente travados.

A interface atualmente pressupõe desktop e possui largura mínima. Teste uma
janela estreita uma vez, registre o comportamento e compare com a
[#104](https://github.com/canpse/opencircuit/issues/104); a limitação conhecida
não deve ser reportada repetidamente como nova regressão, salvo se piorar.

### Formato do relatório

```text
## Roteiro N — <nome>
Resultado: OK / achou problema(s) / bloqueado
Ambiente: navegador, viewport, commit e URL

Passo a passo:
- Esperado:
  Observado:

Outras coisas notadas:
- ... (ou "nada digno de nota")

Dados criados e limpeza:
- ...
```

---

## Roteiro 1 — Montar um circuito combinacional do zero

Objetivo: confirmar o fluxo básico de inserir, conectar e avaliar componentes.

1. Na Biblioteca lateral, clique em **Input** e depois em dois pontos vazios
   do canvas. A ferramenta permanece ativa entre as duas inserções.
2. Clique em **AND** e posicione a porta à direita dos Inputs.
3. Clique em **LED** e posicione a saída à direita da AND.
4. Ligue cada Input a uma entrada da AND e a saída da AND ao LED. Faça ao
   menos uma ligação por clique-clique e outra arrastando entre os pinos.
5. Ative **Selecionar**. Clique nos Inputs e percorra as quatro combinações.
6. Desfaça e refaça uma conexão para confirmar o feedback visual e o
   histórico.

**Esperado:** o LED acende somente com os dois Inputs ligados; fios e pinos
acompanham o valor lógico; conexões incompatíveis ou entradas já ocupadas não
são aceitas silenciosamente.

---

## Roteiro 2 — Aulas e exemplos com clock

Objetivo: verificar o ciclo atual de abertura de aulas e a progressão temporal.

1. Mantenha o rascunho inicial aberto e carregue **Flip-Flop D básico** pelo
   seletor **Aulas**.
2. Confirme que:
   - o exemplo abriu em outra aba;
   - a aba anterior continua disponível;
   - a nova aba não mostra mudanças pendentes;
   - o painel **Lição** está ativo e apresenta o conteúdo do exemplo.
3. Feche o exemplo sem alterá-lo. Ele deve fechar sem confirmação.
4. Abra novamente e altere um Input. Agora a aba deve indicar mudanças e pedir
   decisão ao fechar; escolha Cancelar.
5. Repita os testes de Tick e clock automático nos exemplos:
   - **Flip-Flop D básico**;
   - **Registrador 4 bits básico**;
   - **Contador binário síncrono (8 bits)**;
   - **Contador em anel de Johnson (8 bits)**;
   - **Ripple counter assíncrono (não funciona)**.
6. Nos quatro primeiros, aplique 8–10 Ticks e confirme a progressão. No Ripple
   counter, confirme ao menos que o Clock alterna; o resultado assíncrono
   incorreto é intencional e explicado pela lição.
7. Rode o clock automático por alguns segundos, mude a velocidade e pause.
8. Abra um exemplo relacionado pelo painel Lição. Ele deve abrir em outra aba
   e manter Lição ativa.

**Esperado:** exemplos embutidos abrem limpos em abas independentes; somente
edições do usuário os tornam sujos; os componentes temporais não congelam
depois do primeiro Tick.

---

## Roteiro 3 — Criar e transportar um subcircuito

Objetivo: validar criação, descoberta, seleção aditiva e copiar/colar entre
documentos.

1. Em um rascunho novo, monte dois Inputs → AND → LED.
2. Selecione dois componentes com `Shift`+clique e confirme que o Input não
   alterna durante o gesto. Complete a seleção com `Shift`+clique ou
   selecionando tudo pelo menu **Editar**/`Ctrl+A`.
3. Confirme que **Transformar seleção** ficou habilitado na barra de
   definições e em **Editar → Transformar seleção em subcircuito…**.
4. Acione um desses pontos, informe `AND reutilizável` no diálogo e confirme.
5. Verifique que:
   - a seleção foi substituída por uma instância;
   - os fios que cruzavam a seleção viraram pinos externos;
   - a barra mostra a definição e sua quantidade de usos.
6. Duplo clique na instância para entrar na definição. Volte ao circuito
   principal pelo breadcrumb.
7. Selecione a instância, copie, crie um documento com o `+` das abas e cole.
8. No documento novo, conecte Inputs e LED aos pinos externos e teste as quatro
   combinações.

**Esperado:** a definição necessária acompanha a cópia; o componente colado
mantém nome, pinos e comportamento sem depender do documento original.

---

## Roteiro 4 — Desfazer, refazer e seleção

Objetivo: confirmar o histórico de edição, o histórico temporal e as regras de
cancelamento.

1. Abra **Flip-Flop D básico** e aplique três Ticks.
2. Use `Ctrl+Z` três vezes e confirme o retorno passo a passo.
3. Use `Ctrl+Shift+Z` ou `Ctrl+Y` três vezes e confirme a restauração na mesma
   ordem.
4. Mova um componente, adicione outro e desfaça cada edição.
5. Use `Ctrl+A` e confirme que componentes e fios do escopo estão
   selecionados.
6. Ative Mão com `Espaço`, pressione `Escape` e confirme que a primeira
   pressão volta para Selecionar sem limpar a seleção.
7. Pressione `Escape` novamente e confirme que a seleção é limpa.
8. Exclua um componente pelo controle `×`, desfaça e confirme a restauração.

**Esperado:** nenhuma operação pula estados; `Escape` cancela primeiro a
interação ativa e só depois limpa a seleção.

---

## Roteiro 5 — Proteção local, salvar, copiar e reabrir

Objetivo: validar os destinos de persistência sem confundir autosave, servidor
e arquivo.

1. Monte um circuito pequeno em um rascunho.
2. Confirme que o cabeçalho mostra **Rascunho local** e que o rodapé pode
   indicar **Proteção local: atualizada** sem afirmar que houve envio ao
   servidor.
3. Use `Ctrl+S`. No diálogo **Salvar no servidor**:
   - confirme o destino **Meus circuitos no servidor**;
   - confirme que o campo de nome recebe foco;
   - tente nome vazio e nome terminado em `.json`;
   - salve como `Exploração - original`.
4. Confirme que a mesma aba passou a indicar **Circuito no servidor** e
   **Sincronizado**.
5. Altere o circuito. O comando deve se chamar **Atualizar circuito**; use
   `Ctrl+S` e confirme a sincronização.
6. Use `Ctrl+Shift+S`, crie `Exploração - cópia` e confirme:
   - uma nova aba foi aberta e está ativa;
   - as duas abas continuam disponíveis;
   - a original permanece vinculada ao registro original;
   - a nova aba está vinculada à cópia.
7. Altere apenas a cópia e confirme que a original não muda.
8. Feche as duas abas limpas e reabra os dois registros em **Arquivo → Meus
   circuitos**. Se um deles já estiver aberto, a ação deve apenas ativar sua
   aba.
9. Modifique uma aba e tente fechá-la. O diálogo deve informar o destino e
   oferecer **Atualizar e fechar**, Descartar e Cancelar.
10. Recarregue a página e confirme que o workspace local é restaurado.

**Esperado:** proteção local e sincronização remota são apresentadas
separadamente; Salvar vincula a aba atual, enquanto Criar cópia preserva a
original e abre outra aba.

---

## Roteiro 6 — Tabela verdade e formas de onda

Objetivo: confirmar que os painéis auxiliares refletem o escopo e o tempo
atuais.

1. Com o circuito AND do Roteiro 1, abra **Tabela verdade**.
2. Compare todas as linhas com as quatro combinações testadas manualmente.
3. Abra **Flip-Flop D básico** e confirme que a tabela apresenta o estado para
   circuito com memória, sem gerar uma tabela combinacional enganosa.
4. Abra **Formas de onda**, escolha os sinais necessários e aplique cinco
   Ticks.
5. Compare CLK e Q com o canvas a cada passo.
6. Navegue para uma amostra anterior e depois retorne ao estado ao vivo.

**Esperado:** tabela, LEDs e formas de onda concordam; os traços não aparecem
vazios, achatados ou deslocados no tempo.

---

## Roteiro 7 — Biblioteca pessoal

Objetivo: validar publicação, inserção independente, edição e exclusão.

1. Crie uma definição funcional a partir do circuito AND do Roteiro 3.
2. Abra o diálogo **Publicar na biblioteca** por cada ponto de entrada,
   cancelando os dois primeiros:
   - botão **Publicar na biblioteca…** com a definição aberta;
   - menu contextual de uma instância;
   - botão direito no card da definição na Biblioteca lateral.
3. Em todos os casos, confirme o mesmo destino, resumo de componentes/fios e
   contagem de entradas/saídas.
4. Publique como `Exploração - AND`.
5. Crie uma definição vazia e tente publicá-la. O diálogo deve explicar o
   bloqueio antes do envio. Faça o mesmo com uma definição que contenha outro
   subcircuito, se ela já existir no cenário.
6. Volte a outro documento, abra **Minha biblioteca** e confira nome e data da
   entrada publicada.
7. Clique **Inserir**. O diálogo deve fechar, um aviso deve indicar que o
   componente está pronto e um clique no canvas deve inserir uma instância.
8. Insira uma segunda instância. A ferramenta permanece ativa até
   `Escape` ou **Cancelar posicionamento**.
9. Abra **Minha biblioteca** e clique **Editar**. Confirme que uma aba marcada
   como **Componente da biblioteca** foi aberta.
10. Altere a origem e use **Atualizar componente**. Confirme que as instâncias
    já inseridas continuam com a definição local anterior.
11. Insira novamente a origem e confirme que a nova cópia recebe a versão
    atualizada.
12. Em **Minha biblioteca**, clique **Excluir** e leia a confirmação. Exclua a
    origem.
13. Confirme que:
    - ela sumiu da lista;
    - instâncias e definições já copiadas continuam funcionando;
    - a aba que editava a origem foi preservada como rascunho local.

**Esperado:** publicar cria origem independente; inserir cria cópia
independente; editar ou excluir a origem não altera cópias existentes.

---

## Roteiro 8 — Barramentos e sinais multi-bit

Objetivo: validar largura, apresentação hexadecimal e blocos de 4 bits.

1. Monte quatro Inputs → **Merge 4** → **Display 4**.
2. Confirme que o fio de quatro bits é visualmente mais espesso.
3. Teste `1000` e `1111`, respeitando a ordem dos pinos, e confirme os valores
   `8` e `F`.
4. Adicione **Split 4**, conecte suas saídas a quatro LEDs e confirme que o
   valor é preservado por Merge → Split.
5. Abra a tabela verdade e confirme a representação hexadecimal.
6. Monte dois Merge 4 alimentando um **Somador 4 bits**. Conecte `SUM` a
   Display 4 e `Cout` a LED.
7. Teste `15 + 1`: `SUM` deve ser `0` e `Cout` deve acender.
8. Observe um barramento em Formas de onda e confirme o rótulo hexadecimal,
   distinto de um sinal booleano.
9. Tente ligar larguras incompatíveis e confirme a rejeição com feedback.

**Esperado:** largura e valor permanecem consistentes no canvas, na tabela e
nas formas de onda.

---

## Roteiro 9 — Baixar e importar

Objetivo: validar interoperabilidade sem confundi-la com sincronização.

1. Abra ou monte um circuito nomeado.
2. Em **Arquivo**, escolha **Baixar cópia JSON**.
3. Confirme que:
   - o nome do download deriva do nome do documento e termina em `.json`;
   - o arquivo contém `version`, `components` e `wires`;
   - o indicador de persistência da aba não mudou.
4. Em **Arquivo**, baixe PNG e SVG.
5. Abra as duas imagens e confirme circuito legível, sem tela em branco,
   cortes indevidos ou inclusão dos painéis da interface.
6. Use **Arquivo → Importar JSON…** para importar o JSON baixado.
7. Confirme que uma nova aba de rascunho foi aberta, com topologia e
   comportamento preservados, sem vínculo com o registro de origem.
8. Tente importar um JSON estruturalmente inválido, por exemplo
   `{"foo":"bar"}`.
9. Confirme mensagem clara, aplicação responsiva e nenhum documento inválido
   adicionado.

**Esperado:** JSON preserva o circuito como cópia portátil; PNG/SVG são
representações legíveis; importação inválida falha de forma controlada.

## Encerramento da sessão

1. Exclua em **Meus circuitos** os registros criados com o prefixo
   `Exploração -`.
2. Exclua em **Minha biblioteca** as entradas restantes do mesmo prefixo.
3. Confirme que abas preservadas como rascunho podem ser fechadas sem salvar.
4. Registre downloads e artefatos mantidos como evidência.
5. Feche o navegador e o servidor.
6. Descarte a área temporária somente depois de confirmar que o caminho
   impresso na preparação pertence a esta sessão.
