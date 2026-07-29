import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { test } from 'vitest';
import { simulateCircuit } from '../../src/core/evaluateCircuit';
import { buildEvaluationPlan, circuitHasFeedback } from '../../src/core/simulation/graph';
import type {
  CircuitDocument,
  LogicComponent,
  SimulationResult,
  SimulationState,
  Wire,
} from '../../src/core/types';

function inverterChain(length: number, reversed = false): CircuitDocument {
  const gates: LogicComponent[] = Array.from({ length }, (_, index) => ({
    id: `N${String(index).padStart(4, '0')}`,
    type: 'not',
    x: 100 + index * 80,
    y: 0,
  }));
  const components: LogicComponent[] = [
    { id: 'IN', type: 'input', x: 0, y: 0, state: true },
    ...gates,
    { id: 'OUT', type: 'led', x: 180 + length * 80, y: 0 },
  ];
  const wires: Wire[] = gates.map((gate, index) => ({
    id: `W${String(index).padStart(4, '0')}`,
    from:
      index === 0
        ? { componentId: 'IN', pinId: 'out' }
        : { componentId: gates[index - 1].id, pinId: 'out' },
    to: { componentId: gate.id, pinId: 'in' },
  }));
  wires.push({
    id: 'W-OUT',
    from: { componentId: gates[gates.length - 1].id, pinId: 'out' },
    to: { componentId: 'OUT', pinId: 'in' },
  });

  return {
    version: 1,
    components: reversed ? [...components].reverse() : components,
    wires: reversed ? [...wires].reverse() : wires,
  };
}

function reverseDocument(circuit: CircuitDocument): CircuitDocument {
  return {
    ...circuit,
    components: [...circuit.components].reverse(),
    wires: [...circuit.wires].reverse(),
  };
}

function loadExample(name: string): CircuitDocument {
  return JSON.parse(
    readFileSync(join(process.cwd(), 'examples/sequential-feedback', name), 'utf8'),
  ) as CircuitDocument;
}

function setInputs(circuit: CircuitDocument, states: Record<string, boolean>): CircuitDocument {
  return {
    ...circuit,
    components: circuit.components.map((component) =>
      component.type === 'input' && component.id in states
        ? { ...component, state: states[component.id] }
        : component,
    ),
  };
}

function observable(result: SimulationResult, componentId: string, pinId: string): boolean {
  return Boolean(result.values[componentId]?.[pinId]);
}

test('cadeia combinacional profunda converge em uma passagem independentemente da ordem', () => {
  const forward = simulateCircuit(inverterChain(1_000));
  const reversed = simulateCircuit(inverterChain(1_000, true));

  assert.equal(forward.status, 'stable');
  assert.equal(reversed.status, 'stable');
  assert.equal(forward.iterations, 1);
  assert.equal(reversed.iterations, 1);
  assert.deepEqual(reversed.values, forward.values);
  assert.equal(observable(forward, 'OUT', 'in'), true);
});

test('plano de avaliação é determinístico, cacheado e agrupa apenas o SCC combinacional', () => {
  const circuit: CircuitDocument = {
    version: 1,
    components: [
      { id: 'OUT', type: 'led', x: 400, y: 0 },
      { id: 'B', type: 'nor', x: 260, y: 0 },
      { id: 'SOURCE', type: 'input', x: 0, y: 0, state: true },
      { id: 'A', type: 'nor', x: 140, y: 0 },
    ],
    wires: [
      {
        id: 'W4',
        from: { componentId: 'B', pinId: 'out' },
        to: { componentId: 'OUT', pinId: 'in' },
      },
      { id: 'W3', from: { componentId: 'B', pinId: 'out' }, to: { componentId: 'A', pinId: 'b' } },
      { id: 'W2', from: { componentId: 'A', pinId: 'out' }, to: { componentId: 'B', pinId: 'a' } },
      {
        id: 'W1',
        from: { componentId: 'SOURCE', pinId: 'out' },
        to: { componentId: 'A', pinId: 'a' },
      },
    ],
  };

  const plan = buildEvaluationPlan(circuit);
  assert.equal(buildEvaluationPlan(circuit), plan, 'o plano deve ser reutilizado por identidade');
  assert.equal(plan.hasFeedback, true);
  assert.deepEqual(
    plan.groups.filter((group) => group.cyclic).map((group) => group.componentIds),
    [['A', 'B']],
  );
});

test('latch SR produz o mesmo estado com componentes e fios em ordem inversa', () => {
  let forwardCircuit = loadExample('01_sr_latch_nor.json');
  let reversedCircuit = reverseDocument(forwardCircuit);
  let forwardState: SimulationState | undefined;
  let reversedState: SimulationState | undefined;

  for (const inputs of [
    { S: true, R: false },
    { S: false, R: false },
    { S: false, R: true },
    { S: false, R: false },
  ]) {
    forwardCircuit = setInputs(forwardCircuit, inputs);
    reversedCircuit = setInputs(reversedCircuit, inputs);
    const forward = simulateCircuit(forwardCircuit, forwardState);
    const reversed = simulateCircuit(reversedCircuit, reversedState);
    forwardState = forward.state;
    reversedState = reversed.state;

    assert.equal(forward.status, 'stable');
    assert.equal(reversed.status, 'stable');
    assert.equal(observable(reversed, 'Q', 'in'), observable(forward, 'Q', 'in'));
    assert.equal(observable(reversed, 'QB', 'in'), observable(forward, 'QB', 'in'));
  }
});

test('oscilação e esgotamento do limite computacional têm estados distintos', () => {
  const circuit = loadExample('04_unstable_not_feedback.json');
  const oscillating = simulateCircuit(circuit);
  const limited = simulateCircuit(circuit, undefined, { maxFeedbackEvaluations: 1 });

  assert.equal(oscillating.status, 'oscillating');
  assert.equal(oscillating.unstable, true);
  assert.equal(limited.status, 'iteration-limit');
  assert.equal(limited.unstable, true);
});

test('componente sequencial interrompe um ciclo de dependência combinacional', () => {
  const circuit: CircuitDocument = {
    version: 1,
    components: [
      {
        id: 'FF',
        type: 'd-flip-flop',
        x: 0,
        y: 0,
        memory: { q: true, previousClk: false },
      },
      { id: 'N', type: 'not', x: 180, y: 0 },
    ],
    wires: [
      { id: 'W1', from: { componentId: 'FF', pinId: 'Q' }, to: { componentId: 'N', pinId: 'in' } },
      { id: 'W2', from: { componentId: 'N', pinId: 'out' }, to: { componentId: 'FF', pinId: 'D' } },
    ],
  };

  assert.equal(circuitHasFeedback(circuit), false);
  assert.equal(simulateCircuit(circuit).status, 'stable');
});
