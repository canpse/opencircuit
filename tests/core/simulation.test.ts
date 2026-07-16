import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { evaluateCircuit, simulateCircuit, stepCircuit } from '../../src/core/evaluateCircuit';
import { circuitHasFeedback } from '../../src/core/simulation/graph';
import { buildCircuitTruthRows } from '../../src/core/simulation/truthTable';
import {
  bezierPathFromPoints,
  orthogonalPath,
  selfLoopRoute,
} from '../../src/ui/editor/wireRouting';
import { cameraPointFromClient } from '../../src/ui/editor/useCanvasCamera';
import { CIRCUIT_EXAMPLES } from '../../src/examples/circuitExamples';
import { isCircuitDocument } from '../../src/core/validateCircuitDocument';
import type { CircuitDocument, SimulationState } from '../../src/core/types';

type InputValues = Record<string, boolean>;

function loadExample(name: string): CircuitDocument {
  return JSON.parse(
    readFileSync(join(process.cwd(), 'examples/sequential-feedback', name), 'utf8'),
  ) as CircuitDocument;
}

function setInputs(circuit: CircuitDocument, values: InputValues): CircuitDocument {
  return {
    ...circuit,
    components: circuit.components.map((component) =>
      component.type === 'input' && component.id in values
        ? { ...component, state: values[component.id] }
        : component,
    ),
  };
}

function run(circuit: CircuitDocument, previous?: SimulationState) {
  return simulateCircuit(circuit, previous);
}

function led(circuit: CircuitDocument, state: SimulationState, ledId: string): boolean {
  const value = state.values[ledId]?.in;
  assert.equal(typeof value, 'boolean', `LED ${ledId} não foi avaliado`);
  return value;
}

function pin(state: SimulationState, componentId: string, pinId: string): boolean {
  const value = state.values[componentId]?.[pinId];
  assert.equal(typeof value, 'boolean', `Pino ${componentId}.${pinId} não foi avaliado`);
  return value;
}

function testCombinationalStillWorks() {
  const circuit: CircuitDocument = {
    version: 1,
    components: [
      { id: 'A', type: 'input', x: 0, y: 0, state: true },
      { id: 'B', type: 'input', x: 0, y: 80, state: false },
      { id: 'X1', type: 'xor', x: 160, y: 20 },
      { id: 'OUT', type: 'led', x: 320, y: 20 },
    ],
    wires: [
      { id: 'W1', from: { componentId: 'A', pinId: 'out' }, to: { componentId: 'X1', pinId: 'a' } },
      { id: 'W2', from: { componentId: 'B', pinId: 'out' }, to: { componentId: 'X1', pinId: 'b' } },
      {
        id: 'W3',
        from: { componentId: 'X1', pinId: 'out' },
        to: { componentId: 'OUT', pinId: 'in' },
      },
    ],
  };

  const values = evaluateCircuit(circuit);
  assert.equal(values.OUT.in, true, 'XOR deve acender quando entradas são diferentes');
}

function testNorSrLatchKeepsState() {
  let circuit = loadExample('01_sr_latch_nor.json');
  let result = run(circuit);

  circuit = setInputs(circuit, { S: true, R: false });
  result = run(circuit, result.state);
  assert.equal(result.unstable, false, 'SR NOR set não deveria oscilar');
  assert.equal(led(circuit, result.state, 'Q'), true, 'S=1 deve setar Q');
  assert.equal(led(circuit, result.state, 'QB'), false, 'S=1 deve apagar !Q');

  circuit = setInputs(circuit, { S: false, R: false });
  result = run(circuit, result.state);
  assert.equal(led(circuit, result.state, 'Q'), true, 'S=R=0 deve manter Q=1 após set');

  circuit = setInputs(circuit, { S: false, R: true });
  result = run(circuit, result.state);
  assert.equal(result.unstable, false, 'SR NOR reset não deveria oscilar');
  assert.equal(led(circuit, result.state, 'Q'), false, 'R=1 deve resetar Q');
  assert.equal(led(circuit, result.state, 'QB'), true, 'R=1 deve setar !Q');

  circuit = setInputs(circuit, { S: false, R: false });
  result = run(circuit, result.state);
  assert.equal(led(circuit, result.state, 'Q'), false, 'S=R=0 deve manter Q=0 após reset');
}

