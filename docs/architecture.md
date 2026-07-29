# Arquitetura do OpenCircuit

## Direção das dependências

O código cliente segue uma direção única:

```text
core <- state <- ui
```

- `src/core` contém tipos, contrato de componentes, validação, hierarquia e simulação. Não depende
  de React, persistência ou UI.
- `src/state` implementa armazenamento do workspace, download JSON e transporte HTTP. Depende
  apenas do domínio.
- `src/ui` coordena React, canvas SVG, interações e painéis.
- `src/performance/measure.ts` é instrumentação opcional e neutra de ambiente, consumível pelo
  núcleo, Worker e Node; a integração específica com o Profiler do React fica separada.
- `server` usa o mesmo contrato semântico e os mesmos limites de documento do cliente, mas sempre
  executa sua própria validação sobre dados não confiáveis.

Um teste de arquitetura verifica essas fronteiras na CI. O backend JavaScript também participa do
typecheck por meio de `checkJs`.

O servidor de desenvolvimento do Vite e o servidor de produção instanciam os mesmos handlers,
repositórios, identidade e rate limiter.

O cliente não usa File System Access API nem persiste handles em IndexedDB. Arquivos locais entram
por importação JSON e saem por download JSON; o restante da persistência usa o workspace do
navegador ou o servidor. O teste de arquitetura percorre imports estáticos e dinâmicos a partir de
`src/main.tsx` e rejeita módulos de produção do cliente que não estejam alcançáveis.

## Contrato dos documentos

- `component-contract.json` é a fonte canônica para tipos, direção e largura dos pinos.
- `document-limits.json` reúne limites estruturais e de transporte compartilhados.
- `catalog.ts` acrescenta geometria, rótulos e apresentação para a UI.
- Subcircuitos possuem pinos dinâmicos derivados de seus componentes de fronteira.

Alterações incompatíveis ao documento exigem uma nova versão e uma migração explícita. Limites que
precisarem ser diferentes entre cliente e servidor devem ser documentados e testados como uma
decisão deliberada.

## Persistência local e remota

O workspace aberto recebe autosave síncrono no armazenamento do navegador. A saúde desse autosave
é independente da sincronização remota: um circuito salvo no servidor ainda pode estar sem rascunho
local, e uma falha do servidor não implica falha do `localStorage`.

A UI mantém estados explícitos para gravação local, sucesso, falha e recuperação. Enquanto uma
falha persiste, um aviso não descartável explica o risco de recarregar ou fechar a página e oferece
o download JSON do documento ativo. Falhas repetidas reutilizam o mesmo aviso; a primeira gravação
local posterior bem-sucedida remove o alerta e registra a recuperação.

## Orçamento da hierarquia

Os limites de 10.000 componentes e 20.000 fios por escopo validam a forma declarada, mas não
impedem crescimento multiplicativo por instâncias. Por isso, `hierarchy/expansion.mjs` faz um
preflight antes de qualquer flatten e calcula o grafo efetivo sem materializá-lo.

| Métrica expandida                  |           Limite |
| ---------------------------------- | ---------------: |
| profundidade de instâncias         |               32 |
| componentes achatados              |           10.000 |
| fios achatados                     |           20.000 |
| instâncias visitadas               |           10.000 |
| comprimento de um ID/caminho       | 4.096 caracteres |
| caracteres somados de IDs/caminhos |        2.000.000 |
| unidades de trabalho do preflight  |           50.000 |

O contador de fios segue aliases de fronteira e fan-out, inclusive passthrough direto entre
marcadores. `flattenCircuit` sempre executa a guarda, mesmo quando chamado fora da UI. O servidor
verifica a raiz e a visualização direta de cada definição: falhas estruturais retornam HTTP 400;
documentos estruturalmente válidos acima do orçamento retornam HTTP 422 com código, métrica,
limite, valor observado e escopo.

Registros antigos continuam legíveis. No cliente eles abrem em modo de recuperação: canvas,
navegação, remoção e download JSON permanecem disponíveis, enquanto flatten, simulação, clock,
tabela verdade e salvamento remoto ficam bloqueados até o documento voltar ao orçamento.

## Ordem e convergência da simulação

O simulador constrói um grafo de dependências combinacionais e o reduz a componentes fortemente
conexos (SCCs). Regiões acíclicas são avaliadas uma única vez em ordem topológica determinística;
somente SCCs com realimentação passam pelo processo iterativo. A ordem das listas `components` e
`wires` no documento, portanto, não altera o resultado.

Componentes sequenciais são fronteiras do grafo combinacional: sua saída representa o estado já
armazenado e não depende combinacionalmente da entrada do mesmo tick. Dentro de um SCC, a ordem é
estável por ID. O motor registra os estados de saída visitados para distinguir três resultados:

- `stable`: todos os SCCs atingiram um ponto fixo;
- `oscillating`: um SCC repetiu um estado antes de estabilizar;
- `iteration-limit`: o orçamento computacional terminou sem ponto fixo ou repetição confirmada.

`unstable` continua disponível como compatibilidade e vale `status !== 'stable'`. Depois da
avaliação, os valores são copiados aos pinos de destino dos fios para visualização; essa cópia não
participa da decisão de convergência.

## Como adicionar um componente

1. Adicione o tipo e os pinos em `component-contract.json`. `GateType` será derivado das chaves.
2. Acrescente geometria e rótulos em `catalog.ts`. O teste contratual falhará se os pinos
   divergirem.
3. Implemente a semântica em `simulation/gates.ts`.
4. Se houver memória, atualize `simulation/sequential.ts` e os testes de tick/estado.
5. Defina prefixo de ID e inclusão nos grupos da biblioteca.
6. Acrescente apresentação ou asset quando o desenho genérico não for suficiente.
7. Defina observabilidade em waveform quando aplicável.
8. Adicione testes do componente e ao menos um documento representativo.

O servidor não mantém uma tabela manual paralela: ele lê o contrato compartilhado e continua
validando toda requisição.

## Imutabilidade e caches

Índices de fios, flatten hierárquico e o plano topológico/SCC da simulação usam caches por
identidade com `WeakMap`. Essa estratégia depende do contrato já adotado pelo editor: mudanças
estruturais criam novos objetos de documento/listas de definições, sem mutação in-place. Código
novo deve preservar essa invariante.

## Qualidade

`npm run check` executa formatação, lint de todas as áreas, testes, typecheck de cliente/testes TS e
TSX e build. Os testes `.mjs` do servidor são executados pelo Vitest; uma migração futura para
TypeScript ou `checkJs` pode ampliar ainda mais a análise estática do backend.
