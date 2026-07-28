# Arquitetura do OpenCircuit

## Direção das dependências

O código cliente segue uma direção única:

```text
core <- state <- ui
```

- `src/core` contém tipos, contrato de componentes, validação, hierarquia e simulação. Não depende
  de React, persistência ou UI.
- `src/state` implementa arquivos, armazenamento do workspace e transporte HTTP. Depende apenas do
  domínio.
- `src/ui` coordena React, canvas SVG, interações e painéis.
- `server` usa o mesmo contrato semântico e os mesmos limites de documento do cliente, mas sempre
  executa sua própria validação sobre dados não confiáveis.

O servidor de desenvolvimento do Vite e o servidor de produção instanciam os mesmos handlers,
repositórios, identidade e rate limiter.

## Contrato dos documentos

- `component-contract.json` é a fonte canônica para tipos, direção e largura dos pinos.
- `document-limits.json` reúne limites estruturais e de transporte compartilhados.
- `catalog.ts` acrescenta geometria, rótulos e apresentação para a UI.
- Subcircuitos possuem pinos dinâmicos derivados de seus componentes de fronteira.

Alterações incompatíveis ao documento exigem uma nova versão e uma migração explícita. Limites que
precisarem ser diferentes entre cliente e servidor devem ser documentados e testados como uma
decisão deliberada.

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

Índices de fios, flatten hierárquico e detecção de feedback usam caches por identidade com
`WeakMap`. Essa estratégia depende do contrato já adotado pelo editor: mudanças estruturais criam
novos objetos de documento/listas de definições, sem mutação in-place. Código novo deve preservar
essa invariante.

## Qualidade

`npm run check` executa formatação, lint de todas as áreas, testes, typecheck de cliente/testes TS e
TSX e build. Os testes `.mjs` do servidor são executados pelo Vitest; uma migração futura para
TypeScript ou `checkJs` pode ampliar ainda mais a análise estática do backend.
