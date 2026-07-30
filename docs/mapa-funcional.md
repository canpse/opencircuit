# Mapa funcional do OpenCircuit

Este documento descreve o comportamento observável atual do produto. Ele serve
como referência para revisão de interface e para os
[roteiros exploratórios](roteiros-teste-exploratorio.md); não substitui a
[documentação de arquitetura](architecture.md).

Ao alterar um comando, gesto ou fluxo principal, atualize este mapa no mesmo
PR. As fontes de verdade para comandos e gestos centralizados são
`src/ui/commands/editorCommands.ts`, enquanto comportamentos condicionais de
persistência ficam em `src/ui/persistence/documentPersistence.ts`.

## Modelo geral

- Cada aba representa um documento independente.
- O documento contém um circuito principal e, opcionalmente, definições locais
  de subcircuitos.
- O workspace inteiro recebe proteção local automática no armazenamento do
  navegador.
- Uma aba pode continuar apenas como rascunho local, ser vinculada a um
  circuito no servidor ou ser vinculada a um componente da biblioteca.
- Baixar ou importar JSON é interoperabilidade com arquivo; não cria vínculo
  com o servidor nem com um arquivo local.
- A biblioteca pessoal guarda origens reutilizáveis. Inserir uma origem cria
  uma definição local independente no documento de destino.

## Comandos

Os menus desabilitam ações que não se aplicam ao estado atual. Atalhos ficam
suspensos durante edição de texto e enquanto um diálogo está aberto.

### Arquivo

| Ação                 | Caminho pela interface                                           | Atalho         | Resultado                                                                                                                         |
| -------------------- | ---------------------------------------------------------------- | -------------- | --------------------------------------------------------------------------------------------------------------------------------- |
| Novo circuito        | Arquivo → Novo circuito ou `+` nas abas                          | —              | Abre um rascunho vazio em uma nova aba.                                                                                           |
| Abrir circuito       | Arquivo → Meus circuitos                                         | `Ctrl+O`       | Lista os circuitos do servidor e abre o escolhido em uma nova aba. Se ele já estiver aberto, apenas ativa a aba existente.        |
| Abrir biblioteca     | Arquivo → Minha biblioteca                                       | —              | Lista as origens da biblioteca pessoal com ações explícitas de inserir, editar e excluir.                                         |
| Salvar rascunho      | Arquivo → Salvar no servidor…                                    | `Ctrl+S`       | Solicita um nome, cria um circuito no servidor e vincula a aba atual.                                                             |
| Atualizar circuito   | Arquivo → Atualizar circuito                                     | `Ctrl+S`       | Atualiza o circuito do servidor vinculado à aba.                                                                                  |
| Atualizar componente | Arquivo → Atualizar componente                                   | `Ctrl+S`       | Atualiza a origem da biblioteca vinculada à aba.                                                                                  |
| Criar cópia          | Arquivo → Criar cópia no servidor… ou Criar cópia na biblioteca… | `Ctrl+Shift+S` | Solicita um nome, cria uma origem independente no mesmo domínio e abre a cópia em uma nova aba. A aba original permanece intacta. |
| Importar JSON        | Arquivo → Importar JSON…                                         | —              | Valida o arquivo e abre seu conteúdo como novo rascunho local.                                                                    |
| Baixar JSON          | Arquivo → Baixar cópia JSON                                      | —              | Baixa uma cópia portátil sem alterar o vínculo da aba.                                                                            |
| Exportar PNG         | Arquivo → Baixar imagem PNG                                      | —              | Baixa uma imagem rasterizada do circuito atual.                                                                                   |
| Exportar SVG         | Arquivo → Baixar imagem SVG                                      | —              | Baixa uma imagem vetorial do circuito atual.                                                                                      |

### Editar

