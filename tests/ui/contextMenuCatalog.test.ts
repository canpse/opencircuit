import assert from 'node:assert/strict';
import { test } from 'vitest';
import {
  contextMenuPosition,
  contextRemoveLabel,
  filterComponentTools,
  nextRecentComponents,
} from '../../src/ui/context-menu/ContextMenuView';

test('busca componentes por nome e ignora acentos', () => {
  assert.deepEqual(filterComponentTools('mux'), ['mux-2-1', 'mux-4-1']);
  assert.deepEqual(filterComponentTools('paridade impar'), ['odd-parity-3']);
  assert.deepEqual(filterComponentTools('somador'), ['half-adder', 'full-adder']);
});

test('mantém os componentes recentes sem duplicatas e em ordem de uso', () => {
  assert.deepEqual(nextRecentComponents(['and', 'led', 'input'], 'led'), ['led', 'and', 'input']);
  assert.deepEqual(nextRecentComponents(['and', 'led', 'input', 'clock'], 'not'), [
    'not',
    'and',
    'led',
    'input',
  ]);
});

test('mantém o menu contextual dentro da viewport', () => {
  assert.deepEqual(contextMenuPosition(1100, 760, 300, 452, 1180, 800), { x: 872, y: 340 });
  assert.deepEqual(contextMenuPosition(-20, -10, 300, 452, 1180, 800), { x: 8, y: 8 });
});

test('identifica a exclusão contextual de um ponto de controle', () => {
  assert.equal(
    contextRemoveLabel({ kind: 'waypoint', x: 100, y: 120, wireId: 'W1', waypointIndex: 0 }, 1),
    'Excluir ponto de controle',
  );
});
