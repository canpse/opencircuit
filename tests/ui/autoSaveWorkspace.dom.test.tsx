// @vitest-environment jsdom

import { cleanup, renderHook, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import {
  createInitialWorkspace,
  WORKSPACE_STORAGE_KEY,
  type WorkspaceState,
} from '../../src/state/workspaceStorage';
import { useAutoSaveWorkspace } from '../../src/ui/hooks/useAutoSaveWorkspace';

function changedWorkspace(workspace: WorkspaceState, suffix: string): WorkspaceState {
  return {
    ...workspace,
    documents: workspace.documents.map((document, index) =>
      index === 0 ? { ...document, name: `${document.name}-${suffix}` } : document,
    ),
  };
}

beforeEach(() => {
  localStorage.clear();
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

it('mantém uma falha repetida e detecta a recuperação posterior', async () => {
  const originalSetItem = Storage.prototype.setItem;
  let shouldFail = true;
  vi.spyOn(Storage.prototype, 'setItem').mockImplementation(function (this: Storage, key, value) {
    if (key === WORKSPACE_STORAGE_KEY && shouldFail) {
      throw new DOMException('Quota excedida', 'QuotaExceededError');
    }
    originalSetItem.call(this, key, value);
  });
  const initial = createInitialWorkspace();
  const { result, rerender } = renderHook(
    ({ workspace }: { workspace: WorkspaceState }) => useAutoSaveWorkspace(workspace),
    { initialProps: { workspace: initial } },
  );

  await waitFor(() => expect(result.current).toBe('failed'));

  rerender({ workspace: changedWorkspace(initial, 'falha-repetida') });
  await waitFor(() => expect(result.current).toBe('failed'));

  shouldFail = false;
  rerender({ workspace: changedWorkspace(initial, 'recuperado') });
  await waitFor(() => expect(result.current).toBe('recovered'));

  rerender({ workspace: changedWorkspace(initial, 'salvo') });
  await waitFor(() => expect(result.current).toBe('saved'));
});
