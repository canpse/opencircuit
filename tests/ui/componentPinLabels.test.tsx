import { renderToStaticMarkup } from 'react-dom/server';
import { test } from 'vitest';
import assert from 'node:assert/strict';
import { ComponentView } from '../../src/ui/editor/ComponentView';
import type { CircuitDefinition, LogicComponent } from '../../src/core/types';

// Regressão: um subcircuito com exatamente UM pino de saída nunca mostrava o rótulo
// desse pino no canvas -- só um círculo sem texto. ComponentView só desenhava o
// <text> de um pino de saída quando a definição tinha MAIS de uma saída (regra
// pensada pra porta lógica comum, cujo único "out" é redundante rotular), mas pra um
// subcircuito o pino de saída carrega o nome que o usuário deu ao marcador LED --
// exatamente a informação que falta quando invisível. Achado numa rodada de teste
// exploratório (Playwright ad-hoc), confirmado via DOM antes de corrigir.

const noop = () => undefined;

function renderComponent(component: LogicComponent, definitions: CircuitDefinition[]): string {
  return renderToStaticMarkup(
    <svg>
      <ComponentView
        component={component}
        values={undefined}
        changedPins={undefined}
        selected={false}
        onMouseDown={noop}
        onContextMenu={noop}
        onToggleInput={noop}
        onSetButtonPressed={noop}
        onRemove={noop}
        onRenameStart={noop}
        onEnterInstance={noop}
        onResizeStart={noop}
        onPinMouseDown={noop}
        onPinMouseUp={noop}
        onPinClick={noop}
        definitions={definitions}
      />
    </svg>,
  );
}

test('subcircuito com uma única saída ainda mostra o rótulo do pino de saída', () => {
  const definition: CircuitDefinition = {
    id: 'half-def',
    name: 'MeioTeste',
    components: [
      { id: 'D', type: 'input', x: 0, y: 0, label: 'D' },
      { id: 'Overflow', type: 'led', x: 200, y: 0, label: 'Overflow' },
    ],
    wires: [
      {
        id: 'w1',
        from: { componentId: 'D', pinId: 'out' },
        to: { componentId: 'Overflow', pinId: 'in' },
      },
    ],
  };
  const instance: LogicComponent = {
    id: 'U1',
    type: 'subcircuit',
    x: 0,
    y: 0,
    definitionId: definition.id,
  };

  const markup = renderComponent(instance, [definition]);

  assert.match(markup, />D</, 'rótulo do pino de entrada deveria aparecer');
  assert.match(markup, />Overflow</, 'rótulo do único pino de saída deveria aparecer');
});

test('subcircuito com duas saídas mostra os dois rótulos (comportamento já existente)', () => {
  const definition: CircuitDefinition = {
    id: 'two-out-def',
    name: 'DuasSaidas',
    components: [
      { id: 'D', type: 'input', x: 0, y: 0, label: 'D' },
      { id: 'Sum', type: 'led', x: 200, y: 0, label: 'Sum' },
      { id: 'Carry', type: 'led', x: 200, y: 60, label: 'Carry' },
    ],
    wires: [],
  };
  const instance: LogicComponent = {
    id: 'U1',
    type: 'subcircuit',
    x: 0,
    y: 0,
    definitionId: definition.id,
  };

  const markup = renderComponent(instance, [definition]);

  assert.match(markup, />Sum</);
  assert.match(markup, />Carry</);
});

test('porta lógica comum (uma única saída "out") continua sem rótulo redundante', () => {
  const gate: LogicComponent = { id: 'G1', type: 'and', x: 0, y: 0 };

  const markup = renderComponent(gate, []);

  assert.doesNotMatch(markup, /class="pin-label"[^>]*>\s*out\s*</);
});
