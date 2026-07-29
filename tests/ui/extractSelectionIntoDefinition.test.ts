import { test } from 'vitest';
import assert from 'node:assert/strict';
import { extractSelectionIntoDefinition } from '../../src/ui/app/editorUtils';
import { deriveSubcircuitPins } from '../../src/core/catalog';
import { flattenCircuit } from '../../src/core/hierarchy/flatten';
import { simulateCircuit } from '../../src/core/evaluateCircuit';
import { isCircuitDocument } from '../../src/core/validateCircuitDocument';
import type {
  CircuitDefinition,
  CircuitDocument,
  LogicComponent,
  Wire,
} from '../../src/core/types';

// Cobre a Fase 2 de subcircuitos (issue #18): extrair uma seleção de
// componentes para uma nova CircuitDefinition, sintetizando marcadores
// input/clock/LED nos fios que cruzam a fronteira da seleção.

const GRID = 20;

function component(overrides: Partial<LogicComponent> & { id: string }): LogicComponent {
  return { type: 'and', x: 100, y: 100, ...overrides };
}

function wire(id: string, fromId: string, toId: string, fromPin = 'out', toPin = 'a'): Wire {
  return {
    id,
    from: { componentId: fromId, pinId: fromPin },
    to: { componentId: toId, pinId: toPin },
  };
}

function circuitWith(components: LogicComponent[], wires: Wire[] = []): CircuitDocument {
  return { version: 1, components, wires };
}

test('returns null when componentIds is empty', () => {
  const scope = circuitWith([component({ id: 'A1' })]);
  const result = extractSelectionIntoDefinition(scope, [], 'def1', 'Def', GRID);
  assert.equal(result, null);
});

test('returns null when none of componentIds exist in scope', () => {
  const scope = circuitWith([component({ id: 'A1' })]);
  const result = extractSelectionIntoDefinition(scope, ['ghost'], 'def1', 'Def', GRID);
  assert.equal(result, null);
});

test('a fully-internal wire between two selected components is preserved unchanged', () => {
  const g1 = component({ id: 'G1', type: 'xor', x: 0, y: 0 });
  const g2 = component({ id: 'G2', type: 'and', x: 120, y: 0 });
  const internal = wire('W1', 'G1', 'G2', 'out', 'a');
  const scope = circuitWith([g1, g2], [internal]);

  const result = extractSelectionIntoDefinition(scope, ['G1', 'G2'], 'def1', 'Def', GRID);
  assert.ok(result);
  assert.deepEqual(result.definition.components.map((c) => c.id).sort(), ['G1', 'G2']);
  assert.equal(result.definition.wires.length, 1);
  assert.equal(result.definition.wires[0], internal); // same object reference, untouched
  assert.equal(result.scope.wires.length, 0);
});

test('two internal targets fed by the same external source share one input marker (fan-in dedup)', () => {
  const ext = component({ id: 'EXT', type: 'input', x: -200, y: 0, state: true });
  const g1 = component({ id: 'G1', type: 'and', x: 0, y: 0 });
  const g2 = component({ id: 'G2', type: 'or', x: 0, y: 120 });
  const wires = [wire('W1', 'EXT', 'G1', 'out', 'a'), wire('W2', 'EXT', 'G2', 'out', 'a')];
  const scope = circuitWith([ext, g1, g2], wires);

  const result = extractSelectionIntoDefinition(scope, ['G1', 'G2'], 'def1', 'Def', GRID);
  assert.ok(result);

  const markers = result.definition.components.filter((c) => c.type === 'input');
  assert.equal(markers.length, 1, 'only one input marker synthesized');
  const markerId = markers[0].id;

  // Two internal wires fan out from the single marker to G1 and G2.
  const internalFromMarker = result.definition.wires.filter((w) => w.from.componentId === markerId);
  assert.equal(internalFromMarker.length, 2);

  // Only one rewritten wire in the outer scope, from EXT to the instance's marker pin.
  assert.equal(result.scope.wires.length, 1);
  assert.equal(result.scope.wires[0].from.componentId, 'EXT');
  assert.equal(result.scope.wires[0].to.pinId, markerId);
});

test('an external clock source produces a clock-type marker, not input', () => {
  const clk = component({ id: 'CLK1', type: 'clock', x: -200, y: 0 });
  const ff = component({
    id: 'FF1',
    type: 'd-flip-flop',
    x: 0,
    y: 0,
    memory: { q: false, previousClk: false },
  });
  const scope = circuitWith([clk, ff], [wire('W1', 'CLK1', 'FF1', 'CLK', 'CLK')]);

  const result = extractSelectionIntoDefinition(scope, ['FF1'], 'def1', 'Def', GRID);
  assert.ok(result);
  const markers = result.definition.components.filter((c) => c.type === 'clock');
  assert.equal(markers.length, 1);
});

