import { ChangeEvent, useCallback, useMemo, useState, type SetStateAction } from 'react';
import type { CircuitDocument } from '../../core/types';
import { isCircuitDocument } from '../../core/validateCircuitDocument';
import { CIRCUIT_EXAMPLES } from '../../examples/circuitExamples';
import {
  circuitApi,
  CircuitApiError,
  type StoredCircuit,
  type StoredCircuitSummary,
} from '../../state/circuitApi';
import {
  libraryApi,
  LibraryApiError,
  type LibraryComponentDefinition,
  type StoredLibraryComponent,
  type StoredLibraryComponentSummary,
} from '../../state/libraryApi';
import { downloadJson } from '../../state/storage';
import {
  createUntitledDocument,
  ensureJsonExtension,
  isDocumentDirty,
  loadWorkspace,
  type WorkspaceDocument,
} from '../../state/workspaceStorage';
import { cloneCircuit, normalizeCircuitForEditor } from '../app/editorUtils';

interface Options {
  onMessage: (message: string) => void;
}

export type RemoteSyncState = 'idle' | 'saving' | 'saved' | 'offline' | 'error' | 'conflict';

export function useWorkspaceManager({ onMessage }: Options) {
  const [workspace, setWorkspace] = useState(() => loadWorkspace());
  const [pendingCloseId, setPendingCloseId] = useState<string | null>(null);
  const [remoteCircuits, setRemoteCircuits] = useState<StoredCircuitSummary[]>([]);
  const [remoteBrowserOpen, setRemoteBrowserOpen] = useState(false);
  const [remoteLoading, setRemoteLoading] = useState(false);
  const [syncStates, setSyncStates] = useState<ReadonlyMap<string, RemoteSyncState>>(
    () => new Map(),
  );
  const [conflict, setConflict] = useState<{ documentId: string; remote: StoredCircuit } | null>(
    null,
  );
  const [libraryEntries, setLibraryEntries] = useState<StoredLibraryComponentSummary[]>([]);
  const [libraryDialogOpen, setLibraryDialogOpen] = useState(false);
  const [libraryLoading, setLibraryLoading] = useState(false);
  const [libraryConflict, setLibraryConflict] = useState<{
    documentId: string;
    remote: StoredLibraryComponent;
  } | null>(null);

  const documents = workspace.documents;
  const activeDocumentId = workspace.activeDocumentId;
  const activeDocument = documents.find((item) => item.id === activeDocumentId) ?? documents[0];
  const circuit = activeDocument.circuit;
  const currentExampleId = activeDocument.exampleId;
  const pendingCloseDocument = documents.find((item) => item.id === pendingCloseId) ?? null;
  const remoteDocumentIds = useMemo(
    () => new Set(documents.filter((item) => item.remoteId).map((item) => item.id)),
    [documents],
  );
  const libraryDocumentIds = useMemo(
    () => new Set(documents.filter((item) => item.libraryId).map((item) => item.id)),
    [documents],
  );

  const setDocuments = useCallback((action: SetStateAction<WorkspaceDocument[]>) => {
    setWorkspace((current) => {
      const nextDocuments = typeof action === 'function' ? action(current.documents) : action;
      return {
        ...current,
        documents: nextDocuments,
        activeDocumentId: nextDocuments.some((item) => item.id === current.activeDocumentId)
          ? current.activeDocumentId
          : (nextDocuments[0]?.id ?? current.activeDocumentId),
      };
    });
  }, []);

  const setActiveDocumentId = useCallback((documentId: string) => {
    setWorkspace((current) => ({ ...current, activeDocumentId: documentId }));
  }, []);

  const setCircuit = useCallback(
    (action: SetStateAction<CircuitDocument>) => {
      setDocuments((current) =>
        current.map((document) => {
          if (document.id !== activeDocumentId) return document;
          const next = typeof action === 'function' ? action(document.circuit) : action;
          return next === document.circuit
            ? document
            : { ...document, circuit: next, saved: false };
        }),
      );
    },
    [activeDocumentId, setDocuments],
  );

  const setActiveExampleId = useCallback(
    (exampleId: string | null) => {
      setDocuments((current) =>
        current.map((item) => (item.id === activeDocumentId ? { ...item, exampleId } : item)),
      );
    },
    [activeDocumentId, setDocuments],
  );

  const setWatchedSignals = useCallback(
    (watchedSignals: string[]) => {
      setDocuments((current) =>
        current.map((item) => (item.id === activeDocumentId ? { ...item, watchedSignals } : item)),
      );
    },
    [activeDocumentId, setDocuments],
  );

  function setSyncState(documentId: string, state: RemoteSyncState) {
    setSyncStates((current) => new Map(current).set(documentId, state));
  }

  function selectDocument(documentId: string) {
    if (documentId !== activeDocumentId) {
      setActiveDocumentId(documentId);
      onMessage('Circuito alternado.');
    }
  }

  function createNewDocument() {
    const document = createUntitledDocument(documents.length + 1);
    setDocuments((current) => [
      ...current,
      { ...document, circuit: normalizeCircuitForEditor(cloneCircuit(document.circuit)) },
    ]);
    setActiveDocumentId(document.id);
    onMessage(`Novo circuito criado: ${document.name}.`);
  }

  function requestCloseDocument(documentId: string) {
    const document = documents.find((item) => item.id === documentId);
    if (!document) return;
    if (isDocumentDirty(document)) return setPendingCloseId(documentId);
    closeDocument(documentId);
  }

  async function savePendingCloseDocument() {
    const target = pendingCloseDocument;
    if (!target) return;
    setPendingCloseId(null);
    if (await saveDocument(target)) closeDocument(target.id);
  }

  function discardPendingCloseDocument() {
    if (!pendingCloseDocument) return;
    const id = pendingCloseDocument.id;
    setPendingCloseId(null);
    closeDocument(id);
  }

  function cancelPendingClose() {
    setPendingCloseId(null);
  }

  function closeDocument(documentId: string) {
    const index = documents.findIndex((item) => item.id === documentId);
    const fallback = documents[index + 1] ?? documents[index - 1];
    if (documents.length === 1) {
      const replacement = createUntitledDocument(1);
      setDocuments([
        { ...replacement, circuit: normalizeCircuitForEditor(cloneCircuit(replacement.circuit)) },
      ]);
      setActiveDocumentId(replacement.id);
      onMessage('Circuito fechado. Nova aba vazia aberta.');
      return;
    }
    setDocuments((current) => current.filter((item) => item.id !== documentId));
    if (documentId === activeDocumentId && fallback) setActiveDocumentId(fallback.id);
    onMessage('Circuito fechado.');
  }

  function applySavedRemote(target: WorkspaceDocument, stored: StoredCircuit) {
    setDocuments((current) =>
      current.map((document) =>
        document.id === target.id
          ? {
              ...document,
              name: stored.name,
              remoteId: stored.id,
              revision: stored.revision,
              saved: document.circuit === target.circuit,
              everSaved: true,
            }
          : document,
      ),
    );
    setSyncState(target.id, 'saved');
  }

  function applySavedLibrary(target: WorkspaceDocument, stored: StoredLibraryComponent) {
    setDocuments((current) =>
      current.map((document) =>
        document.id === target.id
          ? {
              ...document,
              name: stored.name,
              libraryId: stored.id,
              revision: stored.revision,
              saved: document.circuit === target.circuit,
              everSaved: true,
            }
          : document,
      ),
    );
    setSyncState(target.id, 'saved');
  }

  function toLibraryDefinition(document: CircuitDocument): LibraryComponentDefinition {
    return { components: document.components, wires: document.wires };
  }

  async function saveDocument(target: WorkspaceDocument): Promise<boolean> {
    setSyncState(target.id, 'saving');
    try {
      if (target.libraryId && target.revision) {
        const stored = await libraryApi.update(
          target.libraryId,
          target.name,
          toLibraryDefinition(target.circuit),
          target.revision,
        );
        applySavedLibrary(target, stored);
        onMessage(`Componente salvo na biblioteca: ${stored.name}.`);
        return true;
      }
      const stored =
        target.remoteId && target.revision
          ? await circuitApi.update(target.remoteId, target.name, target.circuit, target.revision)
          : await circuitApi.create(target.name, target.circuit);
      applySavedRemote(target, stored);
      onMessage(`Circuito salvo no servidor: ${stored.name}.`);
      return true;
    } catch (error) {
      handleSaveError(target.id, error);
      return false;
    }
  }

  function handleSaveError(documentId: string, error: unknown) {
    if (error instanceof CircuitApiError && error.status === 409 && error.remote) {
      setConflict({ documentId, remote: error.remote });
      setSyncState(documentId, 'conflict');
      onMessage('Conflito: há uma versão mais nova no servidor.');
      return;
    }
    if (error instanceof LibraryApiError && error.status === 409 && error.remote) {
      setLibraryConflict({ documentId, remote: error.remote });
      setSyncState(documentId, 'conflict');
      onMessage('Conflito: há uma versão mais nova do componente na biblioteca.');
      return;
    }
    const offline =
      (error instanceof CircuitApiError || error instanceof LibraryApiError) && error.status === 0;
    setSyncState(documentId, offline ? 'offline' : 'error');
    onMessage(error instanceof Error ? error.message : 'Não foi possível salvar.');
  }

  async function saveDocumentAs(target: WorkspaceDocument): Promise<boolean> {
    const suggested = target.name.replace(/\.json$/i, '');
    const name = window
      .prompt(target.libraryId ? 'Nome do novo componente:' : 'Nome do novo circuito:', suggested)
      ?.trim();
    if (!name) {
      onMessage('Salvar como cancelado.');
      return false;
    }
    setSyncState(target.id, 'saving');
    try {
      if (target.libraryId) {
        const stored = await libraryApi.create(name, toLibraryDefinition(target.circuit));
        applySavedLibrary(target, stored);
        onMessage(`Nova cópia salva na biblioteca: ${stored.name}.`);
        return true;
      }
      const stored = await circuitApi.create(name, target.circuit);
      applySavedRemote(target, stored);
      onMessage(`Nova cópia salva: ${stored.name}.`);
      return true;
    } catch (error) {
      handleSaveError(target.id, error);
      return false;
    }
  }

  function saveActiveDocument() {
    void saveDocument(activeDocument);
  }
  function saveActiveDocumentAs() {
    void saveDocumentAs(activeDocument);
  }
  function downloadActiveDocument() {
    const filename = ensureJsonExtension(activeDocument.name);
    downloadJson(filename, activeDocument.circuit);
    onMessage(`JSON baixado: ${filename}.`);
  }

  async function refreshRemoteCircuits(open = false) {
    if (open) setRemoteBrowserOpen(true);
    setRemoteLoading(true);
    try {
      setRemoteCircuits(await circuitApi.list());
    } catch (error) {
      onMessage(error instanceof Error ? error.message : 'Não foi possível listar os circuitos.');
    } finally {
      setRemoteLoading(false);
    }
  }

  async function openRemoteDocument(remoteId: string) {
    const alreadyOpen = documents.find((item) => item.remoteId === remoteId);
    if (alreadyOpen) {
      setActiveDocumentId(alreadyOpen.id);
      setRemoteBrowserOpen(false);
      onMessage(`Circuito já aberto: ${alreadyOpen.name}.`);
      return;
    }
    try {
      const stored = await circuitApi.get(remoteId);
      const document: WorkspaceDocument = {
        id: `doc-${Date.now()}`,
        name: stored.name,
        circuit: normalizeCircuitForEditor(stored.circuit),
        exampleId: null,
        saved: true,
        everSaved: true,
        remoteId: stored.id,
        revision: stored.revision,
      };
      setDocuments((current) => [...current, document]);
      setActiveDocumentId(document.id);
      setSyncState(document.id, 'saved');
      setRemoteBrowserOpen(false);
      onMessage(`Circuito aberto: ${stored.name}.`);
    } catch (error) {
      onMessage(error instanceof Error ? error.message : 'Não foi possível abrir o circuito.');
    }
  }

  async function deleteRemoteDocument(remoteId: string) {
    const summary = remoteCircuits.find((item) => item.id === remoteId);
    if (!summary || !window.confirm(`Excluir “${summary.name}” do servidor?`)) return;
    try {
      await circuitApi.delete(remoteId);
      setRemoteCircuits((current) => current.filter((item) => item.id !== remoteId));
      setDocuments((current) =>
        current.map((item) =>
          item.remoteId === remoteId
            ? { ...item, remoteId: null, revision: null, saved: false }
            : item,
        ),
      );
      onMessage(`Circuito excluído: ${summary.name}. A aba local foi preservada como rascunho.`);
    } catch (error) {
      onMessage(error instanceof Error ? error.message : 'Não foi possível excluir o circuito.');
    }
  }

  async function renameDocument(documentId: string, name: string) {
    const trimmed = name.trim();
    const current = documents.find((item) => item.id === documentId);
    if (!current || !trimmed || trimmed === current.name) return;
    if (current.libraryId && current.revision) {
      setSyncState(documentId, 'saving');
      try {
        const stored = await libraryApi.update(
          current.libraryId,
          trimmed,
          toLibraryDefinition(current.circuit),
          current.revision,
        );
        applySavedLibrary(current, stored);
        onMessage(`Componente renomeado: ${trimmed}.`);
      } catch (error) {
        handleSaveError(documentId, error);
      }
      return;
    }
    if (!current.remoteId || !current.revision) {
      setDocuments((items) =>
        items.map((item) => (item.id === documentId ? { ...item, name: trimmed } : item)),
      );
      onMessage(`Circuito renomeado: ${trimmed}.`);
      return;
    }
    setSyncState(documentId, 'saving');
    try {
      const stored = await circuitApi.update(
        current.remoteId,
        trimmed,
        current.circuit,
        current.revision,
      );
      applySavedRemote(current, stored);
      onMessage(`Circuito renomeado: ${trimmed}.`);
    } catch (error) {
      handleSaveError(documentId, error);
    }
  }

  function loadExample(exampleId: string) {
    const example = CIRCUIT_EXAMPLES.find((item) => item.id === exampleId);
    if (!example) return;
    const id = `doc-${Date.now()}`;
    setDocuments((current) => [
      ...current,
      {
        id,
        name: example.name,
        circuit: normalizeCircuitForEditor(cloneCircuit(example.circuit)),
        exampleId: example.id,
        saved: false,
        everSaved: false,
        remoteId: null,
        revision: null,
      },
    ]);
    setActiveDocumentId(id);
    onMessage(`Exemplo aberto em nova aba: ${example.name}.`);
  }

  function importJson(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    file
      .text()
      .then((text) => {
        const parsed: unknown = JSON.parse(text);
        if (!isCircuitDocument(parsed)) throw new Error('Formato inválido');
        const id = `doc-${Date.now()}`;
        setDocuments((current) => [
          ...current,
          {
            id,
            name: file.name || `importado_${current.length + 1}.json`,
            circuit: normalizeCircuitForEditor(parsed),
            exampleId: null,
            saved: false,
            everSaved: false,
            remoteId: null,
            revision: null,
          },
        ]);
        setActiveDocumentId(id);
        onMessage('JSON importado como cópia ainda não salva.');
      })
      .catch(() => onMessage('Não foi possível importar esse JSON.'));
    event.target.value = '';
  }

  async function refreshLibraryEntries(open = false) {
    if (open) setLibraryDialogOpen(true);
    setLibraryLoading(true);
    try {
      setLibraryEntries(await libraryApi.list());
    } catch (error) {
      onMessage(error instanceof Error ? error.message : 'Não foi possível listar a biblioteca.');
    } finally {
      setLibraryLoading(false);
    }
  }

  async function openLibraryEntryForEditing(id: string) {
    const alreadyOpen = documents.find((item) => item.libraryId === id);
    if (alreadyOpen) {
      setActiveDocumentId(alreadyOpen.id);
      setLibraryDialogOpen(false);
      onMessage(`Componente já aberto: ${alreadyOpen.name}.`);
      return;
    }
    try {
      const stored = await libraryApi.get(id);
      const document: WorkspaceDocument = {
        id: `doc-${Date.now()}`,
        name: stored.name,
        circuit: normalizeCircuitForEditor({
          version: 1,
          components: stored.definition.components,
          wires: stored.definition.wires,
        }),
        exampleId: null,
        saved: true,
        everSaved: true,
        remoteId: null,
        revision: stored.revision,
        libraryId: stored.id,
      };
      setDocuments((current) => [...current, document]);
      setActiveDocumentId(document.id);
      setSyncState(document.id, 'saved');
      setLibraryDialogOpen(false);
      onMessage(`Componente aberto para edição: ${stored.name}.`);
    } catch (error) {
      onMessage(error instanceof Error ? error.message : 'Não foi possível abrir o componente.');
    }
  }

  async function deleteLibraryEntry(id: string) {
    const summary = libraryEntries.find((item) => item.id === id);
    if (!summary || !window.confirm(`Excluir “${summary.name}” da biblioteca?`)) return;
    try {
      await libraryApi.delete(id);
      setLibraryEntries((current) => current.filter((item) => item.id !== id));
      setDocuments((current) =>
        current.map((item) =>
          item.libraryId === id ? { ...item, libraryId: null, revision: null, saved: false } : item,
        ),
      );
      onMessage(`Componente excluído: ${summary.name}. A aba local foi preservada como rascunho.`);
    } catch (error) {
      onMessage(error instanceof Error ? error.message : 'Não foi possível excluir o componente.');
    }
  }

  async function saveDefinitionToLibrary(
    name: string,
    definition: LibraryComponentDefinition,
  ): Promise<boolean> {
    try {
      const stored = await libraryApi.create(name, definition);
      setLibraryEntries((current) => [
        {
          id: stored.id,
          name: stored.name,
          revision: stored.revision,
          createdAt: stored.createdAt,
          updatedAt: stored.updatedAt,
        },
        ...current,
      ]);
      onMessage(`Componente salvo na biblioteca: ${stored.name}.`);
      return true;
    } catch (error) {
      onMessage(error instanceof Error ? error.message : 'Não foi possível salvar na biblioteca.');
      return false;
    }
  }

  function reloadLibraryConflict() {
    if (!libraryConflict) return;
    const { documentId, remote } = libraryConflict;
    setDocuments((current) =>
      current.map((item) =>
        item.id === documentId
          ? {
              ...item,
              name: remote.name,
              circuit: normalizeCircuitForEditor({
                version: 1,
                components: remote.definition.components,
                wires: remote.definition.wires,
              }),
              libraryId: remote.id,
              revision: remote.revision,
              saved: true,
              everSaved: true,
            }
          : item,
      ),
    );
    setSyncState(documentId, 'saved');
    setLibraryConflict(null);
    onMessage('Versão mais nova da biblioteca carregada.');
  }

  function saveLibraryConflictAsCopy() {
    if (!libraryConflict) return;
    const target = documents.find((item) => item.id === libraryConflict.documentId);
    setLibraryConflict(null);
    if (target) void saveDocumentAs({ ...target, libraryId: null, revision: null });
  }

  function reloadConflict() {
    if (!conflict) return;
    const { documentId, remote } = conflict;
    setDocuments((current) =>
      current.map((item) =>
        item.id === documentId
          ? {
              ...item,
              name: remote.name,
              circuit: normalizeCircuitForEditor(remote.circuit),
              remoteId: remote.id,
              revision: remote.revision,
              saved: true,
              everSaved: true,
            }
          : item,
      ),
    );
    setSyncState(documentId, 'saved');
    setConflict(null);
    onMessage('Versão mais nova do servidor carregada.');
  }

  function saveConflictAsCopy() {
    if (!conflict) return;
    const target = documents.find((item) => item.id === conflict.documentId);
    setConflict(null);
    if (target) void saveDocumentAs({ ...target, remoteId: null, revision: null });
  }

  return {
    workspace,
    documents,
    activeDocument,
    activeDocumentId,
    circuit,
    currentExampleId,
    setCircuit,
    setActiveExampleId,
    setWatchedSignals,
    selectDocument,
    createNewDocument,
    requestCloseDocument,
    pendingCloseDocument,
    savePendingCloseDocument,
    discardPendingCloseDocument,
    cancelPendingClose,
    saveActiveDocument,
    saveActiveDocumentAs,
    downloadActiveDocument,
    remoteDocumentIds,
    renameDocument,
    loadExample,
    importJson,
    remoteCircuits,
    remoteBrowserOpen,
    remoteLoading,
    openRemoteBrowser: () => void refreshRemoteCircuits(true),
    closeRemoteBrowser: () => setRemoteBrowserOpen(false),
    refreshRemoteCircuits: () => void refreshRemoteCircuits(),
    openRemoteDocument: (id: string) => void openRemoteDocument(id),
    deleteRemoteDocument: (id: string) => void deleteRemoteDocument(id),
    activeSyncState: syncStates.get(activeDocumentId) ?? 'idle',
    conflict,
    closeConflict: () => setConflict(null),
    reloadConflict,
    saveConflictAsCopy,
    libraryDocumentIds,
    libraryEntries,
    libraryDialogOpen,
    libraryLoading,
    openLibraryDialog: () => void refreshLibraryEntries(true),
    closeLibraryDialog: () => setLibraryDialogOpen(false),
    refreshLibraryEntries: () => void refreshLibraryEntries(),
    openLibraryEntryForEditing: (id: string) => void openLibraryEntryForEditing(id),
    deleteLibraryEntry: (id: string) => void deleteLibraryEntry(id),
    saveDefinitionToLibrary,
    libraryConflict,
    closeLibraryConflict: () => setLibraryConflict(null),
    reloadLibraryConflict,
    saveLibraryConflictAsCopy,
  };
}