function testNandSrLatchActiveLowKeepsState() {
  let circuit = loadExample('02_sr_latch_nand_active_low.json');
  let result = run(circuit);

  circuit = setInputs(circuit, { SB: false, RB: true });
  result = run(circuit, result.state);
  assert.equal(result.unstable, false, 'SR NAND set não deveria oscilar');
  assert.equal(led(circuit, result.state, 'Q'), true, 'S̅=0 deve setar Q');

  circuit = setInputs(circuit, { SB: true, RB: true });
  result = run(circuit, result.state);
  assert.equal(led(circuit, result.state, 'Q'), true, 'S̅=R̅=1 deve manter Q=1');

  circuit = setInputs(circuit, { SB: true, RB: false });
  result = run(circuit, result.state);
  assert.equal(result.unstable, false, 'SR NAND reset não deveria oscilar');
  assert.equal(led(circuit, result.state, 'Q'), false, 'R̅=0 deve resetar Q');

  circuit = setInputs(circuit, { SB: true, RB: true });
  result = run(circuit, result.state);
  assert.equal(led(circuit, result.state, 'Q'), false, 'S̅=R̅=1 deve manter Q=0');
}

function testGatedDLatchFromNand() {
  let circuit = loadExample('03_gated_d_latch_from_nand.json');
  let result = run(circuit);

  circuit = setInputs(circuit, { D: true, EN: true });
  result = run(circuit, result.state);
  assert.equal(result.unstable, false, 'Latch D transparente não deveria oscilar');
  assert.equal(led(circuit, result.state, 'Q'), true, 'EN=1 deve fazer Q acompanhar D=1');

  circuit = setInputs(circuit, { D: false, EN: false });
  result = run(circuit, result.state);
  assert.equal(led(circuit, result.state, 'Q'), true, 'EN=0 deve manter Q=1 mesmo com D=0');

  circuit = setInputs(circuit, { D: false, EN: true });
  result = run(circuit, result.state);
  assert.equal(led(circuit, result.state, 'Q'), false, 'EN=1 deve fazer Q acompanhar D=0');

  circuit = setInputs(circuit, { D: true, EN: false });
  result = run(circuit, result.state);
  assert.equal(led(circuit, result.state, 'Q'), false, 'EN=0 deve manter Q=0 mesmo com D=1');
}

function testNotSelfFeedbackIsUnstable() {
  const circuit = loadExample('04_unstable_not_feedback.json');
  const result = run(circuit);
  assert.equal(
    circuitHasFeedback(circuit),
    true,
    'NOT realimentado deve ser detectado como feedback no grafo',
  );
  assert.equal(
    result.unstable,
    true,
    'NOT realimentado em si mesmo deve ser detectado como instável',
  );
}

function testFeedbackGraphDistinguishesAcyclicCircuit() {
  const circuit: CircuitDocument = {
    version: 1,
    components: [
      { id: 'A', type: 'input', x: 0, y: 0 },
      { id: 'G1', type: 'and', x: 120, y: 0 },
      { id: 'OUT', type: 'led', x: 260, y: 0 },
    ],
    wires: [
      { id: 'W1', from: { componentId: 'A', pinId: 'out' }, to: { componentId: 'G1', pinId: 'a' } },
      {
        id: 'W2',
        from: { componentId: 'G1', pinId: 'out' },
        to: { componentId: 'OUT', pinId: 'in' },
      },
    ],
  };
  assert.equal(
    circuitHasFeedback(circuit),
    false,
    'Circuito acíclico não deve ser marcado como feedback',
  );
}

function nativeFlipFlopCircuit(d = false): CircuitDocument {
  return {
    version: 1,
    components: [
      { id: 'D', type: 'input', x: 0, y: 0, state: d },
      { id: 'CLK', type: 'clock', x: 0, y: 80, state: false },
      { id: 'FF', type: 'd-flip-flop', x: 180, y: 20, memory: { q: false, previousClk: false } },
      { id: 'Q', type: 'led', x: 380, y: 30 },
    ],
    wires: [
      { id: 'W1', from: { componentId: 'D', pinId: 'out' }, to: { componentId: 'FF', pinId: 'D' } },
      {
        id: 'W2',
        from: { componentId: 'CLK', pinId: 'CLK' },
        to: { componentId: 'FF', pinId: 'CLK' },
      },
      { id: 'W3', from: { componentId: 'FF', pinId: 'Q' }, to: { componentId: 'Q', pinId: 'in' } },
    ],
  };
}

