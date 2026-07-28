import assert from 'node:assert/strict';
import { test } from 'vitest';
import {
  INITIAL_WORKSPACE_SYNC_MODEL,
  workspaceSyncReducer,
  type CircuitConflict,
  type LibraryConflict,
} from '../../src/ui/hooks/workspaceSyncState';

const circuitConflict = {
  documentId: 'doc:1',
  remote: { id: 'remote', name: 'Circuito', revision: 2 },
} as CircuitConflict;

const libraryConflict = {
  documentId: 'doc:2',
  remote: { id: 'library', name: 'Componente', revision: 3 },
} as LibraryConflict;

test('transições de sincronização preservam estados independentes por documento', () => {
  const saving = workspaceSyncReducer(INITIAL_WORKSPACE_SYNC_MODEL, {
    type: 'status',
    documentId: 'doc:1',
    status: 'saving',
  });
  const savedElsewhere = workspaceSyncReducer(saving, {
    type: 'status',
    documentId: 'doc:2',
    status: 'saved',
  });
  assert.equal(savedElsewhere.states.get('doc:1'), 'saving');
  assert.equal(savedElsewhere.states.get('doc:2'), 'saved');
});

test('conflito de circuito entra em estado explícito e resolução o marca como salvo', () => {
  const conflicted = workspaceSyncReducer(INITIAL_WORKSPACE_SYNC_MODEL, {
    type: 'circuit-conflict',
    conflict: circuitConflict,
  });
  assert.equal(conflicted.states.get('doc:1'), 'conflict');
  assert.equal(conflicted.conflict, circuitConflict);

  const resolved = workspaceSyncReducer(conflicted, { type: 'resolve-circuit-conflict' });
  assert.equal(resolved.states.get('doc:1'), 'saved');
  assert.equal(resolved.conflict, null);
});

test('conflitos de biblioteca e circuito são transições separadas', () => {
  const withLibrary = workspaceSyncReducer(INITIAL_WORKSPACE_SYNC_MODEL, {
    type: 'library-conflict',
    conflict: libraryConflict,
  });
  const withBoth = workspaceSyncReducer(withLibrary, {
    type: 'circuit-conflict',
    conflict: circuitConflict,
  });
  assert.equal(withBoth.libraryConflict, libraryConflict);
  assert.equal(withBoth.conflict, circuitConflict);

  const closedLibrary = workspaceSyncReducer(withBoth, { type: 'close-library-conflict' });
  assert.equal(closedLibrary.libraryConflict, null);
  assert.equal(closedLibrary.states.get('doc:2'), 'conflict');
  assert.equal(closedLibrary.conflict, circuitConflict);
});
