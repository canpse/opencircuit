import { test } from 'vitest';
import assert from 'node:assert/strict';
import { pushDefinitionPath, truncateDefinitionPath } from '../../src/ui/app/editorUtils';

// Cobre a Fase 3 de subcircuitos (issue #18): a matemática pura por trás da
// pilha de navegação (duplo-clique empilha, migalha de trilha trunca).

test('pushDefinitionPath from the root starts a one-level path', () => {
  assert.deepEqual(pushDefinitionPath([], 'def1'), ['def1']);
});

test('pushDefinitionPath drills a second level on top of an existing path', () => {
  assert.deepEqual(pushDefinitionPath(['def1'], 'def2'), ['def1', 'def2']);
});

test('truncateDefinitionPath(-1) jumps all the way back to the root', () => {
  assert.deepEqual(truncateDefinitionPath(['def1', 'def2', 'def3'], -1), []);
});

test('truncateDefinitionPath(0) jumps to the first breadcrumb segment', () => {
  assert.deepEqual(truncateDefinitionPath(['def1', 'def2', 'def3'], 0), ['def1']);
});

test('truncateDefinitionPath at the last index is a no-op (clicking the current segment)', () => {
  assert.deepEqual(truncateDefinitionPath(['def1', 'def2', 'def3'], 2), ['def1', 'def2', 'def3']);
});

test('neither function mutates the original path array', () => {
  const original = ['def1', 'def2'];
  pushDefinitionPath(original, 'def3');
  truncateDefinitionPath(original, 0);
  assert.deepEqual(original, ['def1', 'def2']);
});