function testStepCircuitCapturesFlipFlopOnRisingEdgeOnly() {
  let circuit = nativeFlipFlopCircuit(true);

  circuit = stepCircuit(circuit);
  assert.equal(
    circuit.components.find((component) => component.id === 'CLK')?.state,
    true,
    'Primeiro tick deve subir clock',
  );
  assert.equal(
    circuit.components.find((component) => component.id === 'FF')?.memory?.q,
    true,
    'Borda de subida deve capturar D=1',
  );

  circuit = setInputs(circuit, { D: false });
  circuit = stepCircuit(circuit);
  assert.equal(
    circuit.components.find((component) => component.id === 'CLK')?.state,
    false,
    'Segundo tick deve descer clock',
  );
  assert.equal(
    circuit.components.find((component) => component.id === 'FF')?.memory?.q,
    true,
    'Borda de descida não deve capturar D=0',
  );

  circuit = stepCircuit(circuit);
  assert.equal(
    circuit.components.find((component) => component.id === 'CLK')?.state,
    true,
    'Terceiro tick deve subir clock de novo',
  );
  assert.equal(
    circuit.components.find((component) => component.id === 'FF')?.memory?.q,
    false,
    'Nova borda de subida deve capturar D=0',
  );
}

function testRegister4CapturesOnRisingEdgeOnly() {
  let circuit: CircuitDocument = {
    version: 1,
    components: [
      { id: 'D0', type: 'input', x: 0, y: 0, state: true },
      { id: 'D1', type: 'input', x: 0, y: 60, state: false },
      { id: 'D2', type: 'input', x: 0, y: 120, state: true },
      { id: 'D3', type: 'input', x: 0, y: 180, state: false },
      { id: 'CLK', type: 'clock', x: 0, y: 240, state: false },
      {
        id: 'REG',
        type: 'register-4',
        x: 180,
        y: 80,
        memory: { q0: false, q1: false, q2: false, q3: false, previousClk: false },
      },
    ],
    wires: [
      {
        id: 'W0',
        from: { componentId: 'D0', pinId: 'out' },
        to: { componentId: 'REG', pinId: 'D0' },
      },
      {
        id: 'W1',
        from: { componentId: 'D1', pinId: 'out' },
        to: { componentId: 'REG', pinId: 'D1' },
      },
      {
        id: 'W2',
        from: { componentId: 'D2', pinId: 'out' },
        to: { componentId: 'REG', pinId: 'D2' },
      },
      {
        id: 'W3',
        from: { componentId: 'D3', pinId: 'out' },
        to: { componentId: 'REG', pinId: 'D3' },
      },
      {
        id: 'W4',
        from: { componentId: 'CLK', pinId: 'CLK' },
        to: { componentId: 'REG', pinId: 'CLK' },
      },
    ],
  };

  circuit = stepCircuit(circuit);
  const registerAfterRise = circuit.components.find((component) => component.id === 'REG');
  assert.equal(registerAfterRise?.memory?.q0, true, 'Q0 deve capturar D0 na subida');
  assert.equal(registerAfterRise?.memory?.q1, false, 'Q1 deve capturar D1 na subida');
  assert.equal(registerAfterRise?.memory?.q2, true, 'Q2 deve capturar D2 na subida');
  assert.equal(registerAfterRise?.memory?.q3, false, 'Q3 deve capturar D3 na subida');

  circuit = setInputs(circuit, { D0: false, D1: true, D2: false, D3: true });
  circuit = stepCircuit(circuit);
  const registerAfterFall = circuit.components.find((component) => component.id === 'REG');
  assert.equal(registerAfterFall?.memory?.q0, true, 'Borda de descida não deve alterar Q0');
  assert.equal(registerAfterFall?.memory?.q1, false, 'Borda de descida não deve alterar Q1');
  assert.equal(registerAfterFall?.memory?.q2, true, 'Borda de descida não deve alterar Q2');
  assert.equal(registerAfterFall?.memory?.q3, false, 'Borda de descida não deve alterar Q3');

  circuit = stepCircuit(circuit);
  const registerAfterSecondRise = circuit.components.find((component) => component.id === 'REG');
  assert.equal(registerAfterSecondRise?.memory?.q0, false, 'Nova subida deve capturar novo D0');
  assert.equal(registerAfterSecondRise?.memory?.q1, true, 'Nova subida deve capturar novo D1');
  assert.equal(registerAfterSecondRise?.memory?.q2, false, 'Nova subida deve capturar novo D2');
  assert.equal(registerAfterSecondRise?.memory?.q3, true, 'Nova subida deve capturar novo D3');
}

