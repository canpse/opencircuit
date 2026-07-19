import { test } from 'vitest';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { simulateCircuit, stepCircuit } from '../../src/core/evaluateCircuit';
import { createSimulationSession } from '../../src/core/simulation/simulationSession';
import type {
  SimulationRequest,
  SimulationResponse,
} from '../../src/core/simulation/simulationSession';
import type { CircuitDocument, SimulationResult } from '../../src/core/types';

// Cobre a corrida de previousState do auto-clock com o worker (issue #10).
//
// O modelo abaixo espelha o protocolo de useSimulationRuntime.ts:
// - cada mudança de `circuit` posta { type: 'simulate', id, circuit } ao worker;
// - o estado da simulação vive na sessão do worker, que processa em FIFO;
// - o handler só aceita a resposta cujo `id` é o da última requisição
//   (o cleanup do effect remove o listener das anteriores, que são descartadas).
//
// Circuito: latch D de NANDs (exemplo 03) com EN dirigido por um clock,
// avançado por stepCircuit — o mesmo fluxo do auto-clock do App
// (setCircuit((current) => stepCircuit(current))).
//
// Os dois testes executam a MESMA sequência de mudanças de circuito;
// a única diferença é quando as respostas do worker chegam.

function loadGatedDLatchWithClockEnable(): CircuitDocument {
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
    // O componente clock emite no pino CLK (não em 'out' como o input).
    wires: circuit.wires.map((wire) =>
      wire.from.componentId === 'EN' ? { ...wire, from: { ...wire.from, pinId: 'CLK' } } : wire,
    ),
  };
}

function setInputD(circuit: CircuitDocument, value: boolean): CircuitDocument {
  return {
    ...circuit,
    components: circuit.components.map((component) =>
      component.id === 'D' ? { ...component, state: value } : component,
    ),
  };
}

// Reproduz o worker real: as requisições são processadas em FIFO pela sessão
// com estado, mas as respostas só chegam à thread principal quando o teste
// chama deliverNextResponse — permitindo simular round-trips lentos.
class FakeSimulationWorker {
  private session = createSimulationSession();
  private queue: SimulationRequest[] = [];

  postMessage(request: SimulationRequest) {
    this.queue.push(request);
  }

  processNext(): SimulationResponse | null {
    const request = this.queue.shift();
    assert.ok(request, 'não há requisição pendente no worker');
    return this.session.handle(request);
  }

  deliverNextResponse(): SimulationResponse {
    const response = this.processNext();
    assert.ok(response, 'requisição de simulação deve produzir resposta');
    return response;
  }

  get pending(): number {
    return this.queue.length;
  }
}

// Espelha useSimulationRuntime: postagem por mudança de circuito e
// filtro por id da última requisição.
class SimulationRuntimeModel {
  private messageId = 0;
  lastResult: SimulationResult | undefined = undefined;

  constructor(private worker: FakeSimulationWorker) {}

  onCircuitChange(circuit: CircuitDocument) {
    this.messageId += 1;
    this.worker.postMessage({ type: 'simulate', id: this.messageId, circuit });
  }

  onWorkerMessage(response: SimulationResponse) {
    if (response.id !== this.messageId) return; // listener antigo já removido pelo cleanup
    this.lastResult = response.result;
  }
}

function ledQ(result: SimulationResult | undefined): boolean {
  const value = result?.state.values.Q?.in;
  assert.equal(typeof value, 'boolean', 'LED Q não foi avaliado');
  return value as boolean;
}

// Prepara o runtime com Q=0 consolidado: captura D=0 com o clock alto,
// segura com o clock baixo e então troca D para 1 (ainda com EN=0).
// Todas as respostas chegam a tempo nesta fase.
function settleQZeroThenRaiseD(worker: FakeSimulationWorker, runtime: SimulationRuntimeModel) {
  let circuit = setInputD(loadGatedDLatchWithClockEnable(), false);

  runtime.onCircuitChange(circuit); // montagem (EN=0, D=0)
  runtime.onWorkerMessage(worker.deliverNextResponse());

  circuit = stepCircuit(circuit); // clock sobe: captura D=0
  runtime.onCircuitChange(circuit);
  runtime.onWorkerMessage(worker.deliverNextResponse());

  circuit = stepCircuit(circuit); // clock desce: segura Q=0
  runtime.onCircuitChange(circuit);
  runtime.onWorkerMessage(worker.deliverNextResponse());
  assert.equal(ledQ(runtime.lastResult), false, 'preparação: Q deve estar consolidado em 0');

  circuit = setInputD(circuit, true); // usuário liga D com EN=0: Q segue 0
  runtime.onCircuitChange(circuit);
  runtime.onWorkerMessage(worker.deliverNextResponse());
  assert.equal(ledQ(runtime.lastResult), false, 'preparação: D=1 com EN=0 não altera Q');

  return circuit;
}

