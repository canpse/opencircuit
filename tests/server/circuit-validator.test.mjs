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
