import type { CircuitDocument } from '../core/types';
import { isCircuitDocument } from '../core/validateCircuitDocument';
import { loadCircuit } from './storage';
import { measureProfile } from '../performance/profiling';

const WORKSPACE_STORAGE_KEY = 'opencircuit.logic.workspace.v1';

export type WorkspaceDocument = {
  id: string;
  name: string;
  circuit: CircuitDocument;
  exampleId: string | null;
  saved: boolean;
  // Já teve alguma versão gravada/importada de arquivo. Opcional porque
  // workspaces persistidos antes do campo existir não o têm.
  everSaved?: boolean;
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
      {
        id,
        name: 'circuito_logico.json',
        circuit: loadCircuit(),
        exampleId: null,
        saved: true,
        everSaved: true,
      },
    ],
  };
}

export function loadWorkspace(): WorkspaceState {
  try {
    const raw = localStorage.getItem(WORKSPACE_STORAGE_KEY);
    if (!raw) return createInitialWorkspace();
    const parsed = JSON.parse(raw) as WorkspaceState;
    if (
      parsed.version === 1 &&
      typeof parsed.activeDocumentId === 'string' &&
      Array.isArray(parsed.documents) &&
      parsed.documents.length > 0 &&
      parsed.documents.every(isWorkspaceDocument) &&
      new Set(parsed.documents.map((document) => document.id)).size === parsed.documents.length
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

export function saveWorkspace(workspace: WorkspaceState): boolean {
  try {
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
    const serialized = measureProfile('autosave.stringify', details, () =>
      JSON.stringify(workspace),
    );
    measureProfile('autosave.write', { ...details, bytes: serialized.length }, () =>
      localStorage.setItem(WORKSPACE_STORAGE_KEY, serialized),
    );
    return true;
  } catch {
    return false;
  }
}

export function ensureJsonExtension(name: string): string {
  return name.endsWith('.json') ? name : `${name}.json`;
}

// Sujo = tem mudanças que ainda não foram salvas em arquivo. Uma aba vazia que
// nunca foi salva não conta: fechá-la não perde nada. Já uma aba vazia de um
// documento que teve versão salva conta — o "apaguei tudo" é uma mudança.
export function isDocumentDirty(document: WorkspaceDocument): boolean {
  if (document.saved) return false;
  if (document.circuit.components.length > 0 || document.circuit.wires.length > 0) return true;
  return document.everSaved === true;
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
    everSaved: false,
  };
}

function isWorkspaceDocument(value: unknown): value is WorkspaceDocument {
  if (typeof value !== 'object' || value === null) return false;
  const document = value as Partial<WorkspaceDocument>;
  return Boolean(
    typeof document.id === 'string' &&
    document.id.length > 0 &&
    typeof document.name === 'string' &&
    isCircuitDocument(document.circuit) &&
    (document.exampleId === null || typeof document.exampleId === 'string') &&
    typeof document.saved === 'boolean' &&
    (document.everSaved === undefined || typeof document.everSaved === 'boolean'),
  );
}
