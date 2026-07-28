import assert from 'node:assert/strict';
import { test } from 'vitest';
import { COMPONENT_DEFINITIONS } from '../../src/core/catalog';
import { COMPONENT_CONTRACT, DOCUMENT_LIMITS } from '../../src/core/componentContract';
import { isCircuitDocument } from '../../src/core/validateCircuitDocument';
import type { GateType } from '../../src/core/types';

test('o catálogo visual e o contrato semântico possuem os mesmos tipos e pinos', () => {
  assert.deepEqual(
    Object.keys(COMPONENT_DEFINITIONS).sort(),
    Object.keys(COMPONENT_CONTRACT).sort(),
  );

  for (const type of Object.keys(COMPONENT_CONTRACT) as GateType[]) {
    const visualPins = Object.fromEntries(
      COMPONENT_DEFINITIONS[type].pins.map((pin) => [
        pin.id,
        { kind: pin.kind, width: pin.width ?? 1 },
      ]),
    );
    assert.deepEqual(visualPins, COMPONENT_CONTRACT[type].pins, `contrato divergente para ${type}`);
  }
});

test('o validador cliente aplica os limites compartilhados por escopo', () => {
  const tooManyComponents = {
    version: 1,
    components: Array.from({ length: DOCUMENT_LIMITS.maxComponentsPerScope + 1 }, (_, index) => ({
      id: `c${index}`,
      type: 'and',
      x: index,
      y: 0,
    })),
    wires: [],
  };

  assert.equal(isCircuitDocument(tooManyComponents), false);
});

test('ids acima do limite compartilhado são rejeitados no cliente', () => {
  assert.equal(
    isCircuitDocument({
      version: 1,
      components: [
        {
          id: 'x'.repeat(DOCUMENT_LIMITS.maxComponentIdLength + 1),
          type: 'input',
          x: 0,
          y: 0,
        },
      ],
      wires: [],
    }),
    false,
  );
});
