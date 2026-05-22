# Notes about Pair Programming

Notas para melhorar o fluxo entre três papéis: **Coordenador**, **Driver** e **Navigator**.

## Papéis

### Coordenador / Humano

- Define prioridade de produto.
- Decide a experiência de uso desejada.
- Dá referências visuais ou comportamentais.
- Testa fluxos reais.
- Decide trade-offs: simples agora vs. mais completo/refatorado.

### Driver

- Implementa as mudanças.
- Antes de editar, declara plano, arquivos prováveis e riscos.
- Depois de editar, resume mudanças, testes/build e dúvidas.
- Mantém passos pequenos e verificáveis.

### Navigator

- Antecipar riscos.
- Reduzir escopo quando necessário.
- Questionar ambiguidades de UX/produto.
- Sugerir o próximo passo pequeno.
- Ajudar a validar arquitetura e comportamento.

## Protocolo antes de implementar uma feature

Antes de codar, registrar rapidamente:

```txt
Feature:
Comportamento esperado:
Arquivos prováveis:
Fora de escopo:
Critério de aceite:
Riscos:
```

Exemplo:

```txt
Feature: Pan
Comportamento esperado:
- Ferramenta Mão arrasta a câmera.
- Espaço muda para Mão.
- Esc volta para Selecionar.

Fora de escopo:
- Pan temporário segurando espaço.

Critério de aceite:
- Pan funciona no fundo, sobre componentes e fios.
```

## Protocolo depois de implementar

Depois de codar, o Driver deve resumir:

```txt
Implementado:
Testado:
Riscos restantes:
Próximo passo sugerido:
```

## Contexto útil por fase

### Planejamento

O Navigator precisa de:

- objetivo da feature;
- referência visual/UX;
- restrições;
- alternativas aceitáveis;
- decisões de produto pendentes.

### Antes de editar

O Navigator precisa de:

- plano do Driver;
- arquivos prováveis;
- comportamento esperado;
- risco principal;
- se a abordagem deve ser simples ou já refatorada.

### Depois de editar

O Navigator precisa de:

- resumo do que mudou;
- resultado de build/testes;
- bugs conhecidos;
- pontos incertos;
- fluxos que precisam de teste manual.

### Debugging

O Navigator precisa de uma reprodução clara:

```txt
Ação do usuário:
Comportamento atual:
Comportamento esperado:
Hipótese principal:
Arquivos prováveis:
```

## Práticas recomendadas

- Preferir passos pequenos.
- Conversar antes de decisões grandes.
- Separar decisão de produto de decisão técnica.
- Não adicionar feature grande sem critério de aceite.
- Testar manualmente fluxos de UX após cada mudança.
- Rodar build/testes frequentemente.
- Tratar estados transitórios com cuidado:
  - seleção;
  - fio pendente;
  - drag;
  - pan;
  - undo/redo;
  - menu de contexto.

## Anti-patterns observados

- Atalhos de teclado sem definir conflitos de foco/comportamento nativo.
- Implementar gesto complexo sem mini-especificação.
- Deixar estados transitórios entrarem no histórico sem querer.
- Crescer demais `App` e `CircuitCanvas` sem extrair responsabilidades.

## Recomendações técnicas futuras

A UI cresceu rápido. Antes de adicionar muitas features novas, considerar extrair:

```txt
useHistory
useCanvasCamera
useSelection
useContextMenu
```

Também manter:

- core lógico separado da UI;
- modelo JSON versionado;
- componentes visuais separados de regras de simulação;
- builds/testes frequentes.
