import { test } from 'vitest';
import assert from 'node:assert/strict';
import { simulateCircuit, stepCircuit } from '../../src/core/evaluateCircuit';
import {
  createWaveformRecorder,
  listObservableSignals,
  recordTickSample,
  sampleSignals,
  signalKey,
} from '../../src/core/simulation/waveform';
import type { CircuitDocument, SimulationState } from '../../src/core/types';

// Cobre o núcleo de amostragem do waveform viewer (issue #15): extração dos
// sinais observáveis, amostragem da avaliação e o gravador de uma amostra
// por tick usado pelo hook useWaveformHistory.

// Clock → Flip-Flop D ← Input D; a saída Q acende um LED. É o menor circuito
// em que o valor amostrado depende do histórico de ticks.
function buildFlipFlopCircuit(dState: boolean): CircuitDocument {
  return {
    version: 1,
    components: [
      { id: 'D', type: 'input', x: 0, y: 100, state: dState },
      { id: 'CLK', type: 'clock', x: 0, y: 0, state: false },
      { id: 'FF', type: 'd-flip-flop', x: 200, y: 50 },
      { id: 'Q', type: 'led', x: 400, y: 50 },
    ],
    wires: [
      {
        id: 'w1',
        from: { componentId: 'CLK', pinId: 'CLK' },
        to: { componentId: 'FF', pinId: 'CLK' },
      },
      { id: 'w2', from: { componentId: 'D', pinId: 'out' }, to: { componentId: 'FF', pinId: 'D' } },
      { id: 'w3', from: { componentId: 'FF', pinId: 'Q' }, to: { componentId: 'Q', pinId: 'in' } },
    ],
  };
}

test('listObservableSignals expõe clock, entradas, memórias e LEDs na ordem de diagrama', () => {
  const circuit = buildFlipFlopCircuit(false);
  circuit.components.push(
    { id: 'G1', type: 'and', x: 0, y: 200 },
    { id: 'T1', type: 'text', x: 0, y: 300, label: 'nota' },
    { id: 'REG', type: 'register-4', x: 200, y: 200, label: 'Acumulador' },
  );

  const signals = listObservableSignals(circuit);

  assert.deepEqual(
    signals.map((signal) => signal.key),
    ['CLK:CLK', 'D:out', 'FF:Q', 'REG:Q0', 'REG:Q1', 'REG:Q2', 'REG:Q3', 'Q:in'],
    'porta AND e texto ficam de fora; clock vem antes de entradas, memórias e LEDs',
  );

  const registerSignals = signals.filter((signal) => signal.componentId === 'REG');
  assert.deepEqual(
    registerSignals.map((signal) => signal.label),
    ['Acumulador.Q0', 'Acumulador.Q1', 'Acumulador.Q2', 'Acumulador.Q3'],
    'componentes com vários pinos observados ganham sufixo do pino no rótulo',
  );

  const ffSignal = signals.find((signal) => signal.componentId === 'FF');
  assert.equal(
    ffSignal?.label,
    'Flip-Flop D',
    'sem label do usuário, o rótulo vem da definição do catálogo',
  );
});

test('sampleSignals lê a avaliação por sinal e assume false para valores ausentes', () => {
  const circuit = buildFlipFlopCircuit(true);
  const evaluation = simulateCircuit(circuit).values;

  const sample = sampleSignals(circuit, evaluation);

  assert.equal(sample[signalKey('D', 'out')], true, 'entrada ligada aparece como true');
  assert.equal(sample[signalKey('CLK', 'CLK')], false, 'clock começa baixo');
  assert.equal(sample[signalKey('Q', 'in')], false, 'flip-flop ainda não capturou D');

  const partialSample = sampleSignals(circuit, {});
  assert.deepEqual(
    Object.values(partialSample),
    [false, false, false, false],
    'avaliação vazia produz false para todos os sinais, nunca undefined',
  );
});

