import assert from 'node:assert/strict';
import { test } from 'vitest';
import {
  CIRCUIT_EXAMPLES,
  validateExampleCatalog,
  type CircuitExample,
} from '../../src/examples/circuitExamples';
import { CIRCUIT_EXAMPLE_IDS } from '../../src/examples/circuitExampleTypes';

test('todos os ids declarados possuem exatamente um documento e metadados', () => {
  validateExampleCatalog();
  assert.deepEqual(
    CIRCUIT_EXAMPLES.map((example) => example.id).sort(),
    [...CIRCUIT_EXAMPLE_IDS].sort(),
  );
});

test('referências curriculares precisam existir', () => {
  const broken = CIRCUIT_EXAMPLES.map((example, index): CircuitExample =>
    index === 0
      ? {
          ...example,
          next: ['example-that-does-not-exist' as CircuitExample['next'][number]],
        }
      : example,
  );
  assert.throws(() => validateExampleCatalog(broken), /Referência inexistente/);
});

test('notas explicativas em prerequisites continuam permitidas', () => {
  const withNote = CIRCUIT_EXAMPLES.map((example, index): CircuitExample =>
    index === 0
      ? { ...example, prerequisites: [{ note: 'Leia a explicação antes de começar.' }] }
      : example,
  );
  assert.doesNotThrow(() => validateExampleCatalog(withNote));
});
