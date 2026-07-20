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
  everSaved: boolean;
};

export type WorkspaceState = {
  version: 2;
  activeDocumentId: string;
  documents: WorkspaceDocument[];
};

export function createInitialWorkspace(): WorkspaceState {
  const id = 'doc-1';
  return {
    version: 2,
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

// Aceita workspaces v1 (sem everSaved) e v2; devolve sempre v2 ou null quando
// o dado persistido não é reaproveitável.
export function migrateWorkspace(parsed: unknown): WorkspaceState | null {
  if (typeof parsed !== 'object' || parsed === null) return null;
  const candidate = parsed as {
    version?: unknown;
    activeDocumentId?: unknown;
    documents?: unknown;
  };
  if (candidate.version !== 1 && candidate.version !== 2) return null;
  if (typeof candidate.activeDocumentId !== 'string') return null;
  if (!Array.isArray(candidate.documents) || candidate.documents.length === 0) return null;

  const documents: WorkspaceDocument[] = [];
  for (const raw of candidate.documents) {
    if (!isStoredWorkspaceDocument(raw)) return null;
    // v1 não tinha everSaved; um documento marcado como salvo já teve versão
    // em disco, então herda esse fato.
    documents.push({ ...raw, everSaved: raw.everSaved ?? raw.saved });
  }
  if (new Set(documents.map((document) => document.id)).size !== documents.length) return null;

  const activeDocumentId = documents.some((document) => document.id === candidate.activeDocumentId)
    ? candidate.activeDocumentId
    : documents[0].id;

  return { version: 2, activeDocumentId, documents };
}

export function loadWorkspace(): WorkspaceState {
  try {
    const raw = localStorage.getItem(WORKSPACE_STORAGE_KEY);
    if (!raw) return createInitialWorkspace();
    const migrated = migrateWorkspace(JSON.parse(raw));
    if (migrated) return migrated;
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
  return document.everSaved;
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

type StoredWorkspaceDocument = Omit<WorkspaceDocument, 'everSaved'> & { everSaved?: boolean };

function isStoredWorkspaceDocument(value: unknown): value is StoredWorkspaceDocument {
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
