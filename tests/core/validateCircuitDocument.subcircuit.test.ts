import { test } from 'vitest';
import assert from 'node:assert/strict';
import { isCircuitDocument } from '../../src/core/validateCircuitDocument';
import type { CircuitDefinition, CircuitDocument } from '../../src/core/types';

// Cobre a validacao de documentos com definitions[] (Fase 1 de subcircuitos, issue #18).

function halfAdderDefinition(): CircuitDefinition {
  return {
    id: 'half-adder-def',
    name: 'Meio Somador',
    components: [
      { id: 'A', type: 'input', x: 0, y: 0 },
      { id: 'B', type: 'input', x: 0, y: 60 },
      { id: 'XOR1', type: 'xor', x: 120, y: 0 },
    ],
    wires: [
      {
        id: 'w1',
        from: { componentId: 'A', pinId: 'out' },
        to: { componentId: 'XOR1', pinId: 'a' },
      },
      {
        id: 'w2',
        from: { componentId: 'B', pinId: 'out' },
        to: { componentId: 'XOR1', pinId: 'b' },
      },
    ],
  };
}

test('a document with a well-formed definitions[] validates', () => {
  const def = halfAdderDefinition();
  const doc: CircuitDocument = {
    version: 1,
    components: [{ id: 'U1', type: 'subcircuit', x: 0, y: 0, definitionId: def.id }],
    wires: [],
    definitions: [def],
  };
  assert.equal(isCircuitDocument(doc), true);
});

test('a document with no definitions field at all still validates (additive field, permissive)', () => {
  const doc: CircuitDocument = {
    version: 1,
    components: [{ id: 'A', type: 'input', x: 0, y: 0 }],
    wires: [],
  };
  assert.equal(isCircuitDocument(doc), true);
});

test('a wire correctly wired to a subcircuit instance boundary pin validates', () => {
  const def = halfAdderDefinition();
  const doc: CircuitDocument = {
    version: 1,
    components: [
      { id: 'IN', type: 'input', x: 0, y: 0 },
      { id: 'U1', type: 'subcircuit', x: 100, y: 0, definitionId: def.id },
    ],
    wires: [
      {
        id: 'w1',
        from: { componentId: 'IN', pinId: 'out' },
        to: { componentId: 'U1', pinId: 'A' },
      },
    ],
    definitions: [def],
  };
  assert.equal(isCircuitDocument(doc), true);
});

test('a wire referencing a pin id that does not exist on the instance is rejected', () => {
  const def = halfAdderDefinition();
  const doc: CircuitDocument = {
    version: 1,
    components: [
      { id: 'IN', type: 'input', x: 0, y: 0 },
      { id: 'U1', type: 'subcircuit', x: 100, y: 0, definitionId: def.id },
    ],
    wires: [
      {
        id: 'w1',
        from: { componentId: 'IN', pinId: 'out' },
        to: { componentId: 'U1', pinId: 'NOT_A_PIN' },
      },
    ],
    definitions: [def],
  };
  assert.equal(isCircuitDocument(doc), false);
});

test('a component id containing "." is rejected (reserved for flatten prefixing)', () => {
  const doc: CircuitDocument = {
    version: 1,
    components: [{ id: 'A.B', type: 'input', x: 0, y: 0 }],
    wires: [],
  };
  assert.equal(isCircuitDocument(doc), false);
});

test('a definition id containing "." is rejected', () => {
  const def = halfAdderDefinition();
  def.id = 'bad.id';
  const doc: CircuitDocument = {
    version: 1,
    components: [],
    wires: [],
    definitions: [def],
  };
  assert.equal(isCircuitDocument(doc), false);
});

test('a subcircuit instance with a dangling definitionId is tolerated, not rejected', () => {
  const doc: CircuitDocument = {
    version: 1,
    components: [{ id: 'U1', type: 'subcircuit', x: 0, y: 0, definitionId: 'missing-def' }],
    wires: [],
  };
  assert.equal(isCircuitDocument(doc), true);
});

test('an internally-invalid definition (bad wire) fails validation of the whole document', () => {
  const def = halfAdderDefinition();
  def.wires.push({
    id: 'bad',
    from: { componentId: 'XOR1', pinId: 'a' },
    to: { componentId: 'A', pinId: 'out' },
  }); // reversed kinds
  const doc: CircuitDocument = {
    version: 1,
    components: [],
    wires: [],
    definitions: [def],
  };
  assert.equal(isCircuitDocument(doc), false);
});

test('duplicate definition ids are rejected', () => {
  const def1 = halfAdderDefinition();
  const def2 = { ...halfAdderDefinition(), name: 'Outra' };
  const doc: CircuitDocument = {
    version: 1,
    components: [],
    wires: [],
    definitions: [def1, def2],
  };
  assert.equal(isCircuitDocument(doc), false);
});

test('a valid instanceMemory on a subcircuit instance validates', () => {
  const def = halfAdderDefinition();
  const doc: CircuitDocument = {
    version: 1,
    components: [
      {
        id: 'U1',
        type: 'subcircuit',
        x: 0,
        y: 0,
        definitionId: def.id,
        instanceMemory: { 'FF.q': { q: true, previousClk: false } },
      },
    ],
    wires: [],
    definitions: [def],
  };
  assert.equal(isCircuitDocument(doc), true);
});
