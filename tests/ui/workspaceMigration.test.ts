import { test } from 'vitest';
import assert from 'node:assert/strict';
import { migrateWorkspace } from '../../src/state/workspaceStorage';

function v1Document(id: string, saved: boolean, everSaved?: boolean) {
  return {
    id,
    name: `${id}.json`,
    circuit: { version: 1, components: [], wires: [] },
    exampleId: null,
    saved,
    ...(everSaved === undefined ? {} : { everSaved }),
  };
}

test('MigraV1DocumentoSalvoHerdaEverSaved', () => {
  const result = migrateWorkspace({
    version: 1,
    activeDocumentId: 'a',
    documents: [v1Document('a', true), v1Document('b', false)],
  });
  assert.ok(result);
  assert.equal(result.version, 2);
  assert.equal(result.documents[0].everSaved, true, 'saved:true vira everSaved:true');
  assert.equal(result.documents[1].everSaved, false, 'saved:false vira everSaved:false');
});

test('MigraV2PreservaEverSavedExplicito', () => {
  const result = migrateWorkspace({
    version: 2,
    activeDocumentId: 'a',
    documents: [v1Document('a', false, true)],
  });
  assert.ok(result);
  assert.equal(result.documents[0].everSaved, true);
});

test('MigraCorrigeActiveDocumentIdInexistente', () => {
  const result = migrateWorkspace({
    version: 1,
    activeDocumentId: 'sumiu',
    documents: [v1Document('a', true)],
  });
  assert.ok(result);
  assert.equal(result.activeDocumentId, 'a');
});

test('MigraRejeitaVersaoDesconhecida', () => {
  const result = migrateWorkspace({
    version: 3,
    activeDocumentId: 'a',
    documents: [v1Document('a', true)],
  });
  assert.equal(result, null);
});

test('MigraRejeitaIdsDuplicados', () => {
  const result = migrateWorkspace({
    version: 1,
    activeDocumentId: 'a',
    documents: [v1Document('a', true), v1Document('a', false)],
  });
  assert.equal(result, null);
});

test('MigraRejeitaDocumentoInvalido', () => {
  const result = migrateWorkspace({
    version: 1,
    activeDocumentId: 'a',
    documents: [{ id: 'a', name: 'a.json' }],
  });
  assert.equal(result, null);
});

test('MigraRejeitaListaVazia', () => {
  const result = migrateWorkspace({ version: 1, activeDocumentId: 'a', documents: [] });
  assert.equal(result, null);
});
