import { test } from 'vitest';
import assert from 'node:assert/strict';
import {
  deriveSubcircuitDefinition,
  deriveSubcircuitPins,
  getPins,
  resolveComponentDefinition,
} from '../../src/core/catalog';
import type { CircuitDefinition, LogicComponent } from '../../src/core/types';

// Cobre a regra de derivação de pinos da Fase 1 de subcircuitos (issue #18):
// input/clock viram pino de entrada, LED vira pino de saída -- ambas regras por
// tipo, simétricas, e o LED expõe o que estiver ligado ao seu pino "in".

function halfAdderDefinition(): CircuitDefinition {
  const components: LogicComponent[] = [
    { id: 'A', type: 'input', x: 0, y: 0 },
    { id: 'B', type: 'input', x: 0, y: 60 },
    { id: 'XOR1', type: 'xor', x: 120, y: 0 },
    { id: 'AND1', type: 'and', x: 120, y: 80 },
    { id: 'SUM', type: 'led', x: 260, y: 0 },
    { id: 'CARRY', type: 'led', x: 260, y: 80 },
  ];
  const wires = [
    { id: 'w1', from: { componentId: 'A', pinId: 'out' }, to: { componentId: 'XOR1', pinId: 'a' } },
    { id: 'w2', from: { componentId: 'B', pinId: 'out' }, to: { componentId: 'XOR1', pinId: 'b' } },
    { id: 'w3', from: { componentId: 'A', pinId: 'out' }, to: { componentId: 'AND1', pinId: 'a' } },
    { id: 'w4', from: { componentId: 'B', pinId: 'out' }, to: { componentId: 'AND1', pinId: 'b' } },
    {
      id: 'w5',
      from: { componentId: 'XOR1', pinId: 'out' },
      to: { componentId: 'SUM', pinId: 'in' },
    },
    {
      id: 'w6',
      from: { componentId: 'AND1', pinId: 'out' },
      to: { componentId: 'CARRY', pinId: 'in' },
    },
  ];
  return { id: 'half-adder-def', name: 'Meio Somador', components, wires };
}

test('input/clock components become input pins regardless of internal wiring', () => {
  const def = halfAdderDefinition();
  const pins = deriveSubcircuitPins(def);
  const inputIds = pins
    .filter((p) => p.kind === 'input')
    .map((p) => p.id)
    .sort();
  assert.deepEqual(inputIds, ['A', 'B']);
});

test('LED components become output pins, named after the LED itself', () => {
  const def = halfAdderDefinition();
  const pins = deriveSubcircuitPins(def);
  const outputIds = pins
    .filter((p) => p.kind === 'output')
    .map((p) => p.id)
    .sort();
  assert.deepEqual(outputIds, ['CARRY', 'SUM']);
});

test('a gate output with no LED downstream is NOT exposed as a boundary pin', () => {
  const def = halfAdderDefinition();
  // A stray gate whose output isn't fed into any LED should not become a pin.
  def.components.push({ id: 'NOT1', type: 'not', x: 240, y: 160 });
  const pins = deriveSubcircuitPins(def);
  const outputIds = pins
    .filter((p) => p.kind === 'output')
    .map((p) => p.id)
    .sort();
  assert.deepEqual(outputIds, ['CARRY', 'SUM']);
});

test('an unwired LED still becomes an output pin (unconnected reads false, like elsewhere)', () => {
  const def: CircuitDefinition = {
    id: 'unwired-led-def',
    name: 'LED solto',
    components: [{ id: 'L1', type: 'led', x: 0, y: 0 }],
    wires: [],
  };
  const pins = deriveSubcircuitPins(def);
  const outputIds = pins.filter((p) => p.kind === 'output').map((p) => p.id);
  assert.deepEqual(outputIds, ['L1']);
});

test('multiple LEDs on the same definition each become their own output pin', () => {
  const def: CircuitDefinition = {
    id: 'reg-def',
    name: 'Registrador exposto',
    components: [
      { id: 'R1', type: 'register-4', x: 0, y: 0 },
      { id: 'L0', type: 'led', x: 200, y: 0 },
      { id: 'L1', type: 'led', x: 200, y: 40 },
      { id: 'L2', type: 'led', x: 200, y: 80 },
      { id: 'L3', type: 'led', x: 200, y: 120 },
    ],
    wires: [
      {
        id: 'w0',
        from: { componentId: 'R1', pinId: 'Q0' },
        to: { componentId: 'L0', pinId: 'in' },
      },
      {
        id: 'w1',
        from: { componentId: 'R1', pinId: 'Q1' },
        to: { componentId: 'L1', pinId: 'in' },
      },
      {
        id: 'w2',
        from: { componentId: 'R1', pinId: 'Q2' },
        to: { componentId: 'L2', pinId: 'in' },
      },
      {
        id: 'w3',
        from: { componentId: 'R1', pinId: 'Q3' },
        to: { componentId: 'L3', pinId: 'in' },
      },
    ],
  };
  const pins = deriveSubcircuitPins(def);
  const outputIds = pins
    .filter((p) => p.kind === 'output')
    .map((p) => p.id)
    .sort();
  assert.deepEqual(outputIds, ['L0', 'L1', 'L2', 'L3']);
});

test('deriveSubcircuitDefinition caches by definition identity and reflects the name as label', () => {
  const def = halfAdderDefinition();
  const first = deriveSubcircuitDefinition(def);
  const second = deriveSubcircuitDefinition(def);
  assert.equal(first, second);
  assert.equal(first.label, 'Meio Somador');
  assert.equal(first.type, 'subcircuit');
});

test('resolveComponentDefinition falls back to the static empty-pins entry for a dangling definitionId', () => {
  const instance: LogicComponent = {
    id: 'U1',
    type: 'subcircuit',
    x: 0,
    y: 0,
    definitionId: 'missing',
  };
  const resolved = resolveComponentDefinition(instance, []);
  assert.deepEqual(resolved.pins, []);
  assert.equal(resolved.label, 'Subcircuito');
});

test('resolveComponentDefinition resolves a real instance to its definition-derived pins', () => {
  const def = halfAdderDefinition();
  const instance: LogicComponent = {
    id: 'U1',
    type: 'subcircuit',
    x: 0,
    y: 0,
    definitionId: def.id,
  };
  const pins = getPins(instance, [def]);
  assert.equal(pins.length, 4); // 2 inputs (A,B) + 2 outputs (SUM,CARRY)
});

test('cyclic definitions resolve to a pin-less stub instead of recursing forever', () => {
  const a: CircuitDefinition = { id: 'a', name: 'A', components: [], wires: [] };
  const b: CircuitDefinition = { id: 'b', name: 'B', components: [], wires: [] };
  a.components.push({ id: 'B1', type: 'subcircuit', x: 0, y: 0, definitionId: 'b' });
  b.components.push({ id: 'A1', type: 'subcircuit', x: 0, y: 0, definitionId: 'a' });
  const pins = deriveSubcircuitPins(a);
  // Should terminate; B1's own pins (none, since B's pins resolve to a pin-less
  // stub the first time the cycle is hit) contribute nothing.
  assert.deepEqual(pins, []);
});