function circuitExample(id: string): CircuitDocument {
  const example = CIRCUIT_EXAMPLES.find((candidate) => candidate.id === id);
  assert.ok(example, `Exemplo ${id} não encontrado`);
  return example.circuit;
}

function setNibble(circuit: CircuitDocument, prefix: string, value: number): CircuitDocument {
  return setInputs(circuit, {
    [`${prefix}0`]: Boolean(value & 1),
    [`${prefix}1`]: Boolean(value & 2),
    [`${prefix}2`]: Boolean(value & 4),
    [`${prefix}3`]: Boolean(value & 8),
  });
}

function readNibble(circuit: CircuitDocument, state: SimulationState, prefix: string): number {
  return (
    (led(circuit, state, `${prefix}0`) ? 1 : 0) +
    (led(circuit, state, `${prefix}1`) ? 2 : 0) +
    (led(circuit, state, `${prefix}2`) ? 4 : 0) +
    (led(circuit, state, `${prefix}3`) ? 8 : 0)
  );
}

function assertAdder4BitExample(exampleId: string) {
  const base = circuitExample(exampleId);
  for (let a = 0; a < 16; a += 1) {
    for (let b = 0; b < 16; b += 1) {
      const circuit = setNibble(setNibble(base, 'A', a), 'B', b);
      const result = run(circuit);
      assert.equal(
        result.unstable,
        false,
        `${exampleId}: somador não deveria oscilar em ${a}+${b}`,
      );
      const sum = a + b;
      assert.equal(
        readNibble(circuit, result.state, 'S'),
        sum & 0b1111,
        `${exampleId} ${a}+${b}: soma errada`,
      );
      assert.equal(
        led(circuit, result.state, 'Cout'),
        sum > 0b1111,
        `${exampleId} ${a}+${b}: Cout errado`,
      );
    }
  }
}

function assertSubtractor4BitExample(exampleId: string) {
  const base = circuitExample(exampleId);
  for (let a = 0; a < 16; a += 1) {
    for (let b = 0; b < 16; b += 1) {
      const circuit = setNibble(setNibble(base, 'A', a), 'B', b);
      const result = run(circuit);
      assert.equal(
        result.unstable,
        false,
        `${exampleId}: subtrator não deveria oscilar em ${a}-${b}`,
      );
      assert.equal(
        readNibble(circuit, result.state, 'D'),
        (a - b) & 0b1111,
        `${exampleId} ${a}-${b}: diferença errada em complemento de 2`,
      );
      assert.equal(
        led(circuit, result.state, 'Cout'),
        a >= b,
        `${exampleId} ${a}-${b}: Cout errado`,
      );
    }
  }
}

function testAdder4BitAddsAllCombinations() {
  assertAdder4BitExample('adder-4-bit');
}

function testAdder4BitFromGatesAddsAllCombinations() {
  assertAdder4BitExample('adder-4-bit-gates');
}

function testSubtractor4BitTwoComplementAllCombinations() {
  assertSubtractor4BitExample('subtractor-4-bit');
}

function testSubtractor4BitFromGatesAllCombinations() {
  assertSubtractor4BitExample('subtractor-4-bit-gates');
}

function testAlu4BitAllOperationsAllCombinations() {
  const base = circuitExample('alu-4-bit');
  for (let op = 0; op < 4; op += 1) {
    for (let a = 0; a < 16; a += 1) {
      for (let b = 0; b < 16; b += 1) {
        const circuit = setInputs(setNibble(setNibble(base, 'A', a), 'B', b), {
          OP0: Boolean(op & 1),
          OP1: Boolean(op & 2),
        });
        const result = run(circuit);
        assert.equal(result.unstable, false, `ULA não deveria oscilar em op=${op} a=${a} b=${b}`);
        const expected =
          op === 0 ? (a + b) & 0b1111 : op === 1 ? (a - b) & 0b1111 : op === 2 ? a & b : a | b;
        assert.equal(
          readNibble(circuit, result.state, 'R'),
          expected,
          `ULA op=${op} a=${a} b=${b}: resultado errado`,
        );
        if (op === 0) {
          assert.equal(
            led(circuit, result.state, 'Cout'),
            a + b > 0b1111,
            `ULA soma ${a}+${b}: Cout errado`,
          );
        }
        if (op === 1) {
          assert.equal(
            led(circuit, result.state, 'Cout'),
            a >= b,
            `ULA subtração ${a}-${b}: Cout errado`,
          );
        }
      }
    }
  }
}

