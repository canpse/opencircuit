import assert from 'node:assert/strict';
import { test } from 'vitest';
import { flattenCircuit } from '../../src/core/hierarchy/flatten';
import { buildIncomingWireIndex } from '../../src/core/simulation/signals';
import type { CircuitDefinition, CircuitDocument } from '../../src/core/types';

const circuit: CircuitDocument = {
  version: 1,
  components: [
    { id: 'A', type: 'input', x: 0, y: 0 },
    { id: 'N', type: 'not', x: 100, y: 0 },
    { id: 'L', type: 'led', x: 200, y: 0 },
  ],
  wires: [
    {
      id: 'W1',
      from: { componentId: 'A', pinId: 'out' },
      to: { componentId: 'N', pinId: 'in' },
    },
    {
      id: 'W2',
      from: { componentId: 'N', pinId: 'out' },
      to: { componentId: 'L', pinId: 'in' },
    },
  ],
};

test('índice resolve o fio de entrada em O(1) e é reutilizado por identidade', () => {
  const first = buildIncomingWireIndex(circuit);
  const second = buildIncomingWireIndex(circuit);
  assert.equal(first, second);
  assert.equal(first.get(JSON.stringify(['N', 'in']))?.id, 'W1');
  assert.equal(first.get(JSON.stringify(['L', 'in']))?.id, 'W2');
});

test('flatten reutiliza o resultado quando escopo e definições não mudam', () => {
  const definitions: CircuitDefinition[] = [];
  const first = flattenCircuit(circuit, definitions);
  const second = flattenCircuit(circuit, definitions);
  assert.equal(first, second);
  assert.notEqual(flattenCircuit(circuit, []), first);
});
