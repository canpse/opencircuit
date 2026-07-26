import { test } from 'vitest';
import assert from 'node:assert/strict';
import { settleHierarchical, stepHierarchical } from '../../../src/core/hierarchy/simulate';
import { evaluateCircuit, stepCircuit } from '../../../src/core/evaluateCircuit';
import { CIRCUIT_EXAMPLES } from '../../../src/examples/circuitExamples';
import type { CircuitDocument } from '../../../src/core/types';

// Regressão: stepHierarchical (chamado por Tick e pelo clock automático via
// useSimulationController) é o único caminho real de avanço de tempo da UI, mas nunca
// tinha um teste próprio -- só suas peças isoladas (flattenCircuit, writeBackMemory,
// stepCircuit) eram testadas, cada uma com circuitos que nunca cruzavam as três juntas
// com um `clock` no meio. writeBackMemory só espelha `.memory` de volta pro componente
// original -- nunca `.state`, que é onde `clock` guarda sua própria oscilação. Resultado:
// a cada stepHierarchical, o CLK é re-achatado a partir do `state` original nunca
// atualizado, então todo tick "sobe" de false->true de novo, e depois do primeiro tick
// real o `previousClk` do flip-flop (esse sim persistido corretamente) trava qualquer
// nova borda de subida para sempre.

function clockAndFlipFlop(): CircuitDocument {
  return {
    version: 1,
    components: [
      { id: 'CLK', type: 'clock', x: 0, y: 0, state: false },
      { id: 'FF', type: 'd-flip-flop', x: 100, y: 0, memory: { q: false, previousClk: false } },
    ],
    wires: [
      {
        id: 'w1',
        from: { componentId: 'CLK', pinId: 'CLK' },
        to: { componentId: 'FF', pinId: 'CLK' },
      },
      { id: 'w2', from: { componentId: 'FF', pinId: 'Q' }, to: { componentId: 'FF', pinId: 'D' } },
    ],
  };
}

test('stepHierarchical toggles the clock across repeated ticks, same as calling stepCircuit directly', () => {
  let viaHierarchical: CircuitDocument = clockAndFlipFlop();
  let viaDirect: CircuitDocument = clockAndFlipFlop();

  for (let i = 0; i < 6; i++) {
    viaHierarchical = stepHierarchical(viaHierarchical, []);
    viaDirect = stepCircuit(viaDirect);

    const hierarchicalClk = viaHierarchical.components.find((c) => c.id === 'CLK');
    const directClk = viaDirect.components.find((c) => c.id === 'CLK');
    assert.equal(
      hierarchicalClk?.state,
      directClk?.state,
      `tick ${i + 1}: CLK.state deveria alternar low/high igual ao stepCircuit direto`,
    );

    const hierarchicalFF = viaHierarchical.components.find((c) => c.id === 'FF');
    const directFF = viaDirect.components.find((c) => c.id === 'FF');
    assert.deepEqual(
      hierarchicalFF?.memory,
      directFF?.memory,
      `tick ${i + 1}: memória do flip-flop deveria acompanhar o mesmo padrão de bordas`,
    );
  }
});

test('bundled example "sync-counter-8bit" counts up correctly through stepHierarchical, the real UI tick path', () => {
  const example = CIRCUIT_EXAMPLES.find((e) => e.id === 'sync-counter-8bit');
  assert.ok(example, 'exemplo sync-counter-8bit deveria existir');
  let circuit: CircuitDocument = example!.circuit;

  function readCounter(c: CircuitDocument): number {
    const values = evaluateCircuit(c);
    let n = 0;
    for (let i = 0; i < 8; i++) {
      if (Boolean(values[`L${i}`]?.in)) n += 2 ** i;
    }
    return n;
  }

  assert.equal(readCounter(circuit), 0);

  // Uma borda de subida real a cada 2 chamadas (o clock alterna low/high a cada tick),
  // então o valor contado avança a cada 2 ticks: 1,1,2,2,3,3,4,4...
  const expected = [1, 1, 2, 2, 3, 3, 4, 4, 5, 5, 6, 6, 7, 7, 8, 8];
  for (let i = 0; i < expected.length; i++) {
    circuit = stepHierarchical(circuit, []);
    assert.equal(readCounter(circuit), expected[i], `contagem errada após tick ${i + 1}`);
  }
});