test('Clock lento: latch D captura D=1 quando cada resposta do worker chega antes do próximo tick', () => {
  const worker = new FakeSimulationWorker();
  const runtime = new SimulationRuntimeModel(worker);
  let circuit = settleQZeroThenRaiseD(worker, runtime);

  // Tick A: clock sobe (EN=1), latch transparente captura D=1.
  circuit = stepCircuit(circuit);
  runtime.onCircuitChange(circuit);
  runtime.onWorkerMessage(worker.deliverNextResponse());
  assert.equal(ledQ(runtime.lastResult), true, 'com EN=1, Q deve acompanhar D=1');

  // Tick B: clock desce (EN=0), latch deve segurar Q=1.
  circuit = stepCircuit(circuit);
  runtime.onCircuitChange(circuit);
  runtime.onWorkerMessage(worker.deliverNextResponse());
  assert.equal(ledQ(runtime.lastResult), true, 'com EN=0, Q deve manter o valor capturado');
});

test('Clock rápido: latch D mantém Q=1 mesmo com dois ticks antes das respostas do worker', () => {
  const worker = new FakeSimulationWorker();
  const runtime = new SimulationRuntimeModel(worker);
  let circuit = settleQZeroThenRaiseD(worker, runtime);

  // Tick A: clock sobe (EN=1). A requisição é postada, mas a simulação
  // demora mais que o intervalo do clock — a resposta ainda não chegou...
  circuit = stepCircuit(circuit);
  runtime.onCircuitChange(circuit);

  // Tick B: ...e o clock desce (EN=0). Como o estado vive na sessão do
  // worker (FIFO), esta requisição será simulada a partir do resultado
  // do tick A, mesmo sem nenhuma resposta ter chegado à thread principal.
  circuit = stepCircuit(circuit);
  runtime.onCircuitChange(circuit);

  // As respostas chegam agora: a do tick A é descartada (id antigo,
  // listener removido) e a do tick B é aplicada.
  runtime.onWorkerMessage(worker.deliverNextResponse());
  runtime.onWorkerMessage(worker.deliverNextResponse());
  assert.equal(worker.pending, 0);

  // O clock subiu com D=1 e desceu: o latch capturou 1 e deve segurar.
  assert.equal(
    ledQ(runtime.lastResult),
    true,
    'com respostas atrasadas, Q deve manter o valor capturado no tick A',
  );
});

test('Reset da sessão descarta a memória do latch antes da próxima simulação', () => {
  const worker = new FakeSimulationWorker();
  const runtime = new SimulationRuntimeModel(worker);
  let circuit = settleQZeroThenRaiseD(worker, runtime);

  // Consolida Q=1 (clock sobe com D=1 e desce).
  circuit = stepCircuit(circuit);
  runtime.onCircuitChange(circuit);
  runtime.onWorkerMessage(worker.deliverNextResponse());
  circuit = stepCircuit(circuit);
  runtime.onCircuitChange(circuit);
  runtime.onWorkerMessage(worker.deliverNextResponse());
  assert.equal(ledQ(runtime.lastResult), true, 'preparação: Q deve estar consolidado em 1');

  // Espelha resetSimulationRuntime: mensagem de reset seguida de nova
  // simulação do mesmo circuito, tudo na mesma fila FIFO.
  circuit = setInputD(circuit, false);
  worker.postMessage({ type: 'reset' });
  runtime.onCircuitChange(circuit);
  assert.equal(worker.processNext(), null, 'reset não deve produzir resposta');
  runtime.onWorkerMessage(worker.deliverNextResponse());
  assert.deepEqual(
    runtime.lastResult,
    simulateCircuit(circuit),
    'após reset, o resultado deve ser o de uma simulação sem estado anterior',
  );
});
