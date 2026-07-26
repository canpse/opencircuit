import { describe, expect, test } from 'vitest';
import { isCircuitDocument, validateScope } from '../../server/circuit-validator.mjs';

const halfAdder = {
  id: 'half-adder-def',
  name: 'Meio Somador',
  components: [
    { id: 'a', type: 'input', x: 0, y: 0 },
    { id: 'b', type: 'input', x: 0, y: 40 },
    { id: 'xor1', type: 'xor', x: 100, y: 0 },
    { id: 'and1', type: 'and', x: 100, y: 40 },
    { id: 'sum-led', type: 'led', x: 200, y: 0 },
    { id: 'carry-led', type: 'led', x: 200, y: 40 },
  ],
  wires: [
    { id: 'w1', from: { componentId: 'a', pinId: 'out' }, to: { componentId: 'xor1', pinId: 'a' } },
    { id: 'w2', from: { componentId: 'b', pinId: 'out' }, to: { componentId: 'xor1', pinId: 'b' } },
    { id: 'w3', from: { componentId: 'a', pinId: 'out' }, to: { componentId: 'and1', pinId: 'a' } },
    { id: 'w4', from: { componentId: 'b', pinId: 'out' }, to: { componentId: 'and1', pinId: 'b' } },
    {
      id: 'w5',
      from: { componentId: 'xor1', pinId: 'out' },
      to: { componentId: 'sum-led', pinId: 'in' },
    },
    {
      id: 'w6',
      from: { componentId: 'and1', pinId: 'out' },
      to: { componentId: 'carry-led', pinId: 'in' },
    },
  ],
};

function rootWithInstance(overrides = {}) {
  return {
    version: 1,
    definitions: [halfAdder],
    components: [{ id: 'u1', type: 'subcircuit', x: 0, y: 0, definitionId: halfAdder.id }],
    wires: [],
    ...overrides,
  };
}

