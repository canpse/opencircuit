import type { CircuitDocument } from '../core/types';
import { loadCircuit } from './storage';
import { measureProfile } from '../performance/profiling';

const WORKSPACE_STORAGE_KEY = 'opencircuit.logic.workspace.v1';

export type WorkspaceDocument = {
  id: string;
  name: string;
  circuit: CircuitDocument;
  exampleId: string | null;
  saved: boolean;
};

export type WorkspaceState = {
  version: 1;
  activeDocumentId: string;
  documents: WorkspaceDocument[];
};

export function createInitialWorkspace(): WorkspaceState {
  const id = 'doc-1';
  return {
    version: 1,
    activeDocumentId: id,
    documents: [
      { id, name: 'circuito_logico.json', circuit: loadCircuit(), exampleId: null, saved: true },
    ],
  };
}

export function loadWorkspace(): WorkspaceState {
  const raw = localStorage.getItem(WORKSPACE_STORAGE_KEY);
  if (!raw) return createInitialWorkspace();

  try {
    const parsed = JSON.parse(raw) as WorkspaceState;
    if (
      parsed.version === 1 &&
      typeof parsed.activeDocumentId === 'string' &&
      Array.isArray(parsed.documents) &&
      parsed.documents.length > 0 &&
      parsed.documents.every(isWorkspaceDocument)
    ) {
      const activeDocumentId = parsed.documents.some(
        (document) => document.id === parsed.activeDocumentId,
      )
        ? parsed.activeDocumentId
        : parsed.documents[0].id;
      return { ...parsed, activeDocumentId };
    }
  } catch {
    // Fall back below.
  }

  return createInitialWorkspace();
}

export function saveWorkspace(workspace: WorkspaceState): void {
  const details = {
    documents: workspace.documents.length,
    components: workspace.documents.reduce(
      (count, document) => count + document.circuit.components.length,
      0,
    ),
    wires: workspace.documents.reduce(
      (count, document) => count + document.circuit.wires.length,
      0,
    ),
  };
  const serialized = measureProfile('autosave.stringify', details, () => JSON.stringify(workspace));
  measureProfile('autosave.write', { ...details, bytes: serialized.length }, () =>
    localStorage.setItem(WORKSPACE_STORAGE_KEY, serialized),
  );
}

export function createEmptyCircuit(): CircuitDocument {
  return { version: 1, components: [], wires: [] };
}

export function createUntitledDocument(index: number): WorkspaceDocument {
  return {
    id: `doc-${Date.now()}`,
    name: `Sem título ${index}`,
    circuit: createEmptyCircuit(),
    exampleId: null,
    saved: false,
  };
}

function isWorkspaceDocument(value: WorkspaceDocument): boolean {
  return Boolean(
    value &&
    typeof value.id === 'string' &&
    typeof value.name === 'string' &&
    value.circuit?.version === 1 &&
    Array.isArray(value.circuit.components) &&
    Array.isArray(value.circuit.wires),
  );
}