// Rede de segurança para toda a coleção de exemplos empacotados, não só o contador: o
// bug real era que CLK.state nunca sobrevivia a um stepHierarchical (writeBackMemory só
// espelha .memory, nunca .state), então o clock "renascia" em false a cada tick e parava
// de alternar de verdade depois do primeiro. Esse invariante -- CLK alterna low/high a
// cada tick -- não depende de saber o comportamento esperado de cada exemplo (inclusive
// funciona para o ripple-counter-broken, que é broken por outro motivo, não este), então
// serve de smoke test genérico: qualquer exemplo com clock que volte a travar o próprio
// CLK.state quebra aqui, sem precisar de um teste dedicado por exemplo.
const examplesWithClock = CIRCUIT_EXAMPLES.filter((example) =>
  example.circuit.components.some((c) => c.id === 'CLK' && c.type === 'clock'),
);

test('sanity: bundled examples with a clock component actually have one named CLK', () => {
  // Se isso falhar, é porque um exemplo novo usa outro id -- ajustar o filtro acima, não
  // remover a checagem.
  assert.ok(
    examplesWithClock.length >= 5,
    'esperava pelo menos os 5 exemplos conhecidos com clock',
  );
});

for (const example of examplesWithClock) {
  test(`CLK alterna a cada stepHierarchical em "${example.id}"`, () => {
    let circuit: CircuitDocument = example.circuit;
    let previousClkState = circuit.components.find((c) => c.id === 'CLK')?.state;
    for (let i = 0; i < 6; i++) {
      circuit = stepHierarchical(circuit, []);
      const clkState = circuit.components.find((c) => c.id === 'CLK')?.state;
      assert.equal(clkState, !previousClkState, `tick ${i + 1}: CLK deveria ter alternado`);
      previousClkState = clkState;
    }
  });
}

test('settleHierarchical (usado por toggleInput) mantém a memória do d-latch entre múltiplos toggles', () => {
  const example = CIRCUIT_EXAMPLES.find((e) => e.id === 'd-latch-basic');
  assert.ok(example, 'exemplo d-latch-basic deveria existir');
  let circuit: CircuitDocument = example!.circuit;

  function toggleInput(c: CircuitDocument, id: string): CircuitDocument {
    const toggled: CircuitDocument = {
      ...c,
      components: c.components.map((component) =>
        component.id === id && component.type === 'input'
          ? { ...component, state: !component.state }
          : component,
      ),
    };
    return settleHierarchical(toggled, []);
  }

  function readQ(c: CircuitDocument): boolean {
    return Boolean(evaluateCircuit(c).Q?.in);
  }

  // EN=0, D=0 -> liga EN (EN=1): com EN=1, Q deve acompanhar D=0 -> Q=false.
  circuit = toggleInput(circuit, 'EN');
  assert.equal(readQ(circuit), false);

  // Ainda com EN=1, liga D (D=1): Q deve acompanhar -> Q=true.
  circuit = toggleInput(circuit, 'D');
  assert.equal(readQ(circuit), true);

  // Desliga EN (EN=0): Q deve reter o último valor (true), mesmo depois de múltiplos
  // toggles anteriores -- exatamente o caminho de settleHierarchical + writeBackMemory
  // que nunca tinha teste próprio.
  circuit = toggleInput(circuit, 'EN');
  assert.equal(readQ(circuit), true);

  // Muda D com EN ainda em 0: Q não deve se mover.
  circuit = toggleInput(circuit, 'D');
  assert.equal(readQ(circuit), true);
});