test('one inside output read by two external destinations shares one LED marker and preserves each wire id/label (fan-out)', () => {
  const g1 = component({ id: 'G1', type: 'and', x: 0, y: 0 });
  const ledA = component({ id: 'LEDA', type: 'led', x: 200, y: 0 });
  const ledB = component({ id: 'LEDB', type: 'led', x: 200, y: 80 });
  const wires = [
    { ...wire('W1', 'G1', 'LEDA', 'out', 'in'), label: 'sinal-a' },
    wire('W2', 'G1', 'LEDB', 'out', 'in'),
  ];
  const scope = circuitWith([g1, ledA, ledB], wires);

  const result = extractSelectionIntoDefinition(scope, ['G1'], 'def1', 'Def', GRID);
  assert.ok(result);

  const markers = result.definition.components.filter((c) => c.type === 'led');
  assert.equal(markers.length, 1, 'only one LED marker synthesized');
  const markerId = markers[0].id;

  assert.equal(result.scope.wires.length, 2);
  const rewrittenA = result.scope.wires.find((w) => w.id === 'W1');
  const rewrittenB = result.scope.wires.find((w) => w.id === 'W2');
  assert.ok(rewrittenA && rewrittenB, 'both original wire ids preserved');
  assert.equal(rewrittenA?.from.pinId, markerId);
  assert.equal(rewrittenA?.label, 'sinal-a', 'original label preserved');
  assert.equal(rewrittenB?.from.pinId, markerId);
  assert.equal(rewrittenA?.to.componentId, 'LEDA');
  assert.equal(rewrittenB?.to.componentId, 'LEDB');
});

test('a wire touching neither endpoint of the selection passes through untouched', () => {
  const a = component({ id: 'A1', type: 'input', x: 0, y: 0 });
  const b = component({ id: 'B1', type: 'led', x: 200, y: 0 });
  const selected = component({ id: 'S1', type: 'not', x: 400, y: 400 });
  const untouched = wire('W1', 'A1', 'B1', 'out', 'in');
  const scope = circuitWith([a, b, selected], [untouched]);

  const result = extractSelectionIntoDefinition(scope, ['S1'], 'def1', 'Def', GRID);
  assert.ok(result);
  assert.equal(result.scope.wires.length, 1);
  assert.equal(result.scope.wires[0], untouched); // same object reference
});

test('selecting 100% of the scope leaves only the new instance behind', () => {
  const g1 = component({ id: 'G1', type: 'xor', x: 0, y: 0 });
  const g2 = component({ id: 'G2', type: 'and', x: 120, y: 0 });
  const scope = circuitWith([g1, g2], [wire('W1', 'G1', 'G2', 'out', 'a')]);

  const result = extractSelectionIntoDefinition(scope, ['G1', 'G2'], 'def1', 'Def', GRID);
  assert.ok(result);
  assert.equal(result.scope.components.length, 1);
  assert.equal(result.scope.components[0].type, 'subcircuit');
  assert.equal(result.scope.wires.length, 0);
});

test('synthesized marker/instance ids do not collide with pre-existing ids in their scope', () => {
  // Pre-existing component named "I1" in the outer scope; the synthesized input
  // marker must not reuse that id inside the (separate) definition scope, and the
  // instance id must not collide with anything remaining in the outer scope either.
  const existingI1 = component({ id: 'I1', type: 'input', x: -300, y: -300 });
  const ext = component({ id: 'EXT', type: 'input', x: -200, y: 0 });
  const g1 = component({ id: 'G1', type: 'and', x: 0, y: 0 });
  const scope = circuitWith([existingI1, ext, g1], [wire('W1', 'EXT', 'G1', 'out', 'a')]);

  const result = extractSelectionIntoDefinition(scope, ['G1'], 'def1', 'Def', GRID);
  assert.ok(result);
  const ids = result.definition.components.map((c) => c.id);
  assert.equal(new Set(ids).size, ids.length, 'no duplicate ids within the definition');
  const scopeIds = result.scope.components.map((c) => c.id);
  assert.equal(new Set(scopeIds).size, scopeIds.length, 'no duplicate ids within the scope');
});

test('the new instance is positioned at the grid-snapped centroid of the selected components', () => {
  const g1 = component({ id: 'G1', type: 'and', x: 0, y: 0 });
  const g2 = component({ id: 'G2', type: 'or', x: 100, y: 200 });
  const scope = circuitWith([g1, g2]);

  const result = extractSelectionIntoDefinition(scope, ['G1', 'G2'], 'def1', 'Def', GRID);
  assert.ok(result);
  const instance = result.scope.components.find((c) => c.type === 'subcircuit')!;
  assert.equal(instance.x, 60); // round((0+100)/2) = 50, snapped to nearest 20 -> 60
  assert.equal(instance.y, 100); // round((0+200)/2) = 100, already on-grid
});

