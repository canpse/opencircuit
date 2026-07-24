import { test } from 'vitest';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { stepCircuit } from '../../src/core/evaluateCircuit';
import { createSimulationSession } from '../../src/core/simulation/simulationSession';
import { createWaveformRecorder, recordTickSample } from '../../src/core/simulation/waveform';
import type {
  SimulationRequest,
  SimulationResponse,
} from '../../src/core/simulation/simulationSession';
import type { CircuitDocument, SimulationResult } from '../../src/core/types';

// Cobre a corrida entre o avanço do clock automático e a chegada da
// resposta do worker sob renderização pesada: sob carga, o React pode
// juntar o avanço do tick seguinte no mesmo commit da resposta do tick
// anterior. Se useWaveformHistory relesse circuit/tickCount "atuais" do
// editor nesse momento, gravaria a amostra do tick N com os valores do
// tick N-1 — indistinguível de um bit invertido, já que o clock alterna
// a cada tick. O fix (useSimulationRuntime.ts) emparelha circuit/tick com
// o resultado dentro do próprio closure da requisição; este teste modela
// esse emparelhamento e prova que ele nunca lê um "tick atual" externo.

function loadClockedDLatch(): CircuitDocument {
  const circuit = JSON.parse(
    readFileSync(
      join(process.cwd(), 'examples/sequential-feedback', '03_gated_d_latch_from_nand.json'),
      'utf8',
    ),
  ) as CircuitDocument;

  return {
    ...circuit,
    components: circuit.components.map((component) =>
      component.id === 'EN' ? { ...component, type: 'clock' as const, state: false } : component,
    ),
    wires: circuit.wires.map((wire) =>
      wire.from.componentId === 'EN' ? { ...wire, from: { ...wire.from, pinId: 'CLK' } } : wire,
    ),
  };
}

class FakeSimulationWorker {
  private session = createSimulationSession();
  private queue: SimulationRequest[] = [];

  postMessage(request: SimulationRequest) {
    this.queue.push(request);
  }

  deliverNextResponse(): SimulationResponse {
    const request = this.queue.shift();
    assert.ok(request, 'não há requisição pendente no worker');
    const response = this.session.handle(request);
    assert.ok(response, 'requisição de simulação deve produzir resposta');
    return response;
  }
}

// Espelha useSimulationRuntime pós-fix: circuit/tick ficam presos ao
// closure de cada requisição, não a uma variável externa mutável.
class SimulationRuntimeModel {
  private messageId = 0;
  private pairedByMessageId = new Map<number, { circuit: CircuitDocument; tick: number }>();
  simulationState: { result: SimulationResult | undefined; circuit: CircuitDocument; tick: number };

  constructor(
    private worker: FakeSimulationWorker,
    initialCircuit: CircuitDocument,
  ) {
    this.simulationState = { result: undefined, circuit: initialCircuit, tick: 0 };
  }

  onTick(circuit: CircuitDocument, tick: number) {
    this.messageId += 1;
    const id = this.messageId;
    this.pairedByMessageId.set(id, { circuit, tick });
    this.worker.postMessage({ type: 'simulate', id, circuit });
  }

  onWorkerMessage(response: SimulationResponse) {
    if (response.id !== this.messageId) return; // listener antigo já removido pelo cleanup
    const paired = this.pairedByMessageId.get(response.id);
    assert.ok(paired, 'resposta aceita deve ter um par circuit/tick registrado');
    this.simulationState = { result: response.result, circuit: paired.circuit, tick: paired.tick };
  }
}

test('Amostra da forma de onda nunca mistura o resultado de um tick com o circuito/contador de outro', () => {
  const worker = new FakeSimulationWorker();
  let circuit = loadClockedDLatch();
  const runtime = new SimulationRuntimeModel(worker, circuit);
  let recorder = createWaveformRecorder();

  function recordFromCurrentState() {
    if (!runtime.simulationState.result) return;
    recorder = recordTickSample(
      recorder,
      runtime.simulationState.tick,
      runtime.simulationState.result.values,
    );
  }

  // Tick 1: clock sobe. A requisição é postada, mas — diferente de um
  // round-trip normal — a resposta ainda NÃO chega antes do próximo tick,
  // simulando um commit lento sob carga pesada.
  circuit = stepCircuit(circuit);
  runtime.onTick(circuit, 1);

  // Tick 2 dispara antes da resposta do tick 1 ter sido processada — é
  // exatamente o que o agendador do React pode fazer sob renderização
  // pesada: aplicar o avanço do próximo tick no mesmo commit da resposta
  // anterior. O circuito e o tick "externos" já avançaram para 2 aqui.
  circuit = stepCircuit(circuit);
  runtime.onTick(circuit, 2);

  // As duas respostas chegam agora. A do tick 1 é descartada pelo filtro
  // de id (listener antigo já foi removido pelo cleanup do effect); só a
  // do tick 2 é aplicada — e ela deve trazer consigo o circuito e o
  // número de tick corretos (2), não os que estariam "atuais" por fora.
  runtime.onWorkerMessage(worker.deliverNextResponse());
  recordFromCurrentState();
  runtime.onWorkerMessage(worker.deliverNextResponse());
  recordFromCurrentState();

  assert.equal(
    recorder.samples.length,
    1,
    'a resposta do tick 1 (descartada) não deve gravar amostra',
  );
  const sample = recorder.samples[0];
  assert.equal(sample.tick, 2, 'a amostra gravada deve ser rotulada com o tick que a produziu');
  assert.equal(
    sample.evaluation.EN?.CLK,
    false,
    'o valor do clock no snapshot deve ser o do tick 2 (baixo, após subir no tick 1), não o de outro tick',
  );
});
