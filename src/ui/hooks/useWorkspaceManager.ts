import { ChangeEvent, useCallback, useReducer, useState, type SetStateAction } from 'react';
import type { CircuitDocument } from '../../core/types';
import { isCircuitDocument } from '../../core/validateCircuitDocument';
import {
  formatHierarchyExpansionViolation,
  inspectCircuitHierarchy,
} from '../../core/hierarchy/expansion.mjs';
import { CIRCUIT_EXAMPLES } from '../../examples/circuitExamples';
import { circuitApi, CircuitApiError, type StoredCircuit } from '../../state/circuitApi';
import {
  libraryApi,
  LibraryApiError,
  type LibraryComponentDefinition,
  type StoredLibraryComponent,
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
import {
  copyDestination,
  documentDestination,
  normalizedPersistenceName,
  persistenceCopyNameSuggestion,
  persistenceNameError,
  persistenceNameSuggestion,
  type PersistenceSaveRequest,
} from '../persistence/documentPersistence';
import { libraryEntryToWorkspaceDocument, useLibraryBrowser } from './useLibraryBrowser';
import {
  remoteCircuitToWorkspaceDocument,
  useRemoteCircuitBrowser,
} from './useRemoteCircuitBrowser';
import type { RemoteSyncState } from './workspaceTypes';
import { INITIAL_WORKSPACE_SYNC_MODEL, workspaceSyncReducer } from './workspaceSyncState';

export type { RemoteSyncState } from './workspaceTypes';

interface Options {
  onMessage: (message: string) => void;
}

export function useWorkspaceManager({ onMessage }: Options) {
  const [workspace, setWorkspace] = useState(() => loadWorkspace());
  const [pendingCloseId, setPendingCloseId] = useState<string | null>(null);
  const [pendingPersistenceSave, setPendingPersistenceSave] =
    useState<PersistenceSaveRequest | null>(null);
  const [syncModel, dispatchSync] = useReducer(workspaceSyncReducer, INITIAL_WORKSPACE_SYNC_MODEL);
  const { conflict, libraryConflict } = syncModel;

  const documents = workspace.documents;
  const activeDocumentId = workspace.activeDocumentId;
  const activeDocument = documents.find((item) => item.id === activeDocumentId) ?? documents[0];
  const circuit = activeDocument.circuit;
  const currentExampleId = activeDocument.exampleId;
  const pendingCloseDocument = documents.find((item) => item.id === pendingCloseId) ?? null;
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
    dispatchSync({ type: 'status', documentId, status: state });
  }

  const remoteBrowser = useRemoteCircuitBrowser({
    documents,
    setDocuments,
    setActiveDocumentId,
    setSyncState,
    onMessage,
  });
  const libraryBrowser = useLibraryBrowser({
    documents,
    setDocuments,
    setActiveDocumentId,
    setSyncState,
    onMessage,
  });

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
    if (documentDestination(target) === 'draft') {
      requestPersistenceName(target, 'bind', true);
      return;
    }
    if (await saveDocument(target)) {
      setPendingCloseId(null);
      closeDocument(target.id);
    }
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
              libraryId: null,
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
              remoteId: null,
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
    const hierarchy = inspectCircuitHierarchy(target.circuit);
    if (!hierarchy.ok) {
      setSyncState(target.id, 'error');
      onMessage(
        `${formatHierarchyExpansionViolation(hierarchy.violation)} Reduza o circuito antes de salvar.`,
      );
      return false;
    }
    if (
      (documentDestination(target) === 'library' && (!target.libraryId || !target.revision)) ||
      (documentDestination(target) === 'remote' && (!target.remoteId || !target.revision))
    ) {
      setSyncState(target.id, 'error');
      onMessage('O vínculo desta aba está incompleto. Crie uma cópia para preservar o circuito.');
      return false;
    }
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
      if (!target.remoteId || !target.revision) return false;
      const stored = await circuitApi.update(
        target.remoteId,
        target.name,
        target.circuit,
        target.revision,
      );
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
      dispatchSync({ type: 'circuit-conflict', conflict: { documentId, remote: error.remote } });
      onMessage('Conflito: há uma versão mais nova no servidor.');
      return;
    }
    if (error instanceof LibraryApiError && error.status === 409 && error.remote) {
      dispatchSync({
        type: 'library-conflict',
        conflict: { documentId, remote: error.remote },
      });
      onMessage('Conflito: há uma versão mais nova do componente na biblioteca.');
      return;
    }
    const offline =
      (error instanceof CircuitApiError || error instanceof LibraryApiError) && error.status === 0;
    setSyncState(documentId, offline ? 'offline' : 'error');
    onMessage(error instanceof Error ? error.message : 'Não foi possível salvar.');
  }

  function requestPersistenceName(
    target: WorkspaceDocument,
    mode: PersistenceSaveRequest['mode'],
    closeAfterSave = false,
  ) {
    setPendingPersistenceSave({
      documentId: target.id,
      mode,
      destination: mode === 'bind' ? 'remote' : copyDestination(target),
      initialName:
        mode === 'bind'
          ? persistenceNameSuggestion(target.name)
          : persistenceCopyNameSuggestion(target.name),
      closeAfterSave,
    });
  }

  async function confirmPersistenceSave(name: string): Promise<boolean> {
    const request = pendingPersistenceSave;
    const target = request
      ? documents.find((document) => document.id === request.documentId)
      : null;
    if (!request || !target) {
      setPendingPersistenceSave(null);
      return false;
    }

    const nameError = persistenceNameError(name);
    if (nameError) {
      onMessage(nameError);
      return false;
    }
    const hierarchy = inspectCircuitHierarchy(target.circuit);
    if (!hierarchy.ok) {
      if (request.mode === 'bind') setSyncState(target.id, 'error');
      onMessage(
        `${formatHierarchyExpansionViolation(hierarchy.violation)} Reduza o circuito antes de salvar.`,
      );
      return false;
    }
    const normalizedName = normalizedPersistenceName(name);

    try {
      if (request.mode === 'bind') {
        setSyncState(target.id, 'saving');
        const stored = await circuitApi.create(normalizedName, target.circuit);
        applySavedRemote(target, stored);
        setPendingPersistenceSave(null);
        onMessage(`Circuito salvo no servidor: ${stored.name}.`);
        if (request.closeAfterSave) {
          setPendingCloseId(null);
          closeDocument(target.id);
        }
        return true;
      }

      const documentId = nextWorkspaceDocumentId(documents);
      if (request.destination === 'library') {
        const stored = await libraryApi.create(normalizedName, toLibraryDefinition(target.circuit));
        const copy = {
          ...libraryEntryToWorkspaceDocument(stored, documentId),
          watchedSignals: target.watchedSignals,
        };
        setDocuments((current) => [...current, copy]);
        setActiveDocumentId(copy.id);
        setSyncState(copy.id, 'saved');
        setPendingPersistenceSave(null);
        onMessage(`Cópia criada na biblioteca e aberta: ${stored.name}.`);
        return true;
      }

      const stored = await circuitApi.create(normalizedName, target.circuit);
      const copy = {
        ...remoteCircuitToWorkspaceDocument(stored, documentId),
        watchedSignals: target.watchedSignals,
      };
      setDocuments((current) => [...current, copy]);
      setActiveDocumentId(copy.id);
      setSyncState(copy.id, 'saved');
      setPendingPersistenceSave(null);
      onMessage(`Cópia criada no servidor e aberta: ${stored.name}.`);
      return true;
    } catch (error) {
      if (request.mode === 'bind') {
        handleSaveError(target.id, error);
      } else {
        onMessage(error instanceof Error ? error.message : 'Não foi possível criar a cópia.');
      }
      return false;
    }
  }

  function saveActiveDocument() {
    if (documentDestination(activeDocument) === 'draft') {
      requestPersistenceName(activeDocument, 'bind');
      return;
    }
    void saveDocument(activeDocument);
  }
  function saveActiveDocumentAs() {
    requestPersistenceName(activeDocument, 'copy');
  }
  function downloadActiveDocument() {
    const filename = ensureJsonExtension(activeDocument.name);
    downloadJson(filename, activeDocument.circuit);
    onMessage(`JSON baixado: ${filename}.`);
  }

  async function renameDocument(documentId: string, name: string) {
    const trimmed = name.trim();
    const current = documents.find((item) => item.id === documentId);
    if (!current || !trimmed || trimmed === current.name) return;
    if (documentDestination(current) !== 'draft') {
      const nameError = persistenceNameError(trimmed);
      if (nameError) {
        onMessage(nameError);
        return;
      }
    }
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

  function loadExample(exampleId: string): boolean {
    const example = CIRCUIT_EXAMPLES.find((item) => item.id === exampleId);
    if (!example) return false;
    const id = `doc-${Date.now()}`;
    setDocuments((current) => [
      ...current,
      {
        id,
        name: example.name,
        circuit: normalizeCircuitForEditor(cloneCircuit(example.circuit)),
        exampleId: example.id,
        // O catálogo embutido é o baseline limpo desta aba. Isso não cria
        // vínculo remoto: Ctrl+S continua criando um circuito do usuário
        // porque remoteId/revision permanecem nulos.
        saved: true,
        // Mantém a remoção completa do exemplo como mudança protegida.
        everSaved: true,
        remoteId: null,
        revision: null,
      },
    ]);
    setActiveDocumentId(id);
    onMessage(`Exemplo aberto em nova aba: ${example.name}.`);
    return true;
  }

  function importJson(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    file
      .text()
      .then((text) => {
        const parsed: unknown = JSON.parse(text);
        if (!isCircuitDocument(parsed)) throw new Error('Formato inválido');
        const hierarchy = inspectCircuitHierarchy(parsed);
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
        onMessage(
          hierarchy.ok
            ? 'JSON importado como cópia ainda não salva.'
            : `${formatHierarchyExpansionViolation(hierarchy.violation)} Aberto em modo de recuperação.`,
        );
      })
      .catch(() => onMessage('Não foi possível importar esse JSON.'));
    event.target.value = '';
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
    dispatchSync({ type: 'resolve-library-conflict' });
    onMessage('Versão mais nova da biblioteca carregada.');
  }

  function saveLibraryConflictAsCopy() {
    if (!libraryConflict) return;
    const target = documents.find((item) => item.id === libraryConflict.documentId);
    dispatchSync({ type: 'close-library-conflict' });
    if (target) requestPersistenceName(target, 'copy');
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
    dispatchSync({ type: 'resolve-circuit-conflict' });
    onMessage('Versão mais nova do servidor carregada.');
  }

  function saveConflictAsCopy() {
    if (!conflict) return;
    const target = documents.find((item) => item.id === conflict.documentId);
    dispatchSync({ type: 'close-circuit-conflict' });
    if (target) requestPersistenceName(target, 'copy');
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
    pendingPersistenceSave,
    confirmPersistenceSave,
    cancelPersistenceSave: () => setPendingPersistenceSave(null),
    downloadActiveDocument,
    renameDocument,
    loadExample,
    importJson,
    remoteCircuits: remoteBrowser.circuits,
    remoteBrowserOpen: remoteBrowser.open,
    remoteLoading: remoteBrowser.loading,
    openRemoteBrowser: remoteBrowser.openBrowser,
    closeRemoteBrowser: remoteBrowser.closeBrowser,
    refreshRemoteCircuits: remoteBrowser.refresh,
    openRemoteDocument: remoteBrowser.openDocument,
    deleteRemoteDocument: remoteBrowser.deleteDocument,
    activeSyncState: syncModel.states.get(activeDocumentId) ?? 'idle',
    conflict,
    closeConflict: () => dispatchSync({ type: 'close-circuit-conflict' }),
    reloadConflict,
    saveConflictAsCopy,
    libraryEntries: libraryBrowser.entries,
    libraryDialogOpen: libraryBrowser.open,
    libraryLoading: libraryBrowser.loading,
    openLibraryDialog: libraryBrowser.openDialog,
    closeLibraryDialog: libraryBrowser.closeDialog,
    refreshLibraryEntries: libraryBrowser.refresh,
    openLibraryEntryForEditing: libraryBrowser.openEntryForEditing,
    deleteLibraryEntry: libraryBrowser.deleteEntry,
    saveDefinitionToLibrary: libraryBrowser.saveDefinition,
    libraryConflict,
    closeLibraryConflict: () => dispatchSync({ type: 'close-library-conflict' }),
    reloadLibraryConflict,
    saveLibraryConflictAsCopy,
  };
}

function nextWorkspaceDocumentId(documents: readonly WorkspaceDocument[]): string {
  const base = `doc-${Date.now()}`;
  if (!documents.some((document) => document.id === base)) return base;
  let suffix = 2;
  while (documents.some((document) => document.id === `${base}-${suffix}`)) suffix += 1;
  return `${base}-${suffix}`;
}
