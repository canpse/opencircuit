# Testes e cobertura

## Suíte automatizada

Na medição inicial da issue
[#100](https://github.com/canpse/opencircuit/issues/100), em 29 de julho de 2026, a suíte
possuía 363 testes determinísticos em 45 arquivos. Ela é executada com:

```bash
npm test
```

Esse comando permanece como a forma rápida de executar os testes localmente. Para executar a mesma
suíte coletando cobertura:

```bash
npm run coverage
```

O segundo comando produz:

- resumo no terminal;
- relatório navegável em `coverage/index.html`;
- LCOV em `coverage/lcov.info`;
- resumo estruturado em `coverage/coverage-summary.json`.

A pasta `coverage/` é gerada localmente e ignorada pelo Git.

## Escopo da medição

A cobertura inclui todo o código executável `ts`, `tsx` e `mjs` em `src/` e `server/`, mesmo
quando um arquivo não é alcançado pelos testes. Somente helpers de teste e arquivos de declaração
de tipos são excluídos. Assets, JSON e configurações ficam naturalmente fora dos padrões de
inclusão porque não representam código de produção instrumentável.

Os arquivos são classificados de maneira conservadora por caminho:

| Maturidade        | Arquivos                                                | Tratamento                |
| ----------------- | ------------------------------------------------------- | ------------------------- |
| Estável — núcleo  | `src/core/**`                                           | Candidato a gate agregado |
| Estável — backend | `server/**`, exceto `server/index.mjs`                  | Candidato a gate agregado |
| Em evolução       | `src/state/**`, `src/examples/**`, `src/performance/**` | Apenas observado          |
| Volátil           | `src/ui/**`, `src/main.tsx`, `server/index.mjs`         | Apenas observado          |

Workspace, autosave, biblioteca e sincronização continuam sendo comportamentos em evolução.
Enquanto parte deles permanecer dentro de coordenadores e hooks de UI, seus arquivos ficam na
classificação mais conservadora, a volátil. Eles podem receber testes de regressão, mas não um
threshold percentual nesta etapa.

## Baseline inicial

Os valores abaixo foram obtidos por uma execução completa e bem-sucedida dos 363 testes. As
categorias formam uma partição dos 97 arquivos de produção presentes no relatório.

| Área                | Arquivos |             Statements |               Branches |             Functions |                  Lines |
| ------------------- | -------: | ---------------------: | ---------------------: | --------------------: | ---------------------: |
| Núcleo estável      |       21 |      91,34% (939/1028) |       81,65% (632/774) |      96,25% (180/187) |       93,95% (824/877) |
| Backend estável     |       11 |       82,06% (238/290) |       73,70% (157/213) |        96,49% (55/57) |       87,89% (225/256) |
| Em evolução         |       11 |       74,78% (178/238) |       79,55% (144/181) |        59,64% (34/57) |       76,19% (160/210) |
| Volátil             |       54 |     41,28% (1255/3040) |      37,25% (712/1911) |      37,42% (326/871) |     42,63% (1131/2653) |
| **Total observado** |   **97** | **56,78% (2610/4596)** | **53,42% (1645/3079)** | **50,76% (595/1172)** | **58,55% (2340/3996)** |

A média total não deve ser usada como meta: ela combina código maduro de domínio com interface,
bootstraps e coordenadores que ainda devem mudar.

## Política temporária

- Bugs recebem teste de regressão na camada mais próxima da causa.
- Lógica de domínio recebe teste unitário.
- Contratos entre módulos recebem teste de integração.
- Alterações puramente visuais não exigem automação nesta etapa.
- Funcionalidades experimentais podem ter testes atualizados ou removidos quando o contrato do
  produto mudar.
- Não se criam testes superficiais apenas para aumentar percentuais.
- Lacunas relevantes em módulos estáveis viram trabalho explícito quando representam risco real.
- Os [roteiros exploratórios](roteiros-teste-exploratorio.md) permanecem manuais.

## Exploração manual

O [mapa funcional](mapa-funcional.md) registra os comandos, gestos e efeitos
observáveis que os roteiros usam como referência. Mudanças deliberadas nesses
contratos devem atualizar o mapa e os roteiros pertinentes no mesmo PR.

Os [roteiros exploratórios](roteiros-teste-exploratorio.md) são executados sob
demanda em bancos e perfil de navegador isolados. Eles cobrem montagem,
simulação, abas, persistência, subcircuitos, biblioteca, análise e
importação/exportação. O relatório deve registrar ambiente, esperado,
observado, descobertas laterais e limpeza dos dados.

A contagem de testes não é repetida nesses documentos porque muda com
frequência. Os números desta página permanecem apenas como baseline histórico,
datado e reproduzível, da issue #100.

## Proteção seletiva

Os thresholds ativos foram arredondados conservadoramente a partir do baseline e são aplicados de
forma agregada:

| Gate                  | Statements | Branches | Functions | Lines |
| --------------------- | ---------: | -------: | --------: | ----: |
| `src/core/**`         |        90% |      80% |       95% |   90% |
| `server/!(index).mjs` |        80% |      70% |       95% |   85% |

Não há threshold global nem por arquivo. `src/ui/**`, os entrypoints e as áreas em evolução
continuam visíveis nos relatórios sem bloquear a CI. O glob do backend inclui automaticamente os
módulos `.mjs` de `server/`, exceto o bootstrap `server/index.mjs`.

`npm run check` chama `npm run coverage` no lugar de `npm test`, preservando uma única execução da
suíte no gate. O comando `npm test` continua disponível para ciclos locais rápidos sem geração de
relatórios.

## E2E

Playwright, Cypress, Vitest Browser, snapshots visuais extensos e seletores criados exclusivamente
para automação não fazem parte da issue #100. Uma suíte E2E ampla só deve ser retomada quando os
comandos essenciais e fluxos P0 estiverem completos, documentos e persistência estiverem estáveis,
a refatoração #96 estiver concluída, os contratos de viewport, teclado e acessibilidade da #104
estiverem definidos e os resultados esperados dos roteiros exploratórios não estiverem sujeitos a
uma reformulação estrutural iminente.