test('recordTickSample grava uma amostra por tick e respeita a capacidade', () => {
  const circuit = buildFlipFlopCircuit(false);
  const evaluation = simulateCircuit(circuit).values;
  let recorder = createWaveformRecorder();

  recorder = recordTickSample(recorder, 0, circuit, evaluation);
  assert.equal(recorder.samples.length, 1);
  assert.equal(recorder.lastRecordedTick, 0);

  const unchanged = recordTickSample(recorder, 0, circuit, evaluation);
  assert.equal(unchanged, recorder, 'tick já gravado devolve o gravador intacto');

  for (let tick = 1; tick <= 5; tick += 1) {
    recorder = recordTickSample(recorder, tick, circuit, evaluation, 3);
  }
  assert.deepEqual(
    recorder.samples.map((sample) => sample.tick),
    [3, 4, 5],
    'ao exceder a capacidade, as amostras mais antigas são descartadas',
  );
});

test('fluxo do auto-clock: amostras acompanham a captura do flip-flop tick a tick', () => {
  // Espelha o encadeamento do worker (simulationSession): cada simulação
  // parte do estado da anterior, como no workerClockRace.test.ts.
  let state: SimulationState | undefined;
  const simulate = (circuit: CircuitDocument) => {
    const result = simulateCircuit(circuit, state);
    state = result.state;
    return result;
  };

  let circuit = buildFlipFlopCircuit(true);
  let tickCount = 0;
  let recorder = createWaveformRecorder();

  // Montagem: o primeiro resultado grava o estado inicial como tick 0.
  recorder = recordTickSample(recorder, tickCount, circuit, simulate(circuit).values);

  // Tick 1: clock sobe, flip-flop captura D=1.
  circuit = stepCircuit(circuit);
  tickCount += 1;
  recorder = recordTickSample(recorder, tickCount, circuit, simulate(circuit).values);

  // Tick 2: clock desce, Q segue retido em 1.
  circuit = stepCircuit(circuit);
  tickCount += 1;
  recorder = recordTickSample(recorder, tickCount, circuit, simulate(circuit).values);

  const q = signalKey('Q', 'in');
  const clk = signalKey('CLK', 'CLK');
  assert.deepEqual(
    recorder.samples.map((sample) => [sample.tick, sample.values[clk], sample.values[q]]),
    [
      [0, false, false],
      [1, true, true],
      [2, false, true],
    ],
    'a forma de onda registra a subida do clock e a captura de Q',
  );
});

test('clock rápido: tick sem resposta do worker fica sem amostra, sem corromper as demais', () => {
  // Limitação conhecida da v1 (issue #15): useSimulationRuntime descarta
  // respostas que não sejam a da última requisição, então dois ticks antes
  // de qualquer resposta produzem uma única amostra — a do tick final, com
  // valores consistentes porque o estado encadeia no worker em FIFO.
  let state: SimulationState | undefined;
  const simulate = (circuit: CircuitDocument) => {
    const result = simulateCircuit(circuit, state);
    state = result.state;
    return result;
  };

  let circuit = buildFlipFlopCircuit(true);
  let tickCount = 0;
  let recorder = createWaveformRecorder();

  recorder = recordTickSample(recorder, tickCount, circuit, simulate(circuit).values);

  // Tick 1: clock sobe. O worker simula (estado encadeia), mas a resposta
  // é descartada na thread principal — nada é gravado.
  circuit = stepCircuit(circuit);
  tickCount += 1;
  simulate(circuit);

  // Tick 2: clock desce. Só esta resposta chega e é gravada.
  circuit = stepCircuit(circuit);
  tickCount += 1;
  recorder = recordTickSample(recorder, tickCount, circuit, simulate(circuit).values);

  const q = signalKey('Q', 'in');
  assert.deepEqual(
    recorder.samples.map((sample) => [sample.tick, sample.values[q]]),
    [
      [0, false],
      [2, true],
    ],
    'o tick 1 fica sem amostra, mas o tick 2 reflete a captura feita na subida',
  );
});
