import { describe, expect, test } from 'vitest';
import { isCircuitDocument as validateOnClient } from '../../src/core/validateCircuitDocument.ts';
import { isCircuitDocument as validateOnServer } from '../../server/circuit-validator.mjs';

const valid = {
  version: 1,
  components: [
    { id: 'source:1', type: 'input', x: 0, y: 0 },
    { id: 'sink:1', type: 'led', x: 200, y: 0 },
  ],
  wires: [
    {
      id: 'wire:1',
      from: { componentId: 'source:1', pinId: 'out' },
      to: { componentId: 'sink:1', pinId: 'in' },
    },
  ],
};

const corpus = [
  ['documento válido com separadores', valid],
  ['versão desconhecida', { ...valid, version: 2 }],
  ['fio invertido', { ...valid, wires: [{ ...valid.wires[0], from: valid.wires[0].to }] }],
  [
    'entrada conectada duas vezes',
    {
      ...valid,
      wires: [
        valid.wires[0],
        {
          ...valid.wires[0],
          id: 'wire:2',
        },
      ],
    },
  ],
  [
    'id reservado pelo flatten',
    {
      ...valid,
      components: [{ ...valid.components[0], id: 'source.with.dot' }, valid.components[1]],
    },
  ],
];

describe('paridade do validador de documentos', () => {
  test.each(corpus)('%s', (_name, document) => {
    expect(validateOnClient(document)).toBe(validateOnServer(document));
  });
});