| Ação                | Caminho pela interface                                              | Atalho                     | Resultado                                                                                         |
| ------------------- | ------------------------------------------------------------------- | -------------------------- | ------------------------------------------------------------------------------------------------- |
| Desfazer            | Editar → Desfazer ou botão Desfazer                                 | `Ctrl+Z`                   | Reverte a última alteração registrada no histórico.                                               |
| Refazer             | Editar → Refazer ou botão Refazer                                   | `Ctrl+Shift+Z` ou `Ctrl+Y` | Restaura a última alteração desfeita.                                                             |
| Selecionar tudo     | Editar → Selecionar tudo                                            | `Ctrl+A`                   | Seleciona componentes e fios do escopo atual.                                                     |
| Transformar seleção | Editar → Transformar seleção em subcircuito… ou barra de definições | —                          | Solicita um nome e substitui os componentes selecionados por uma instância de uma nova definição. |
| Copiar              | Editar → Copiar                                                     | `Ctrl+C`                   | Copia componentes, fios e definições necessárias para o clipboard interno do editor.              |
| Colar               | Editar → Colar                                                      | `Ctrl+V`                   | Cola uma cópia no documento e importa as definições necessárias.                                  |
| Excluir seleção     | Editar → Excluir seleção, controle `×` ou menu contextual           | `Delete` ou `Backspace`    | Remove os itens selecionados. A operação pode ser desfeita.                                       |

### Exibir e Ajuda

| Ação                 | Caminho pela interface                             | Atalho ou gesto | Resultado                                                                               |
| -------------------- | -------------------------------------------------- | --------------- | --------------------------------------------------------------------------------------- |
| Aproximar            | Exibir → Aproximar ou controle `+`                 | `Ctrl++`        | Aumenta o zoom no centro do canvas.                                                     |
| Afastar              | Exibir → Afastar ou controle `−`                   | `Ctrl+-`        | Diminui o zoom no centro do canvas.                                                     |
| Restaurar 100%       | Exibir → Restaurar zoom a 100% ou controle `100%`  | —               | Restaura a câmera e o zoom padrão.                                                      |
| Enquadrar circuito   | Exibir → Enquadrar circuito ou controle Fit        | `Ctrl+0`        | Ajusta a câmera para mostrar todo o circuito.                                           |
| Alternar Mão/Seleção | Exibir → Alternar Mão/Seleção ou botão Mão         | `Espaço`        | Alterna entre mover a câmera e selecionar elementos.                                    |
| Selecionar           | Exibir → Ferramenta Selecionar ou botão Selecionar | —               | Ativa a ferramenta de seleção.                                                          |
| Formas de onda       | Exibir → Formas de onda ou gaveta inferior         | —               | Abre ou fecha o painel temporal.                                                        |
| Atalhos e gestos     | Ajuda → Atalhos e gestos                           | —               | Abre a referência gerada a partir do registro central de comandos e gestos.             |
| Cancelar interação   | —                                                  | `Escape`        | Cancela primeiro a interação ou ferramenta ativa; sem interação ativa, limpa a seleção. |

Em macOS, os atalhos primários usam `Command` no lugar de `Ctrl`.

## Controles de simulação

| Controle                   | Resultado                                                                |
| -------------------------- | ------------------------------------------------------------------------ |
| Aulas                      | Abre o exemplo selecionado em uma nova aba limpa e ativa o painel Lição. |
| Tick                       | Avança um passo dos componentes sequenciais.                             |
| Rodar clock / Pausar clock | Inicia ou interrompe ticks automáticos.                                  |
| Velocidade                 | Seleciona 1, 2, 4 ou 10 Hz para o clock automático.                      |
| Resetar simulação          | Restaura o estado inicial da simulação sem remover a topologia.          |
| Fios                       | Alterna a representação entre rotas ortogonais e curvas.                 |

## Gestos do editor

