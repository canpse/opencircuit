import assert from 'node:assert/strict';
import { test } from 'vitest';
import type { CircuitDocument } from '../../src/core/types';
import {
  selectAllInCircuit,
  selectionMessage,
  toggleSelectionTarget,
} from '../../src/ui/editor/selection';

test('Shift alterna componentes sem descartar fios ou os demais componentes', () => {
  const initial = { componentIds: ['A'], wireIds: ['W1'] };
  const added = toggleSelectionTarget(initial, { kind: 'component', id: 'B' });
  const removed = toggleSelectionTarget(added, { kind: 'component', id: 'A' });

  assert.deepEqual(added, { componentIds: ['A', 'B'], wireIds: ['W1'] });
  assert.deepEqual(removed, { componentIds: ['B'], wireIds: ['W1'] });
});

test('Shift alterna fios sem descartar componentes ou duplicar ids', () => {
  const initial = { componentIds: ['A'], wireIds: ['W1'] };
  const removed = toggleSelectionTarget(initial, { kind: 'wire', id: 'W1' });
  const restored = toggleSelectionTarget(removed, { kind: 'wire', id: 'W1' });

  assert.deepEqual(removed, { componentIds: ['A'], wireIds: [] });
  assert.deepEqual(restored, initial);
});

test('Selecionar tudo usa apenas os componentes e fios do circuito recebido', () => {
  const circuit: CircuitDocument = {
    version: 1,
    components: [
      { id: 'A', type: 'input', x: 0, y: 0 },
      { id: 'B', type: 'led', x: 200, y: 0 },
    ],
    wires: [
      {
        id: 'W1',
        from: { componentId: 'A', pinId: 'out' },
        to: { componentId: 'B', pinId: 'in' },
      },
    ],
  };

  assert.deepEqual(selectAllInCircuit(circuit), {
    componentIds: ['A', 'B'],
    wireIds: ['W1'],
  });
});

test('Mensagem de seleção distingue tipos, singular, plural e seleção vazia', () => {
  assert.equal(selectionMessage({ componentIds: [], wireIds: [] }), 'Nada selecionado.');
  assert.equal(selectionMessage({ componentIds: ['A'], wireIds: [] }), '1 componente selecionado.');
  assert.equal(
    selectionMessage({ componentIds: [], wireIds: ['W1', 'W2'] }),
    '2 fios selecionados.',
  );
  assert.equal(
    selectionMessage({ componentIds: ['A', 'B'], wireIds: ['W1'] }),
    '2 componentes e 1 fio selecionados.',
  );
});
