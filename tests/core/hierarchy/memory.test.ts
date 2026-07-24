import { test } from 'vitest';
import assert from 'node:assert/strict';
import { writeBackMemory } from '../../../src/core/hierarchy/memory';
import type { CircuitDocument } from '../../../src/core/types';

// Testes diretos de writeBackMemory (sem passar por flattenCircuit), cobrindo o
// esquema de particionamento por caminho relativo descrito na Fase 1 de subcircuitos.

test('writes memory straight onto a bare top-level component id', () => {
  const scope: CircuitDocument = {
    version: 1,
    components: [
      { id: 'FF', type: 'd-flip-flop', x: 0, y: 0, memory: { q: false, previousClk: false } },
    ],
    wires: [],
  };
  const steppedFlat: CircuitDocument = {
    version: 1,
    components: [
      { id: 'FF', type: 'd-flip-flop', x: 0, y: 0, memory: { q: true, previousClk: true } },
    ],
    wires: [],
  };
  const result = writeBackMemory(scope, steppedFlat);
  const ff = result.components.find((c) => c.id === 'FF');
  assert.deepEqual(ff?.memory, { q: true, previousClk: true });
});

test("writes memory onto an owning instance's instanceMemory, keyed by relative path", () => {
  const scope: CircuitDocument = {
    version: 1,
    components: [{ id: 'U1', type: 'subcircuit', x: 0, y: 0, definitionId: 'def-1' }],
    wires: [],
  };
  const steppedFlat: CircuitDocument = {
    version: 1,
    components: [
      { id: 'U1.FF', type: 'd-flip-flop', x: 0, y: 0, memory: { q: true, previousClk: false } },
    ],
    wires: [],
  };
  const result = writeBackMemory(scope, steppedFlat);
  const u1 = result.components.find((c) => c.id === 'U1');
  assert.deepEqual(u1?.instanceMemory, { FF: { q: true, previousClk: false } });
});

test('a nested instance writes into the outermost real owner, using a multi-segment relative path', () => {
  const scope: CircuitDocument = {
    version: 1,
    components: [{ id: 'U1', type: 'subcircuit', x: 0, y: 0, definitionId: 'outer-def' }],
    wires: [],
  };
  const steppedFlat: CircuitDocument = {
    version: 1,
    components: [
      { id: 'U1.SUB2.FF', type: 'd-flip-flop', x: 0, y: 0, memory: { q: true, previousClk: true } },
    ],
    wires: [],
  };
  const result = writeBackMemory(scope, steppedFlat);
  const u1 = result.components.find((c) => c.id === 'U1');
  assert.deepEqual(u1?.instanceMemory, { 'SUB2.FF': { q: true, previousClk: true } });
});

test('preserves any pre-existing instanceMemory entries for other components on the same instance', () => {
  const scope: CircuitDocument = {
    version: 1,
    components: [
      {
        id: 'U1',
        type: 'subcircuit',
        x: 0,
        y: 0,
        definitionId: 'def-1',
        instanceMemory: { OTHER: { q: false, previousClk: false } },
      },
    ],
    wires: [],
  };
  const steppedFlat: CircuitDocument = {
    version: 1,
    components: [
      { id: 'U1.FF', type: 'd-flip-flop', x: 0, y: 0, memory: { q: true, previousClk: true } },
    ],
    wires: [],
  };
  const result = writeBackMemory(scope, steppedFlat);
  const u1 = result.components.find((c) => c.id === 'U1');
  assert.deepEqual(u1?.instanceMemory, {
    OTHER: { q: false, previousClk: false },
    FF: { q: true, previousClk: true },
  });
});

test('components without memory (most gates) are ignored, and an unmatched owner is skipped defensively', () => {
  const scope: CircuitDocument = {
    version: 1,
    components: [{ id: 'A', type: 'and', x: 0, y: 0 }],
    wires: [],
  };
  const steppedFlat: CircuitDocument = {
    version: 1,
    components: [
      { id: 'A', type: 'and', x: 0, y: 0 }, // no memory field
      { id: 'GHOST.FF', type: 'd-flip-flop', x: 0, y: 0, memory: { q: true, previousClk: true } }, // no owner named GHOST
    ],
    wires: [],
  };
  const result = writeBackMemory(scope, steppedFlat);
  assert.equal(result, scope); // no patches applied, same reference returned
});