function testTruthTableRowsForXor() {
  const circuit: CircuitDocument = {
    version: 1,
    components: [
      { id: 'A', type: 'input', x: 0, y: 0 },
      { id: 'B', type: 'input', x: 0, y: 80 },
      { id: 'X1', type: 'xor', x: 160, y: 20 },
      { id: 'OUT', type: 'led', x: 320, y: 20 },
    ],
    wires: [
      { id: 'W1', from: { componentId: 'A', pinId: 'out' }, to: { componentId: 'X1', pinId: 'a' } },
      { id: 'W2', from: { componentId: 'B', pinId: 'out' }, to: { componentId: 'X1', pinId: 'b' } },
      {
        id: 'W3',
        from: { componentId: 'X1', pinId: 'out' },
        to: { componentId: 'OUT', pinId: 'in' },
      },
    ],
  };
  const inputs = circuit.components.filter((component) => component.type === 'input');
  const outputs = circuit.components.filter((component) => component.type === 'led');
  const rows = buildCircuitTruthRows(circuit, inputs, outputs);
  assert.deepEqual(
    rows.map((row) => row.outputs[0]),
    [false, true, true, false],
    'Tabela verdade do XOR deve ser 0,1,1,0',
  );
}

function testWireRoutingSelfLoopGoesAroundComponent() {
  const component = {
    id: 'N1',
    type: 'not',
    x: 100,
    y: 100,
  } satisfies CircuitDocument['components'][number];
  const start = { x: 182, y: 128 };
  const end = { x: 100, y: 128 };
  const route = selfLoopRoute(component, start, end, 0);
  assert.deepEqual(route[0], start, 'Self-loop deve começar no pino de saída');
  assert.deepEqual(route[route.length - 1], end, 'Self-loop deve terminar no pino de entrada');
  assert.ok(
    route.some((point) => point.y < component.y),
    'Self-loop deve subir acima do componente',
  );
  assert.ok(
    route.some((point) => point.x < component.x),
    'Self-loop deve passar à esquerda antes de conectar entrada',
  );
  assert.match(orthogonalPath(route, []), /^M /, 'Rota ortogonal deve gerar path SVG');
  assert.match(
    bezierPathFromPoints(route),
    /Q/,
    'Rota curva do self-loop deve ter cantos arredondados',
  );
}

function testCameraPointAccountsForSvgLetterboxing() {
  const camera = { x: 0, y: 0, width: 1200, height: 720 };
  const viewport = { left: 0, top: 0, width: 1000, height: 1000 };
  const center = cameraPointFromClient(camera, viewport, { clientX: 500, clientY: 500 });
  assert.ok(
    Math.abs(center.x - 600) < 1e-9 && Math.abs(center.y - 360) < 1e-9,
    'Centro do viewport deve continuar no centro da câmera',
  );
  const origin = cameraPointFromClient(camera, viewport, { clientX: 0, clientY: 200 });
  assert.ok(
    Math.abs(origin.x) < 1e-9 && Math.abs(origin.y) < 1e-9,
    'Conversão deve descontar as margens criadas por preserveAspectRatio',
  );
}

function testNativeDFlipFlopCapturesOnlyOnRisingEdge() {
  let circuit = nativeFlipFlopCircuit(false);

  let result = run(circuit);
  circuit = setInputs(circuit, { D: true });
  result = run(circuit, result.state);
  assert.equal(pin(result.state, 'FF', 'Q'), false, 'Sem borda de clock, FF deve manter Q=0');

  circuit = {
    ...circuit,
    components: circuit.components.map((c) => (c.id === 'CLK' ? { ...c, state: true } : c)),
  };
  // stepCircuit é testado indiretamente na UI; aqui validamos a avaliação nativa atual: Q vem da memória, não do D imediato.
  result = run(circuit, result.state);
  assert.equal(
    pin(result.state, 'FF', 'Q'),
    false,
    'Avaliação pura não deve capturar D sem step sequencial',
  );
}