| Gesto                                     | Resultado                                                                       |
| ----------------------------------------- | ------------------------------------------------------------------------------- |
| Clique numa ferramenta e depois no canvas | Insere o componente; a ferramenta continua ativa para novas inserções.          |
| Arrastar uma ferramenta ao canvas         | Insere uma ocorrência no ponto de soltura.                                      |
| Arrastar no vazio com Selecionar ativo    | Cria uma seleção retangular de componentes e fios.                              |
| `Shift`+clique                            | Adiciona ou remove componente ou fio da seleção atual sem acionar o componente. |
| Clique no vazio                           | Limpa a seleção.                                                                |
| Arrastar item selecionado                 | Move em conjunto todos os componentes selecionados.                             |
| Clique em Input                           | Alterna o sinal lógico quando não estiver usando `Shift`.                       |
| Clique em Pulso                           | Mantém o sinal ativo enquanto o controle estiver pressionado.                   |
| Clique em pino e depois em outro pino     | Cria uma conexão compatível.                                                    |
| Arrastar entre pinos                      | Cria a mesma conexão em um único gesto.                                         |
| Botão direito                             | Abre ações contextuais do canvas, componente, fio ou ponto de controle.         |
| Duplo clique em aba ou rótulo editável    | Renomeia a aba, o componente ou o túnel.                                        |
| Duplo clique em instância de subcircuito  | Entra na definição usada pela instância.                                        |
| Arrastar um fio                           | Cria ou move um ponto de controle da rota.                                      |
| Botão central                             | Move a câmera sem trocar a ferramenta ativa.                                    |
| Roda do mouse                             | Ajusta o zoom ao redor do ponteiro.                                             |

O menu contextual do canvas permite buscar componentes e mantém uma lista de
itens recentes. Menus de componente, fio e ponto de controle expõem somente as
ações válidas para o alvo.

## Documentos e persistência

### Destinos e indicadores

| Estado da aba            | Indicador                | Salvar                                              | Criar cópia                                              |
| ------------------------ | ------------------------ | --------------------------------------------------- | -------------------------------------------------------- |
| Rascunho local           | Rascunho local           | Cria um circuito no servidor e vincula a aba atual. | Cria um circuito no servidor em outra aba.               |
| Circuito do servidor     | Circuito no servidor     | Atualiza o registro vinculado quando há mudanças.   | Cria um circuito independente em outra aba.              |
| Componente da biblioteca | Componente da biblioteca | Atualiza a origem vinculada quando há mudanças.     | Cria uma origem independente da biblioteca em outra aba. |

O indicador da aba informa o destino e a sincronização remota. O rodapé
informa separadamente a proteção local e o destino remoto. Portanto, “Proteção
local: atualizada” não significa que o documento foi enviado ao servidor.

### Ciclo de vida

- O botão `+` e Arquivo → Novo circuito sempre criam nova aba.
- Renomear uma aba local muda apenas o rascunho. Renomear uma aba vinculada
  atualiza sua origem.
- Fechar documento alterado abre um diálogo que informa o destino correto:
  salvar/atualizar e fechar, descartar ou cancelar.
- Fechar um documento limpo não pede confirmação.
- Fechar a última aba cria um novo rascunho vazio.
- Excluir uma origem em Meus circuitos ou Minha biblioteca preserva qualquer
  aba já aberta como rascunho local.
- Se o servidor contiver uma revisão mais nova, o conflito permite manter as
  alterações locais, criar uma cópia ou recarregar a origem.
- Recarregar a página restaura o workspace protegido localmente.

### JSON e imagens

- Importar JSON nunca atualiza um circuito remoto existente.
- Baixar JSON nunca marca a aba como sincronizada nem troca seu vínculo.
- PNG e SVG representam o circuito visível e não são formatos reimportáveis.
- Documentos que excedem o limite seguro de expansão podem abrir em modo de
  recuperação para permitir correção ou exportação.

## Construção e edição

O editor suporta:

- componentes combinacionais, sequenciais, barramentos e anotações;
- conexões por clique ou arrasto, com validação de direção, ocupação e largura;
- fios ortogonais ou curvos, túneis, rótulos e pontos de controle;
- movimento coletivo, seleção mista de componentes e fios e copiar/colar entre
  documentos;
- histórico de edição e de passos relevantes da simulação;
- busca de componentes no menu contextual;
- sinalização visual de mudanças de valor.

Excluir pelo controle direto é imediato, mas possui nome acessível, ativação
por teclado e suporte a Desfazer.

## Subcircuitos

### Criar e transformar

