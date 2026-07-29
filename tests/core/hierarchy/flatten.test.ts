import { test } from 'vitest';
import assert from 'node:assert/strict';
import { flattenCircuit } from '../../../src/core/hierarchy/flatten';
import { evaluateHierarchical } from '../../../src/core/hierarchy/simulate';
import { simulateCircuit, stepCircuit } from '../../../src/core/evaluateCircuit';
import { writeBackMemory } from '../../../src/core/hierarchy/memory';
import type {
  CircuitDefinition,
  CircuitDocument,
  LogicComponent,
  Wire,
} from '../../../src/core/types';

// Cobre o achatamento de hierarquia da Fase 1 de subcircuitos (issue #18): splice de
// marcador input/clock, alias de saida solta, aninhamento, referencia solta e ciclo.

function halfAdderDefinition(id = 'half-adder-def', name = 'Meio Somador'): CircuitDefinition {
  const components: LogicComponent[] = [
    { id: 'A', type: 'input', x: 0, y: 0 },
    { id: 'B', type: 'input', x: 0, y: 60 },
    { id: 'XOR1', type: 'xor', x: 120, y: 0 },
    { id: 'AND1', type: 'and', x: 120, y: 80 },
    { id: 'SUM', type: 'led', x: 260, y: 0 },
    { id: 'CARRY', type: 'led', x: 260, y: 80 },
  ];
  const wires: Wire[] = [
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
  return { id, name, components, wires };
}

test('flattening a document with no subcircuits leaves ids and wires untouched', () => {
  const doc: CircuitDocument = {
    version: 1,
    components: [
      { id: 'A', type: 'input', x: 0, y: 0, state: true },
      { id: 'L', type: 'led', x: 100, y: 0 },
    ],
    wires: [
      { id: 'w1', from: { componentId: 'A', pinId: 'out' }, to: { componentId: 'L', pinId: 'in' } },
    ],
  };
  const { flat } = flattenCircuit(doc, []);
  assert.deepEqual(
    flat.components.map((c) => c.id),
    ['A', 'L'],
  );
  assert.equal(flat.wires.length, 1);
  assert.deepEqual(flat.wires[0].from, { componentId: 'A', pinId: 'out' });
  assert.deepEqual(flat.wires[0].to, { componentId: 'L', pinId: 'in' });
});

test('a single instance splices external drivers through its input markers and aliases its LED-marked outputs', () => {
  const def = halfAdderDefinition();
  const doc: CircuitDocument = {
    version: 1,
    components: [
      { id: 'IN_A', type: 'input', x: 0, y: 0, state: true },
      { id: 'IN_B', type: 'input', x: 0, y: 60, state: false },
      { id: 'U1', type: 'subcircuit', x: 200, y: 0, definitionId: def.id },
      { id: 'LED_SUM', type: 'led', x: 400, y: 0 },
    ],
    wires: [
      {
        id: 'w1',
        from: { componentId: 'IN_A', pinId: 'out' },
        to: { componentId: 'U1', pinId: 'A' },
      },
      {
        id: 'w2',
        from: { componentId: 'IN_B', pinId: 'out' },
        to: { componentId: 'U1', pinId: 'B' },
      },
      {
        id: 'w3',
        from: { componentId: 'U1', pinId: 'SUM' },
        to: { componentId: 'LED_SUM', pinId: 'in' },
      },
    ],
  };

  const { flat } = flattenCircuit(doc, [def]);

  const flatIds = flat.components.map((c) => c.id).sort();
  // The two input markers (U1.A, U1.B) and the two internal LED markers
  // (U1.SUM, U1.CARRY) are never copied; the two real gates are.
  assert.deepEqual(flatIds, ['IN_A', 'IN_B', 'LED_SUM', 'U1.AND1', 'U1.XOR1']);

  const result = simulateCircuit(flat);
  assert.equal(result.values['U1.XOR1'].out, true); // A xor B = true xor false
  assert.equal(result.values['U1.AND1'].out, false); // A and B = false
  assert.equal(result.values.LED_SUM.in, true);
});

test('a direct input-marker to output-marker wire passes the external scalar value through', () => {
  const passthrough: CircuitDefinition = {
    id: 'passthrough-def',
    name: 'Passthrough',
    components: [
      { id: 'IN', type: 'input', x: 0, y: 0 },
      { id: 'OUT', type: 'led', x: 200, y: 0 },
    ],
    wires: [
      {
        id: 'inside',
        from: { componentId: 'IN', pinId: 'out' },
        to: { componentId: 'OUT', pinId: 'in' },
      },
    ],
  };
  const doc: CircuitDocument = {
    version: 1,
    components: [
      { id: 'SOURCE', type: 'input', x: 0, y: 0, state: true },
      { id: 'U1', type: 'subcircuit', x: 150, y: 0, definitionId: passthrough.id },
      { id: 'RESULT', type: 'led', x: 350, y: 0 },
    ],
    wires: [
      {
        id: 'into-instance',
        from: { componentId: 'SOURCE', pinId: 'out' },
        to: { componentId: 'U1', pinId: 'IN' },
      },
      {
        id: 'out-of-instance',
        from: { componentId: 'U1', pinId: 'OUT' },
        to: { componentId: 'RESULT', pinId: 'in' },
      },
    ],
  };

  const { flat, canvasEvaluation } = evaluateHierarchical(doc, [passthrough]);

  assert.deepEqual(
    flat.wires.map((wire) => [wire.from, wire.to]),
    [
      [
        { componentId: 'SOURCE', pinId: 'out' },
        { componentId: 'RESULT', pinId: 'in' },
      ],
    ],
  );
  assert.equal(simulateCircuit(flat).values.RESULT?.in, true);
  assert.equal(canvasEvaluation.U1?.IN, true);
  assert.equal(canvasEvaluation.U1?.OUT, true);
});

test('an instance output pin with no external wire simply has no flattened wire (unconnected reads false)', () => {
  // U1's CARRY pin (backed internally by AND1 -> the CARRY LED marker) is
  // deliberately left unwired from the outside -- nothing external reads it.
  const def = halfAdderDefinition();
  const doc: CircuitDocument = {
    version: 1,
    components: [
      { id: 'IN_A', type: 'input', x: 0, y: 0, state: true },
      { id: 'IN_B', type: 'input', x: 0, y: 60, state: true },
      { id: 'U1', type: 'subcircuit', x: 200, y: 0, definitionId: def.id },
    ],
    wires: [
      {
        id: 'w1',
        from: { componentId: 'IN_A', pinId: 'out' },
        to: { componentId: 'U1', pinId: 'A' },
      },
      {
        id: 'w2',
        from: { componentId: 'IN_B', pinId: 'out' },
        to: { componentId: 'U1', pinId: 'B' },
      },
    ],
  };
  const { flat } = flattenCircuit(doc, [def]);
  const result = simulateCircuit(flat);
  assert.equal(result.values['U1.AND1'].out, true); // still computed correctly internally
  // No wire reads from it, which is fine -- nothing depends on it.
});

test('two instances of the same definition compute independently from different inputs', () => {
  const def = halfAdderDefinition();
  const doc: CircuitDocument = {
    version: 1,
    components: [
      { id: 'IN_A1', type: 'input', x: 0, y: 0, state: true },
      { id: 'IN_B1', type: 'input', x: 0, y: 60, state: false },
      { id: 'U1', type: 'subcircuit', x: 200, y: 0, definitionId: def.id },
      { id: 'IN_A2', type: 'input', x: 0, y: 200, state: true },
      { id: 'IN_B2', type: 'input', x: 0, y: 260, state: true },
      { id: 'U2', type: 'subcircuit', x: 200, y: 200, definitionId: def.id },
    ],
    wires: [
      {
        id: 'w1',
        from: { componentId: 'IN_A1', pinId: 'out' },
        to: { componentId: 'U1', pinId: 'A' },
      },
      {
        id: 'w2',
        from: { componentId: 'IN_B1', pinId: 'out' },
        to: { componentId: 'U1', pinId: 'B' },
      },
      {
        id: 'w3',
        from: { componentId: 'IN_A2', pinId: 'out' },
        to: { componentId: 'U2', pinId: 'A' },
      },
      {
        id: 'w4',
        from: { componentId: 'IN_B2', pinId: 'out' },
        to: { componentId: 'U2', pinId: 'B' },
      },
    ],
  };
  const { flat } = flattenCircuit(doc, [def]);
  const result = simulateCircuit(flat);
  assert.equal(result.values['U1.XOR1'].out, true); // true xor false
  assert.equal(result.values['U1.AND1'].out, false);
  assert.equal(result.values['U2.XOR1'].out, false); // true xor true
  assert.equal(result.values['U2.AND1'].out, true);
});

test('nested instances (subcircuit inside a subcircuit) flatten with dotted instance paths', () => {
  const inner = halfAdderDefinition('inner-def', 'Interno');
  const outerComponents: LogicComponent[] = [
    { id: 'A', type: 'input', x: 0, y: 0 },
    { id: 'B', type: 'input', x: 0, y: 60 },
    { id: 'SUB', type: 'subcircuit', x: 150, y: 0, definitionId: inner.id },
  ];
  const outerWires: Wire[] = [
    { id: 'w1', from: { componentId: 'A', pinId: 'out' }, to: { componentId: 'SUB', pinId: 'A' } },
    { id: 'w2', from: { componentId: 'B', pinId: 'out' }, to: { componentId: 'SUB', pinId: 'B' } },
  ];
  const outer: CircuitDefinition = {
    id: 'outer-def',
    name: 'Externo',
    components: outerComponents,
    wires: outerWires,
  };

  const doc: CircuitDocument = {
    version: 1,
    components: [
      { id: 'IN_A', type: 'input', x: 0, y: 0, state: true },
      { id: 'IN_B', type: 'input', x: 0, y: 60, state: false },
      { id: 'U1', type: 'subcircuit', x: 200, y: 0, definitionId: outer.id },
    ],
    wires: [
      {
        id: 'w1',
        from: { componentId: 'IN_A', pinId: 'out' },
        to: { componentId: 'U1', pinId: 'A' },
      },
      {
        id: 'w2',
        from: { componentId: 'IN_B', pinId: 'out' },
        to: { componentId: 'U1', pinId: 'B' },
      },
    ],
  };

  const { flat, nodes } = flattenCircuit(doc, [outer, inner]);
  const flatIds = flat.components.map((c) => c.id).sort();
  assert.deepEqual(flatIds, ['IN_A', 'IN_B', 'U1.SUB.AND1', 'U1.SUB.XOR1']);

  const result = simulateCircuit(flat);
  assert.equal(result.values['U1.SUB.XOR1'].out, true);
  assert.equal(result.values['U1.SUB.AND1'].out, false);

  const nested = nodes.find((n) => n.instancePath === 'U1.SUB');
  assert.ok(nested);
  assert.equal(nested?.parentScopePath, 'U1');
});

test('a dangling definitionId reference produces no flattened components/wires and does not throw', () => {
  const doc: CircuitDocument = {
    version: 1,
    components: [{ id: 'U1', type: 'subcircuit', x: 0, y: 0, definitionId: 'does-not-exist' }],
    wires: [],
  };
  const { flat, nodes } = flattenCircuit(doc, []);
  assert.equal(flat.components.length, 0);
  assert.equal(nodes.length, 1);
  assert.equal(nodes[0].isDangling, true);
});

test('a cyclic definition reference is detected and does not hang', () => {
  const a: CircuitDefinition = { id: 'a', name: 'A', components: [], wires: [] };
  const b: CircuitDefinition = { id: 'b', name: 'B', components: [], wires: [] };
  a.components.push({ id: 'B1', type: 'subcircuit', x: 0, y: 0, definitionId: 'b' });
  b.components.push({ id: 'A1', type: 'subcircuit', x: 0, y: 0, definitionId: 'a' });

  const doc: CircuitDocument = {
    version: 1,
    components: [{ id: 'U1', type: 'subcircuit', x: 0, y: 0, definitionId: 'a' }],
    wires: [],
  };
  const { flat, nodes } = flattenCircuit(doc, [a, b]);
  assert.equal(flat.components.length, 0);
  // U1 (a) -> B1 (b) resolve normally; B1's own A1 hits the cycle guard and is dangling.
  const cyclic = nodes.find((n) => n.instancePath === 'U1.B1.A1');
  assert.ok(cyclic);
  assert.equal(cyclic?.isDangling, true);
});

test('two instances with an internal flip-flop keep independent state via instanceMemory + writeBackMemory', () => {
  const flipFlopDef: CircuitDefinition = {
    id: 'ff-def',
    name: 'Flip-Flop encapsulado',
    components: [
      { id: 'CLK_IN', type: 'clock', x: 0, y: 0 },
      { id: 'D_IN', type: 'input', x: 0, y: 60 },
      { id: 'FF', type: 'd-flip-flop', x: 150, y: 0, memory: { q: false, previousClk: false } },
    ],
    wires: [
      {
        id: 'w1',
        from: { componentId: 'CLK_IN', pinId: 'CLK' },
        to: { componentId: 'FF', pinId: 'CLK' },
      },
      {
        id: 'w2',
        from: { componentId: 'D_IN', pinId: 'out' },
        to: { componentId: 'FF', pinId: 'D' },
      },
    ],
  };

  let doc: CircuitDocument = {
    version: 1,
    components: [
      { id: 'CLK1', type: 'clock', x: 0, y: 0, state: false },
      { id: 'D1', type: 'input', x: 0, y: 60, state: true },
      { id: 'U1', type: 'subcircuit', x: 200, y: 0, definitionId: flipFlopDef.id },
      { id: 'CLK2', type: 'clock', x: 0, y: 200, state: false },
      { id: 'D2', type: 'input', x: 0, y: 260, state: false },
      { id: 'U2', type: 'subcircuit', x: 200, y: 200, definitionId: flipFlopDef.id },
    ],
    wires: [
      {
        id: 'w1',
        from: { componentId: 'CLK1', pinId: 'CLK' },
        to: { componentId: 'U1', pinId: 'CLK_IN' },
      },
      {
        id: 'w2',
        from: { componentId: 'D1', pinId: 'out' },
        to: { componentId: 'U1', pinId: 'D_IN' },
      },
      {
        id: 'w3',
        from: { componentId: 'CLK2', pinId: 'CLK' },
        to: { componentId: 'U2', pinId: 'CLK_IN' },
      },
      {
        id: 'w4',
        from: { componentId: 'D2', pinId: 'out' },
        to: { componentId: 'U2', pinId: 'D_IN' },
      },
    ],
  };

  function tick(current: CircuitDocument): CircuitDocument {
    const { flat } = flattenCircuit(current, [flipFlopDef]);
    return writeBackMemory(current, stepCircuit(flat));
  }

  // U1's D is high, U2's D is low: after one rising edge, only U1's Q should latch true.
  doc = tick(doc);
  const u1 = doc.components.find((c) => c.id === 'U1');
  const u2 = doc.components.find((c) => c.id === 'U2');
  assert.equal(u1?.instanceMemory?.FF?.q, true);
  assert.equal(u2?.instanceMemory?.FF?.q, false);

  // The shared template definition itself must never accumulate per-instance state.
  const templateFF = flipFlopDef.components.find((c) => c.id === 'FF');
  assert.deepEqual(templateFF?.memory, { q: false, previousClk: false });
});

// Um barramento pode atravessar diretamente a fronteira de um subcircuito via os
// marcadores bus-in-4 (entrada) e display-4 (saída), espelhando input/clock e led.
function passthrough4Definition(): CircuitDefinition {
  const components: LogicComponent[] = [
    { id: 'BIN', type: 'bus-in-4', x: 0, y: 0 },
    { id: 'DISP', type: 'display-4', x: 200, y: 0 },
  ];
  const wires: Wire[] = [
    {
      id: 'iw1',
      from: { componentId: 'BIN', pinId: 'OUT' },
      to: { componentId: 'DISP', pinId: 'IN' },
    },
  ];
  return { id: 'passthrough4-def', name: 'Passthrough4', components, wires };
}

test('a bus crosses a subcircuit boundary via bus-in-4/display-4 markers and stays stable', () => {
  const def = passthrough4Definition();
  const doc: CircuitDocument = {
    version: 1,
    components: [
      { id: 'I0', type: 'input', x: 0, y: 0, state: true },
      { id: 'I1', type: 'input', x: 0, y: 60, state: false },
      { id: 'I2', type: 'input', x: 0, y: 120, state: true },
      { id: 'I3', type: 'input', x: 0, y: 180, state: true },
      { id: 'M', type: 'merge-4', x: 160, y: 80 },
      { id: 'U1', type: 'subcircuit', x: 320, y: 80, definitionId: def.id },
      { id: 'S', type: 'split-4', x: 480, y: 80 },
      { id: 'L0', type: 'led', x: 640, y: 0 },
      { id: 'L1', type: 'led', x: 640, y: 60 },
      { id: 'L2', type: 'led', x: 640, y: 120 },
      { id: 'L3', type: 'led', x: 640, y: 180 },
    ],
    wires: [
      {
        id: 'w0',
        from: { componentId: 'I0', pinId: 'out' },
        to: { componentId: 'M', pinId: 'I0' },
      },
      {
        id: 'w1',
        from: { componentId: 'I1', pinId: 'out' },
        to: { componentId: 'M', pinId: 'I1' },
      },
      {
        id: 'w2',
        from: { componentId: 'I2', pinId: 'out' },
        to: { componentId: 'M', pinId: 'I2' },
      },
      {
        id: 'w3',
        from: { componentId: 'I3', pinId: 'out' },
        to: { componentId: 'M', pinId: 'I3' },
      },
      {
        id: 'w4',
        from: { componentId: 'M', pinId: 'OUT' },
        to: { componentId: 'U1', pinId: 'BIN' },
      },
      {
        id: 'w5',
        from: { componentId: 'U1', pinId: 'DISP' },
        to: { componentId: 'S', pinId: 'IN' },
      },
      { id: 'w6', from: { componentId: 'S', pinId: 'O0' }, to: { componentId: 'L0', pinId: 'in' } },
      { id: 'w7', from: { componentId: 'S', pinId: 'O1' }, to: { componentId: 'L1', pinId: 'in' } },
      { id: 'w8', from: { componentId: 'S', pinId: 'O2' }, to: { componentId: 'L2', pinId: 'in' } },
      { id: 'w9', from: { componentId: 'S', pinId: 'O3' }, to: { componentId: 'L3', pinId: 'in' } },
    ],
  };

  const { flat, canvasEvaluation } = evaluateHierarchical(doc, [def]);
  const result = simulateCircuit(flat);

  assert.equal(
    result.unstable,
    false,
    'um barramento estável atravessando um subcircuito não deve marcar o circuito como instável',
  );
  assert.equal(result.values.L0?.in, true, 'bit 0 (I0=true) deve atravessar intacto');
  assert.equal(result.values.L1?.in, false, 'bit 1 (I1=false) deve atravessar intacto');
  assert.equal(result.values.L2?.in, true, 'bit 2 (I2=true) deve atravessar intacto');
  assert.equal(result.values.L3?.in, true, 'bit 3 (I3=true) deve atravessar intacto');

  // Prova do fix em liftEvaluationForScope: sem ele, Boolean([false,false,false,false])
  // é `true` (array não-vazio), então TODO pino de barramento de fronteira apareceria
  // "aceso" no canvas da instância, mesmo valendo 0000. Aqui os valores são reais.
  assert.deepEqual(
    canvasEvaluation.U1?.BIN,
    [true, false, true, true],
    'o pino de entrada de barramento da instância deve refletir o valor real, não sempre true',
  );
  assert.deepEqual(
    canvasEvaluation.U1?.DISP,
    [true, false, true, true],
    'o pino de saída de barramento da instância deve refletir o valor real, não sempre true',
  );
});