function validDocument(): CircuitDocument {
  return {
    version: 1,
    components: [
      { id: 'A', type: 'input', x: 0, y: 0 },
      { id: 'OUT', type: 'led', x: 160, y: 0 },
    ],
    wires: [
      {
        id: 'W1',
        from: { componentId: 'A', pinId: 'out' },
        to: { componentId: 'OUT', pinId: 'in' },
      },
    ],
  };
}

function testCircuitDocumentValidationAcceptsValidCircuit() {
  assert.equal(isCircuitDocument(validDocument()), true, 'Circuito bem formado deve ser aceito');
}

function testCircuitDocumentValidationRejectsUnknownComponent() {
  const circuit = validDocument() as unknown as Record<string, unknown>;
  const components = (circuit.components as Array<Record<string, unknown>>).map((component) =>
    component.id === 'A' ? { ...component, type: 'unknown-gate' } : component,
  );

  assert.equal(
    isCircuitDocument({ ...circuit, components }),
    false,
    'Tipo de componente desconhecido deve ser rejeitado',
  );
}

function testCircuitDocumentValidationRejectsInvalidWire() {
  const circuit = validDocument();
  const danglingWire = {
    ...circuit.wires[0],
    from: { componentId: 'missing', pinId: 'out' },
  };
  const reversedWire = {
    ...circuit.wires[0],
    from: { componentId: 'OUT', pinId: 'in' },
    to: { componentId: 'A', pinId: 'out' },
  };

  assert.equal(
    isCircuitDocument({ ...circuit, wires: [danglingWire] }),
    false,
    'Referência a componente ausente deve ser rejeitada',
  );
  assert.equal(
    isCircuitDocument({ ...circuit, wires: [reversedWire] }),
    false,
    'Fio de entrada para saída deve ser rejeitado',
  );
}

function testCircuitDocumentValidationRejectsConflictingIdsAndInputs() {
  const circuit = validDocument();
  const duplicateComponent = { ...circuit.components[0] };
  const duplicateInputWire = { ...circuit.wires[0], id: 'W2' };

  assert.equal(
    isCircuitDocument({ ...circuit, components: [...circuit.components, duplicateComponent] }),
    false,
    'IDs de componente duplicados devem ser rejeitados',
  );
  assert.equal(
    isCircuitDocument({ ...circuit, wires: [...circuit.wires, duplicateInputWire] }),
    false,
    'Mais de um fio na mesma entrada deve ser rejeitado',
  );
}

function testBundledCircuitDocumentsAreValid() {
  for (const example of CIRCUIT_EXAMPLES) {
    assert.equal(
      isCircuitDocument(example.circuit),
      true,
      `Exemplo embutido ${example.id} deve respeitar o formato`,
    );
  }

  for (const filename of [
    '01_sr_latch_nor.json',
    '02_sr_latch_nand_active_low.json',
    '03_gated_d_latch_from_nand.json',
    '04_unstable_not_feedback.json',
  ]) {
    assert.equal(
      isCircuitDocument(loadExample(filename)),
      true,
      `Exemplo JSON ${filename} deve respeitar o formato`,
    );
  }
}

const tests = [
  testCombinationalStillWorks,
  testNorSrLatchKeepsState,
  testNandSrLatchActiveLowKeepsState,
  testGatedDLatchFromNand,
  testNotSelfFeedbackIsUnstable,
  testFeedbackGraphDistinguishesAcyclicCircuit,
  testStepCircuitCapturesFlipFlopOnRisingEdgeOnly,
  testRegister4CapturesOnRisingEdgeOnly,
  testAdder4BitAddsAllCombinations,
  testAdder4BitFromGatesAddsAllCombinations,
  testSubtractor4BitTwoComplementAllCombinations,
  testSubtractor4BitFromGatesAllCombinations,
  testAlu4BitAllOperationsAllCombinations,
  testTruthTableRowsForXor,
  testWireRoutingSelfLoopGoesAroundComponent,
  testCameraPointAccountsForSvgLetterboxing,
  testNativeDFlipFlopCapturesOnlyOnRisingEdge,
  testCircuitDocumentValidationAcceptsValidCircuit,
  testCircuitDocumentValidationRejectsUnknownComponent,
  testCircuitDocumentValidationRejectsInvalidWire,
  testCircuitDocumentValidationRejectsConflictingIdsAndInputs,
  testBundledCircuitDocumentsAreValid,
];

for (const test of tests) {
  test();
  console.log(`✓ ${test.name}`);
}

console.log(`\n${tests.length} testes automatizados passaram.`);