test('selecting a pre-existing subcircuit instance moves it wholesale, keeping definitionId and instanceMemory', () => {
  const nested: LogicComponent = {
    id: 'NESTED1',
    type: 'subcircuit',
    x: 0,
    y: 0,
    definitionId: 'other-def',
    instanceMemory: { FF: { q: true, previousClk: false } },
  };
  const scope = circuitWith([nested]);

  const result = extractSelectionIntoDefinition(scope, ['NESTED1'], 'def1', 'Def', GRID);
  assert.ok(result);
  const moved = result.definition.components.find((c) => c.id === 'NESTED1');
  assert.equal(moved?.definitionId, 'other-def');
  assert.deepEqual(moved?.instanceMemory, { FF: { q: true, previousClk: false } });
});

test("integration: extracting a selection preserves the circuit's logical behavior end-to-end", () => {
  // A xor B, A and B -- half adder built from primitives, extracted into a definition.
  const a = component({ id: 'A', type: 'input', x: 0, y: 0, state: true });
  const b = component({ id: 'B', type: 'input', x: 0, y: 100, state: false });
  const xorGate = component({ id: 'XOR1', type: 'xor', x: 150, y: 0 });
  const andGate = component({ id: 'AND1', type: 'and', x: 150, y: 100 });
  const sumLed = component({ id: 'SUM', type: 'led', x: 300, y: 0 });
  const carryLed = component({ id: 'CARRY', type: 'led', x: 300, y: 100 });
  const wires = [
    wire('w1', 'A', 'XOR1', 'out', 'a'),
    wire('w2', 'B', 'XOR1', 'out', 'b'),
    wire('w3', 'A', 'AND1', 'out', 'a'),
    wire('w4', 'B', 'AND1', 'out', 'b'),
    wire('w5', 'XOR1', 'SUM', 'out', 'in'),
    wire('w6', 'AND1', 'CARRY', 'out', 'in'),
  ];
  const doc = circuitWith([a, b, xorGate, andGate, sumLed, carryLed], wires);

  // Baseline: simulate before extraction.
  const before = simulateCircuit(doc);
  assert.equal(before.values.SUM.in, true);
  assert.equal(before.values.CARRY.in, false);

  const result = extractSelectionIntoDefinition(
    doc,
    ['XOR1', 'AND1'],
    'half-adder-def',
    'Meio Somador',
    GRID,
  );
  assert.ok(result);

  const extractedDoc: CircuitDocument = {
    ...result.scope,
    definitions: [result.definition],
  };

  const { flat } = flattenCircuit(extractedDoc, [result.definition]);
  const after = simulateCircuit(flat);

  // SUM and CARRY (the original LEDs, never part of the selection) still read the
  // same values after extraction -- only their driving wire's source changed, from
  // XOR1/AND1 directly to the new instance's derived output pins.
  assert.equal(after.values.SUM.in, before.values.SUM.in);
  assert.equal(after.values.CARRY.in, before.values.CARRY.in);
  assert.equal(result.definition.components.filter((c) => c.type === 'led').length, 2);
});

test('bus fan-in uses one bus-in-4 marker for multiple selected targets', () => {
  const source = component({ id: 'SOURCE', type: 'merge-4', x: -200, y: 0 });
  const adder = component({ id: 'ADDER', type: 'adder-4', x: 0, y: 0 });
  const scope = circuitWith(
    [source, adder],
    [wire('W1', 'SOURCE', 'ADDER', 'OUT', 'A'), wire('W2', 'SOURCE', 'ADDER', 'OUT', 'B')],
  );

  const result = extractSelectionIntoDefinition(scope, ['ADDER'], 'def-bus', 'Bus', GRID);
  assert.ok(result);

  const markers = result.definition.components.filter((item) => item.type === 'bus-in-4');
  assert.equal(markers.length, 1);
  const markerId = markers[0].id;
  assert.equal(
    result.definition.wires.filter((item) => item.from.componentId === markerId).length,
    2,
  );
  assert.equal(result.scope.wires.length, 1);
  assert.equal(result.scope.wires[0].to.pinId, markerId);
});

