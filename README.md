# OpenCircuit

OpenCircuit é um editor visual web para desenhar e simular **circuitos lógicos digitais**, inspirado no Logisim.

O foco do projeto é ser simples, fluido e claro para montar portas lógicas, conectar fios e testar o comportamento do circuito em tempo real.

## Recursos atuais

- Canvas SVG com grade
- Visual claro com pegada moderna/skeumórfica
- Componentes lógicos:
  - Input/Switch
  - Botão de Pulso
  - LED/Output
  - AND
  - NAND
  - OR
  - NOR
  - XOR
  - XNOR
  - NOT
- Inserção de componentes por clique ou drag-and-drop
- Conexão de fios clicando em saída → entrada
- Fan-out: uma saída pode alimentar várias entradas
- Simulação automática
- Seleção simples e seleção múltipla por retângulo
- Movimento de grupos selecionados
- Remoção por `Delete`/`Backspace`
- Desfazer/refazer
- Menu de contexto com botão direito
- Zoom com scroll
- Pan com ferramenta Mão
- Autosave em `localStorage`
- Importar/exportar JSON

## Rodar o editor

```bash
npm install
npm run dev
```

Build de produção:

```bash
npm run build
```

## Uso básico

1. Escolha um componente na toolbar.
2. Clique no canvas para inserir, ou arraste o componente para a área de trabalho.
3. Clique em um pino de saída e depois em um pino de entrada para conectar.
4. Alterne Inputs ou pressione o botão de Pulso para testar o circuito.
5. Use o LED para visualizar saídas.

## Comandos úteis

- `Delete` / `Backspace`: apaga seleção
- `Ctrl/Cmd + Z`: desfazer
- `Ctrl/Cmd + Shift + Z`: refazer
- `Ctrl/Cmd + Y`: refazer
- `Ctrl/Cmd + +`: aproximar zoom
- `Ctrl/Cmd + -`: afastar zoom
- `Ctrl/Cmd + 0`: resetar zoom
- `Esc`: voltar para Selecionar
- `Espaço`: mudar para ferramenta Mão
- Botão direito: abrir menu de contexto
- Duplo clique em um fio: remover fio

## Arquitetura

```txt
src/
  core/
    types.ts
    catalog.ts
    evaluateCircuit.ts

  state/
    storage.ts

  ui/
    App.tsx
    styles.css
    editor/CircuitCanvas.tsx
```

### Core lógico

O simulador lógico fica separado da UI em `src/core`.

Ele recebe um documento de circuito com componentes e fios, avalia os sinais e retorna os valores dos pinos.

### Editor visual

A interface usa React + TypeScript + Vite, com SVG para renderizar:

- componentes;
- pinos;
- fios;
- grade;
- seleção;
- zoom/pan via câmera SVG.

## Formato JSON

Os circuitos podem ser exportados/importados como JSON.

Exemplo simplificado:

```json
{
  "version": 1,
  "components": [
    { "id": "A", "type": "input", "x": 80, "y": 90, "label": "A", "state": true },
    { "id": "G1", "type": "and", "x": 250, "y": 115, "label": "AND" },
    { "id": "L1", "type": "led", "x": 430, "y": 124, "label": "Saída" }
  ],
  "wires": [
    { "id": "W1", "from": { "componentId": "A", "pinId": "out" }, "to": { "componentId": "G1", "pinId": "a" } },
    { "id": "W2", "from": { "componentId": "G1", "pinId": "out" }, "to": { "componentId": "L1", "pinId": "in" } }
  ]
}
```

## Desenvolvimento

Verificar build:

```bash
npm run build
```