- **Nova definição** abre um diálogo de nome e entra num escopo vazio.
- O guia do escopo vazio explica que Input, Clock e Bus In 4 viram entradas
  externas, enquanto LED e Display 4 viram saídas externas.
- **Transformar seleção** está disponível no menu Editar, na barra de
  definições e no menu contextual. Fios que cruzam a seleção são convertidos
  em fronteiras da nova definição.
- Todas as instâncias locais usam a mesma definição; editar a definição
  atualiza suas instâncias.

### Navegar e gerenciar

- A barra de definições abre uma definição e mostra sua quantidade de usos ou
  o estado `sem uso`.
- Duplo clique numa instância entra na definição correspondente.
- O breadcrumb volta a qualquer nível ancestral ou ao circuito principal.
- Definições podem ser renomeadas pela barra.
- Somente definições sem instâncias podem ser excluídas. A confirmação explica
  o impacto e a operação pode ser desfeita.
- Uma definição não pode conter a si mesma nem um ancestral do caminho atual.

## Biblioteca pessoal

### Publicar

Uma definição local pode abrir o mesmo diálogo de publicação por:

1. **Publicar na biblioteca…** enquanto a definição está aberta;
2. menu contextual de uma instância;
3. botão direito no card da definição na biblioteca lateral.

O diálogo informa destino, nome, componentes, fios, entradas e saídas. A
publicação cria uma origem independente: mudanças posteriores na definição
local não a atualizam. Definições vazias ou que contenham subcircuitos
aninhados são bloqueadas com explicação antes do envio.

### Inserir, editar e excluir

- **Inserir** copia a origem para uma nova definição local com identificador
  próprio, fecha o diálogo e ativa o modo de posicionamento.
- O aviso de posicionamento permanece visível e a ferramenta continua ativa
  para inserir várias instâncias. `Escape` ou **Cancelar posicionamento**
  encerra o modo.
- **Editar** abre a origem numa aba vinculada à biblioteca.
- Atualizar essa aba muda somente a origem e futuras inserções; cópias já
  inseridas continuam independentes.
- **Excluir** apresenta confirmação. Cópias já inseridas continuam
  funcionando e abas vinculadas à origem tornam-se rascunhos locais.

## Aulas

- Escolher um item em **Aulas** abre um novo documento, sem substituir a aba
  atual.
- O conteúdo embutido é o baseline limpo da aba: um exemplo intocado fecha sem
  confirmação.
- O painel **Lição** é ativado automaticamente.
- Alterar o exemplo passa a protegê-lo como documento modificado.
- Exemplos relacionados abrem outras abas e mantêm a Lição ativa.
- Salvar um exemplo cria um circuito do usuário; não altera o catálogo
  embutido.

## Simulação e análise

- A avaliação combinacional reage imediatamente a mudanças de entrada.
- Tick e clock automático avançam os componentes sequenciais.
- A simulação detecta estabilidade e oscilação.
- A tabela verdade cobre circuitos combinacionais com até seis entradas e
  apresenta um estado específico para circuitos com memória.
- Formas de onda registram sinais escolhidos, incluindo barramentos em
  hexadecimal, e permitem navegar pelo histórico até retornar ao estado ao
  vivo.
- Barramentos são visualmente distintos e possuem validação de largura.
- Hierarquias são validadas antes da expansão para limitar custo e ciclos.

## Limitações e direções abertas

Estas limitações descrevem o estado atual e devem apontar para trabalho
explícito, em vez de virar regras permanentes da documentação:

- A interface pressupõe desktop e possui largura mínima; o contrato de
  viewport e a auditoria automatizada de acessibilidade pertencem à
  [#104](https://github.com/canpse/opencircuit/issues/104).
- Rotação, espelhamento, minimapa e atalho de duplicação permanecem no backlog
  [#21](https://github.com/canpse/opencircuit/issues/21).
- Uma suíte E2E ampla e obrigatória continua adiada conforme a estratégia de
  [testes](testing.md) e o backlog
  [#20](https://github.com/canpse/opencircuit/issues/20).
- Conteúdo adicional, internacionalização e implantação pública pertencem ao
  backlog [#22](https://github.com/canpse/opencircuit/issues/22).
