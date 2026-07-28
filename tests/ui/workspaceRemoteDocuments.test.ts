import assert from 'node:assert/strict';
import { test } from 'vitest';
import { libraryEntryToWorkspaceDocument } from '../../src/ui/hooks/useLibraryBrowser';
import { remoteCircuitToWorkspaceDocument } from '../../src/ui/hooks/useRemoteCircuitBrowser';

const emptyCircuit = { version: 1 as const, components: [], wires: [] };
const timestamps = {
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
};

test('circuito remoto vira documento salvo e vinculado ao remoteId', () => {
  const document = remoteCircuitToWorkspaceDocument(
    {
      id: 'remote-1',
      ownerId: 'owner',
      name: 'Somador',
      circuit: emptyCircuit,
      revision: 4,
      ...timestamps,
    },
    'doc-test',
  );
  assert.equal(document.id, 'doc-test');
  assert.equal(document.remoteId, 'remote-1');
  assert.equal(document.revision, 4);
  assert.equal(document.saved, true);
  assert.equal(document.libraryId, undefined);
});

test('entrada de biblioteca vira documento salvo e vinculado apenas à biblioteca', () => {
  const document = libraryEntryToWorkspaceDocument(
    {
      id: 'library-1',
      ownerId: 'owner',
      name: 'ULA',
      definition: { components: [], wires: [] },
      revision: 2,
      ...timestamps,
    },
    'doc-library',
  );
  assert.equal(document.id, 'doc-library');
  assert.equal(document.libraryId, 'library-1');
  assert.equal(document.remoteId, null);
  assert.equal(document.revision, 2);
  assert.equal(document.saved, true);
});