describe('circuit-validator', () => {
  test('documento com instância de subcircuito referenciando uma definição válida é aceito', () => {
    expect(isCircuitDocument(rootWithInstance())).toBe(true);
  });

  test('escopo de uma definição isolada (componentes/fios) é válido por si só', () => {
    expect(validateScope(halfAdder.components, halfAdder.wires, new Map())).toBe(true);
  });

  test('fio ligando à saída (led) de uma instância de subcircuito resolve como output', () => {
    const doc = rootWithInstance({
      components: [
        { id: 'u1', type: 'subcircuit', x: 0, y: 0, definitionId: halfAdder.id },
        { id: 'led-out', type: 'led', x: 300, y: 0 },
      ],
      wires: [
        {
          id: 'w-out',
          from: { componentId: 'u1', pinId: 'sum-led' },
          to: { componentId: 'led-out', pinId: 'in' },
        },
      ],
    });
    expect(isCircuitDocument(doc)).toBe(true);
  });

  test('fio ligando a uma entrada (input) de uma instância de subcircuito resolve como input', () => {
    const doc = rootWithInstance({
      components: [
        { id: 'u1', type: 'subcircuit', x: 0, y: 0, definitionId: halfAdder.id },
        { id: 'src', type: 'input', x: -100, y: 0 },
      ],
      wires: [
        {
          id: 'w-in',
          from: { componentId: 'src', pinId: 'out' },
          to: { componentId: 'u1', pinId: 'a' },
        },
      ],
    });
    expect(isCircuitDocument(doc)).toBe(true);
  });

  test('referência solta a uma definição inexistente é tolerada (permissivo)', () => {
    const doc = {
      version: 1,
      components: [{ id: 'u1', type: 'subcircuit', x: 0, y: 0, definitionId: 'nao-existe' }],
      wires: [],
    };
    expect(isCircuitDocument(doc)).toBe(true);
  });

  test('id de componente com "." é rejeitado', () => {
    const doc = {
      version: 1,
      components: [{ id: 'bad.id', type: 'and', x: 0, y: 0 }],
      wires: [],
    };
    expect(isCircuitDocument(doc)).toBe(false);
  });

  test('id de definição com "." é rejeitado', () => {
    const doc = {
      version: 1,
      definitions: [{ ...halfAdder, id: 'bad.def' }],
      components: [],
      wires: [],
    };
    expect(isCircuitDocument(doc)).toBe(false);
  });

  test('documento antigo sem subcircuito continua válido', () => {
    const doc = {
      version: 1,
      components: [
        { id: 'a', type: 'input', x: 0, y: 0 },
        { id: 'led1', type: 'led', x: 100, y: 0 },
      ],
      wires: [
        {
          id: 'w1',
          from: { componentId: 'a', pinId: 'out' },
          to: { componentId: 'led1', pinId: 'in' },
        },
      ],
    };
    expect(isCircuitDocument(doc)).toBe(true);
  });

  test('fio ligando pino de barramento (largura 4) a pino escalar (largura 1) é rejeitado', () => {
    const doc = {
      version: 1,
      components: [
        { id: 'm', type: 'merge-4', x: 0, y: 0 },
        { id: 'led1', type: 'led', x: 160, y: 0 },
      ],
      wires: [
        {
          id: 'w1',
          from: { componentId: 'm', pinId: 'OUT' },
          to: { componentId: 'led1', pinId: 'in' },
        },
      ],
    };
    expect(isCircuitDocument(doc)).toBe(false);
  });

  test('fio entre dois pinos de barramento de mesma largura é aceito', () => {
    const doc = {
      version: 1,
      components: [
        { id: 'm', type: 'merge-4', x: 0, y: 0 },
        { id: 's', type: 'split-4', x: 160, y: 0 },
      ],
      wires: [
        {
          id: 'w1',
          from: { componentId: 'm', pinId: 'OUT' },
          to: { componentId: 's', pinId: 'IN' },
        },
      ],
    };
    expect(isCircuitDocument(doc)).toBe(true);
  });

  test('documento com display-4 solto é aceito (regressão: faltava na tabela PINS do servidor)', () => {
    const doc = {
      version: 1,
      components: [
        { id: 'm', type: 'merge-4', x: 0, y: 0 },
        { id: 'd', type: 'display-4', x: 160, y: 0 },
      ],
      wires: [
        {
          id: 'w1',
          from: { componentId: 'm', pinId: 'OUT' },
          to: { componentId: 'd', pinId: 'IN' },
        },
      ],
    };
    expect(isCircuitDocument(doc)).toBe(true);
  });

  test('barramento atravessando subcircuito via bus-in-4/display-4 é aceito com largura certa', () => {
    const passthrough = {
      id: 'passthrough4-def',
      name: 'Passthrough4',
      components: [
        { id: 'bin', type: 'bus-in-4', x: 0, y: 0 },
        { id: 'split', type: 'split-4', x: 120, y: 0 },
        { id: 'merge', type: 'merge-4', x: 280, y: 0 },
        { id: 'disp', type: 'display-4', x: 440, y: 0 },
      ],
      wires: [
        {
          id: 'iw1',
          from: { componentId: 'bin', pinId: 'OUT' },
          to: { componentId: 'split', pinId: 'IN' },
        },
        {
          id: 'iw2',
          from: { componentId: 'split', pinId: 'O0' },
          to: { componentId: 'merge', pinId: 'I0' },
        },
        {
          id: 'iw3',
          from: { componentId: 'merge', pinId: 'OUT' },
          to: { componentId: 'disp', pinId: 'IN' },
        },
      ],
    };
    const doc = {
      version: 1,
      definitions: [passthrough],
      components: [
        { id: 'm', type: 'merge-4', x: 0, y: 0 },
        { id: 'u1', type: 'subcircuit', x: 160, y: 0, definitionId: passthrough.id },
        { id: 's', type: 'split-4', x: 320, y: 0 },
      ],
      wires: [
        {
          id: 'w1',
          from: { componentId: 'm', pinId: 'OUT' },
          to: { componentId: 'u1', pinId: 'bin' },
        },
        {
          id: 'w2',
          from: { componentId: 'u1', pinId: 'disp' },
          to: { componentId: 's', pinId: 'IN' },
        },
      ],
    };
    expect(isCircuitDocument(doc)).toBe(true);

    // Ligar o mesmo pino de fronteira (largura 4) a um pino escalar deve ser rejeitado.
    const mismatched = {
      ...doc,
      components: [...doc.components, { id: 'led1', type: 'led', x: 480, y: 0 }],
      wires: [
        doc.wires[0],
        {
          id: 'w3',
          from: { componentId: 'u1', pinId: 'disp' },
          to: { componentId: 'led1', pinId: 'in' },
        },
      ],
    };
    expect(isCircuitDocument(mismatched)).toBe(false);
  });

  test('definição além do limite de componentes é rejeitada mesmo aninhada', () => {
    const bigDefinition = {
      id: 'big-def',
      name: 'Grande demais',
      components: Array.from({ length: 10_001 }, (_, index) => ({
        id: `c${index}`,
        type: 'and',
        x: index,
        y: 0,
      })),
      wires: [],
    };
    const doc = {
      version: 1,
      definitions: [bigDefinition],
      components: [],
      wires: [],
    };
    expect(isCircuitDocument(doc)).toBe(false);
  });
});