test('bus fan-out uses one display-4 marker and preserves external wire metadata', () => {
  const selected = component({ id: 'MERGE', type: 'merge-4', x: 0, y: 0 });
  const display = component({ id: 'DISPLAY', type: 'display-4', x: 240, y: 0 });
  const split = component({ id: 'SPLIT', type: 'split-4', x: 240, y: 100 });
  const scope = circuitWith(
    [selected, display, split],
    [
      { ...wire('W1', 'MERGE', 'DISPLAY', 'OUT', 'IN'), label: 'resultado' },
      wire('W2', 'MERGE', 'SPLIT', 'OUT', 'IN'),
    ],
  );

  const result = extractSelectionIntoDefinition(scope, ['MERGE'], 'def-bus', 'Bus', GRID);
  assert.ok(result);

  const markers = result.definition.components.filter((item) => item.type === 'display-4');
  assert.equal(markers.length, 1);
  const markerId = markers[0].id;
  assert.equal(result.scope.wires.length, 2);
  assert.equal(result.scope.wires.find((item) => item.id === 'W1')?.from.pinId, markerId);
  assert.equal(result.scope.wires.find((item) => item.id === 'W1')?.label, 'resultado');
  assert.equal(result.scope.wires.find((item) => item.id === 'W2')?.from.pinId, markerId);
});

test('integration: a transformed bus boundary remains valid and preserves its value', () => {
  const bits = [true, false, true, true];
  const inputs = bits.map((state, index) =>
    component({ id: `I${index}`, type: 'input', x: 0, y: index * 60, state }),
  );
  const outerMerge = component({ id: 'OUTER_MERGE', type: 'merge-4', x: 140, y: 80 });
  const innerSplit = component({ id: 'INNER_SPLIT', type: 'split-4', x: 300, y: 80 });
  const innerMerge = component({ id: 'INNER_MERGE', type: 'merge-4', x: 460, y: 80 });
  const display = component({ id: 'DISPLAY', type: 'display-4', x: 640, y: 80 });
  const wires = [
    ...inputs.map((input, index) =>
      wire(`WI${index}`, input.id, 'OUTER_MERGE', 'out', `I${index}`),
    ),
    wire('W-IN', 'OUTER_MERGE', 'INNER_SPLIT', 'OUT', 'IN'),
    ...bits.map((_, index) =>
      wire(`W-INTERNAL-${index}`, 'INNER_SPLIT', 'INNER_MERGE', `O${index}`, `I${index}`),
    ),
    wire('W-OUT', 'INNER_MERGE', 'DISPLAY', 'OUT', 'IN'),
  ];
  const scope = circuitWith([...inputs, outerMerge, innerSplit, innerMerge, display], wires);
  const before = simulateCircuit(scope);

  const result = extractSelectionIntoDefinition(
    scope,
    ['INNER_SPLIT', 'INNER_MERGE'],
    'def-bus',
    'Bus passthrough',
    GRID,
  );
  assert.ok(result);

  const inputMarker = result.definition.components.find((item) => item.type === 'bus-in-4');
  const outputMarker = result.definition.components.find((item) => item.type === 'display-4');
  assert.ok(inputMarker);
  assert.ok(outputMarker);
  assert.equal(
    result.definition.components.some((item) => item.type === 'input' || item.type === 'led'),
    false,
  );
  assert.deepEqual(
    deriveSubcircuitPins(result.definition).map((pin) => ({
      id: pin.id,
      kind: pin.kind,
      width: pin.width,
    })),
    [
      { id: inputMarker.id, kind: 'input', width: 4 },
      { id: outputMarker.id, kind: 'output', width: 4 },
    ],
  );

  const transformed: CircuitDocument = {
    ...result.scope,
    definitions: [result.definition],
  };
  assert.equal(isCircuitDocument(transformed), true);

  const { flat } = flattenCircuit(transformed, [result.definition]);
  const after = simulateCircuit(flat);
  assert.deepEqual(after.values.DISPLAY?.IN, before.values.DISPLAY?.IN);
  assert.deepEqual(after.values.DISPLAY?.IN, bits);
});

test('width derived from another subcircuit instance selects a bus marker', () => {
  const passthrough: CircuitDefinition = {
    id: 'existing-bus',
    name: 'Existing bus',
    components: [
      component({ id: 'BIN', type: 'bus-in-4', x: 0, y: 0 }),
      component({ id: 'BOUT', type: 'display-4', x: 200, y: 0 }),
    ],
    wires: [wire('INNER', 'BIN', 'BOUT', 'OUT', 'IN')],
  };
  const instance = component({
    id: 'U1',
    type: 'subcircuit',
    x: -200,
    y: 0,
    definitionId: passthrough.id,
  });
  const selected = component({ id: 'SPLIT', type: 'split-4', x: 0, y: 0 });
  const scope = circuitWith([instance, selected], [wire('W1', 'U1', 'SPLIT', 'BOUT', 'IN')]);

  const result = extractSelectionIntoDefinition(
    scope,
    ['SPLIT'],
    'new-definition',
    'Nested bus',
    GRID,
    [passthrough],
  );
  assert.ok(result);
  assert.equal(result.definition.components.filter((item) => item.type === 'bus-in-4').length, 1);
});
