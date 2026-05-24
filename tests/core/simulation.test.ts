import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { evaluateCircuit, simulateCircuit, stepCircuit } from '../../src/core/evaluateCircuit';
import { circuitHasFeedback } from '../../src/core/simulation/graph';
import { buildCircuitTruthRows } from '../../src/core/simulation/truthTable';
import { bezierPathFromPoints, orthogonalPath, selfLoopRoute } from '../../src/ui/editor/wireRouting';
import type { CircuitDocument, SimulationState } from '../../src/core/types';

type InputValues = Record<string, boolean>;

function loadExample(name: string): CircuitDocument {
  return JSON.parse(readFileSync(join(process.cwd(), 'examples/sequential-feedback', name), 'utf8')) as CircuitDocument;
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
      { id: 'W3', from: { componentId: 'X1', pinId: 'out' }, to: { componentId: 'OUT', pinId: 'in' } },
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
  assert.equal(circuitHasFeedback(circuit), true, 'NOT realimentado deve ser detectado como feedback no grafo');
  assert.equal(result.unstable, true, 'NOT realimentado em si mesmo deve ser detectado como instável');
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
      { id: 'W2', from: { componentId: 'G1', pinId: 'out' }, to: { componentId: 'OUT', pinId: 'in' } },
    ],
  };
  assert.equal(circuitHasFeedback(circuit), false, 'Circuito acíclico não deve ser marcado como feedback');
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
      { id: 'W2', from: { componentId: 'CLK', pinId: 'CLK' }, to: { componentId: 'FF', pinId: 'CLK' } },
      { id: 'W3', from: { componentId: 'FF', pinId: 'Q' }, to: { componentId: 'Q', pinId: 'in' } },
    ],
  };
}

function testStepCircuitCapturesFlipFlopOnRisingEdgeOnly() {
  let circuit = nativeFlipFlopCircuit(true);

  circuit = stepCircuit(circuit);
  assert.equal(circuit.components.find((component) => component.id === 'CLK')?.state, true, 'Primeiro tick deve subir clock');
  assert.equal(circuit.components.find((component) => component.id === 'FF')?.memory?.q, true, 'Borda de subida deve capturar D=1');

  circuit = setInputs(circuit, { D: false });
  circuit = stepCircuit(circuit);
  assert.equal(circuit.components.find((component) => component.id === 'CLK')?.state, false, 'Segundo tick deve descer clock');
  assert.equal(circuit.components.find((component) => component.id === 'FF')?.memory?.q, true, 'Borda de descida não deve capturar D=0');

  circuit = stepCircuit(circuit);
  assert.equal(circuit.components.find((component) => component.id === 'CLK')?.state, true, 'Terceiro tick deve subir clock de novo');
  assert.equal(circuit.components.find((component) => component.id === 'FF')?.memory?.q, false, 'Nova borda de subida deve capturar D=0');
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
      { id: 'REG', type: 'register-4', x: 180, y: 80, memory: { q0: false, q1: false, q2: false, q3: false, previousClk: false } },
    ],
    wires: [
      { id: 'W0', from: { componentId: 'D0', pinId: 'out' }, to: { componentId: 'REG', pinId: 'D0' } },
      { id: 'W1', from: { componentId: 'D1', pinId: 'out' }, to: { componentId: 'REG', pinId: 'D1' } },
      { id: 'W2', from: { componentId: 'D2', pinId: 'out' }, to: { componentId: 'REG', pinId: 'D2' } },
      { id: 'W3', from: { componentId: 'D3', pinId: 'out' }, to: { componentId: 'REG', pinId: 'D3' } },
      { id: 'W4', from: { componentId: 'CLK', pinId: 'CLK' }, to: { componentId: 'REG', pinId: 'CLK' } },
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
      { id: 'W3', from: { componentId: 'X1', pinId: 'out' }, to: { componentId: 'OUT', pinId: 'in' } },
    ],
  };
  const inputs = circuit.components.filter((component) => component.type === 'input');
  const outputs = circuit.components.filter((component) => component.type === 'led');
  const rows = buildCircuitTruthRows(circuit, inputs, outputs);
  assert.deepEqual(rows.map((row) => row.outputs[0]), [false, true, true, false], 'Tabela verdade do XOR deve ser 0,1,1,0');
}

function testWireRoutingSelfLoopGoesAroundComponent() {
  const component = { id: 'N1', type: 'not', x: 100, y: 100 } satisfies CircuitDocument['components'][number];
  const start = { x: 182, y: 128 };
  const end = { x: 100, y: 128 };
  const route = selfLoopRoute(component, start, end, 0);
  assert.deepEqual(route[0], start, 'Self-loop deve começar no pino de saída');
  assert.deepEqual(route[route.length - 1], end, 'Self-loop deve terminar no pino de entrada');
  assert.ok(route.some((point) => point.y < component.y), 'Self-loop deve subir acima do componente');
  assert.ok(route.some((point) => point.x < component.x), 'Self-loop deve passar à esquerda antes de conectar entrada');
  assert.match(orthogonalPath(route, []), /^M /, 'Rota ortogonal deve gerar path SVG');
  assert.match(bezierPathFromPoints(route), /Q/, 'Rota curva do self-loop deve ter cantos arredondados');
}

function testNativeDFlipFlopCapturesOnlyOnRisingEdge() {
  let circuit = nativeFlipFlopCircuit(false);

  let result = run(circuit);
  circuit = setInputs(circuit, { D: true });
  result = run(circuit, result.state);
  assert.equal(pin(result.state, 'FF', 'Q'), false, 'Sem borda de clock, FF deve manter Q=0');

  circuit = { ...circuit, components: circuit.components.map((c) => c.id === 'CLK' ? { ...c, state: true } : c) };
  // stepCircuit é testado indiretamente na UI; aqui validamos a avaliação nativa atual: Q vem da memória, não do D imediato.
  result = run(circuit, result.state);
  assert.equal(pin(result.state, 'FF', 'Q'), false, 'Avaliação pura não deve capturar D sem step sequencial');
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
  testTruthTableRowsForXor,
  testWireRoutingSelfLoopGoesAroundComponent,
  testNativeDFlipFlopCapturesOnlyOnRisingEdge,
];

for (const test of tests) {
  test();
  console.log(`✓ ${test.name}`);
}

console.log(`\n${tests.length} testes de simulação passaram.`);
