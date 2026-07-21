import assert from 'node:assert/strict';
import { test } from 'vitest';
import { clampBottomPanelHeight } from '../../src/ui/hooks/useResizableBottomPanel';

test('limita o painel inferior entre as alturas configuradas', () => {
  assert.equal(clampBottomPanelHeight(90, 150, 520, 1000), 150);
  assert.equal(clampBottomPanelHeight(340, 150, 520, 1000), 340);
  assert.equal(clampBottomPanelHeight(700, 150, 520, 1000), 520);
});

test('preserva espaço para o editor em viewports baixas', () => {
  assert.equal(clampBottomPanelHeight(500, 150, 520, 500), 200);
  assert.equal(clampBottomPanelHeight(500, 150, 520, 400), 150);
});
