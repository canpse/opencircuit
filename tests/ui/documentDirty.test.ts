import { test } from 'vitest';
import assert from 'node:assert/strict';
import { isDocumentDirty, type WorkspaceDocument } from '../../src/state/workspaceStorage';
import type { CircuitDocument } from '../../src/core/types';

function circuitWith(components: number, wires: number): CircuitDocument {
  return {
    version: 1,
    components: Array.from({ length: components }, (_, index) => ({
      id: `c${index}`,
      type: 'and' as const,
      x: 100,
      y: 100,
    })),
    wires: Array.from({ length: wires }, (_, index) => ({
      id: `w${index}`,
      from: { componentId: 'c0', pinId: 'out' },
      to: { componentId: 'c1', pinId: 'in1' },
    })),
  };
}

function documentWith(
  saved: boolean,
  circuit: CircuitDocument,
  everSaved?: boolean,
): WorkspaceDocument {
  return { id: 'doc-1', name: 'teste.json', circuit, exampleId: null, saved, everSaved };
}

test('DocumentoSalvoNaoEstaSujo', () => {
  assert.equal(isDocumentDirty(documentWith(true, circuitWith(3, 2), true)), false);
});

test('AbaNovaVaziaNaoEstaSuja', () => {
  assert.equal(isDocumentDirty(documentWith(false, circuitWith(0, 0), false)), false);
});

test('DocumentoNaoSalvoComComponentesEstaSujo', () => {
  assert.equal(isDocumentDirty(documentWith(false, circuitWith(1, 0), false)), true);
});

test('DocumentoNaoSalvoApenasComFiosEstaSujo', () => {
  assert.equal(isDocumentDirty(documentWith(false, circuitWith(0, 1), false)), true);
});

test('DocumentoJaSalvoQueFoiEsvaziadoEstaSujo', () => {
  assert.equal(isDocumentDirty(documentWith(false, circuitWith(0, 0), true)), true);
});

test('DocumentoLegadoSemEverSavedVazioNaoEstaSujo', () => {
  assert.equal(isDocumentDirty(documentWith(false, circuitWith(0, 0))), false);
});
