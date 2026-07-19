import { test } from 'vitest';
import assert from 'node:assert/strict';
import { stepCircuit } from '../../src/core/evaluateCircuit';
import { sameCanvasLayout, sameEvaluationValues } from '../../src/ui/editor/canvasMemo';
import type { CircuitDocument } from '../../src/core/types';

// A memoização do canvas (issue #9) depende de duas propriedades:
// 1. um tick de clock não muda o layout (sameCanvasLayout) nem a identidade
//    dos componentes combinacionais (stepCircuit preserva referências);
// 2. fatias de avaliação com os mesmos valores são consideradas iguais
//    (sameEvaluationValues), mesmo sendo objetos recriados a cada tick.

function clockedCircuit(): CircuitDocument {
  return {
    version: 1,
    components: [
      { id: 'CLK', type: 'clock', x: 0, y: 0, state: false },
      { id: 'D', type: 'input', x: 0, y: 80, state: true },
      { id: 'G1', type: 'and', x: 160, y: 20 },
      { id: 'OUT', type: 'led', x: 320, y: 20 },
      { id: 'FF', type: 'd-flip-flop', x: 160, y: 120, memory: { q: false, previousClk: false } },
    ],
    wires: [
      {
        id: 'W1',
        from: { componentId: 'CLK', pinId: 'CLK' },
        to: { componentId: 'G1', pinId: 'a' },
      },
      { id: 'W2', from: { componentId: 'D', pinId: 'out' }, to: { componentId: 'G1', pinId: 'b' } },
      {
        id: 'W3',
        from: { componentId: 'G1', pinId: 'out' },
        to: { componentId: 'OUT', pinId: 'in' },
      },
      { id: 'W4', from: { componentId: 'D', pinId: 'out' }, to: { componentId: 'FF', pinId: 'D' } },
    ],
  };
}

test('Tick de clock preserva o layout do canvas', () => {
  const before = clockedCircuit();
  const after = stepCircuit(before);
  assert.equal(
    sameCanvasLayout(before.components, after.components),
    true,
    'stepCircuit só muda state/memory; o layout deve ser considerado o mesmo',
  );
});

test('Tick de clock preserva a identidade referencial de componentes combinacionais e fios', () => {
  const before = clockedCircuit();
  const after = stepCircuit(before);
  const byId = (circuit: CircuitDocument, id: string) =>
    circuit.components.find((component) => component.id === id);

  for (const id of ['D', 'G1', 'OUT']) {
    assert.equal(
      byId(before, id),
      byId(after, id),
      `componente ${id} não muda no tick e deve manter a mesma referência`,
    );
  }
  assert.notEqual(byId(before, 'CLK'), byId(after, 'CLK'), 'o clock muda de estado no tick');
  assert.equal(before.wires, after.wires, 'o array de fios deve manter a mesma referência');
});

test('Segundo tick também preserva identidade de componentes sequenciais já normalizados', () => {
  const once = stepCircuit(clockedCircuit());
  const twice = stepCircuit(once);
  const gateOnce = once.components.find((component) => component.id === 'G1');
  const gateTwice = twice.components.find((component) => component.id === 'G1');
  assert.equal(
    gateOnce,
    gateTwice,
    'a normalização sequencial não deve recriar componentes já normalizados',
  );
});

test('Mudanças de layout são detectadas', () => {
  const base = clockedCircuit().components;
  const moved = base.map((component) =>
    component.id === 'G1' ? { ...component, x: component.x + 20 } : component,
  );
  const relabeled = base.map((component) =>
    component.id === 'OUT' ? { ...component, label: 'Saída' } : component,
  );
  const resized = base.map((component) =>
    component.id === 'G1' ? { ...component, width: 200 } : component,
  );

  assert.equal(sameCanvasLayout(base, moved), false, 'mover um componente muda o layout');
  assert.equal(
    sameCanvasLayout(base, relabeled),
    false,
    'renomear muda o layout (bounds de texto)',
  );
  assert.equal(sameCanvasLayout(base, resized), false, 'redimensionar muda o layout');
  assert.equal(sameCanvasLayout(base, base.slice(1)), false, 'remover componente muda o layout');
});

test('Mudança apenas de estado lógico não é mudança de layout', () => {
  const base = clockedCircuit().components;
  const toggled = base.map((component) =>
    component.id === 'D' ? { ...component, state: false } : component,
  );
  assert.equal(sameCanvasLayout(base, toggled), true, 'state fica fora da assinatura de layout');
});

test('sameEvaluationValues compara fatias de avaliação por valor', () => {
  assert.equal(sameEvaluationValues({ out: true, in: false }, { out: true, in: false }), true);
  assert.equal(sameEvaluationValues({ out: true }, { out: false }), false);
  assert.equal(sameEvaluationValues({ out: true }, { out: true, in: false }), false);
  assert.equal(sameEvaluationValues(undefined, undefined), true);
  assert.equal(sameEvaluationValues({ out: true }, undefined), false);
});
