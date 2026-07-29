// @vitest-environment jsdom

import assert from 'node:assert/strict';
import { afterEach, beforeEach, test, vi } from 'vitest';
import {
  createInitialWorkspace,
  saveWorkspace,
  WORKSPACE_STORAGE_KEY,
  type WorkspaceState,
} from '../../src/state/workspaceStorage';

beforeEach(() => {
  localStorage.clear();
});

afterEach(() => {
  vi.restoreAllMocks();
});

test('saveWorkspace persiste o workspace e confirma sucesso', () => {
  const workspace = createInitialWorkspace();

  assert.equal(saveWorkspace(workspace), true);
  assert.deepEqual(JSON.parse(localStorage.getItem(WORKSPACE_STORAGE_KEY) ?? ''), workspace);
});

test('saveWorkspace reporta quota excedida sem propagar a exceção', () => {
  vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
    throw new DOMException('Quota excedida', 'QuotaExceededError');
  });

  assert.equal(saveWorkspace(createInitialWorkspace()), false);
});

test('saveWorkspace reporta armazenamento indisponível sem propagar a exceção', () => {
  vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
    throw new DOMException('Storage bloqueado', 'SecurityError');
  });

  assert.equal(saveWorkspace(createInitialWorkspace()), false);
});

test('saveWorkspace reporta falha de serialização antes de escrever', () => {
  const workspace = createInitialWorkspace() as WorkspaceState & { cycle?: unknown };
  workspace.cycle = workspace;
  const setItem = vi.spyOn(Storage.prototype, 'setItem');

  assert.equal(saveWorkspace(workspace), false);
  assert.equal(setItem.mock.calls.length, 0);
});
