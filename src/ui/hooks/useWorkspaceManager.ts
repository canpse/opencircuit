import { ChangeEvent, useCallback, useEffect, useMemo, useState, type SetStateAction } from 'react';
import type { CircuitDocument } from '../../core/types';
import { isCircuitDocument } from '../../core/validateCircuitDocument';
import { cloneCircuit, normalizeCircuitForEditor } from '../app/editorUtils';
import { downloadJson } from '../../state/storage';
import {
  createUntitledDocument,
  ensureJsonExtension,
  isDocumentDirty,
  loadWorkspace,
  type WorkspaceDocument,
} from '../../state/workspaceStorage';
import {
  ensureWritePermission,
  loadFileHandles,
  pickFileToSave,
  pickFilesToOpen,
  removeFileHandle,
  serializeCircuit,
  storeFileHandle,
  supportsFileSystemAccess,
  writeTextToHandle,
} from '../../state/fileSystem';
import { CIRCUIT_EXAMPLES } from '../../examples/circuitExamples';

interface Options {
  onMessage: (message: string) => void;
}

export function useWorkspaceManager({ onMessage }: Options) {
  const [workspace, setWorkspace] = useState(() => loadWorkspace());
  const [pendingCloseId, setPendingCloseId] = useState<string | null>(null);
  const [linkedFiles, setLinkedFiles] = useState<ReadonlyMap<string, FileSystemFileHandle>>(
    () => new Map(),
  );

  const documents = workspace.documents;
  const activeDocumentId = workspace.activeDocumentId;
  const activeDocument =
    documents.find((document) => document.id === activeDocumentId) ?? documents[0];
  const circuit = activeDocument.circuit;
  const currentExampleId = activeDocument.exampleId;
  const pendingCloseDocument = documents.find((document) => document.id === pendingCloseId) ?? null;
  const linkedDocumentIds = useMemo(() => new Set(linkedFiles.keys()), [linkedFiles]);

  // Restaura os vínculos com arquivo da sessão anterior. A permissão de
  // escrita é revalidada só na hora de salvar (requestPermission exige gesto
  // do usuário); handles de documentos que não existem mais são limpos.
  useEffect(() => {
    if (!supportsFileSystemAccess()) return;
    let cancelled = false;
    const knownIds = new Set(workspace.documents.map((document) => document.id));
    void loadFileHandles().then((stored) => {
      if (cancelled) return;
      const restored = new Map<string, FileSystemFileHandle>();
      for (const [documentId, handle] of stored) {
        if (knownIds.has(documentId)) {
          restored.set(documentId, handle);
        } else {
          void removeFileHandle(documentId);
        }
      }
      if (restored.size > 0) setLinkedFiles(restored);
    });
    return () => {
      cancelled = true;
    };
    // Roda uma única vez com o workspace carregado na montagem.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function linkFile(documentId: string, handle: FileSystemFileHandle) {
    setLinkedFiles((current) => {
      const next = new Map(current);
      next.set(documentId, handle);
      return next;
    });
    void storeFileHandle(documentId, handle);
  }

  function unlinkFile(documentId: string) {
    setLinkedFiles((current) => {
      if (!current.has(documentId)) return current;
      const next = new Map(current);
      next.delete(documentId);
      return next;
    });
    void removeFileHandle(documentId);
  }

  const setDocuments = useCallback((action: SetStateAction<WorkspaceDocument[]>) => {
    setWorkspace((current) => {
      const nextDocuments = typeof action === 'function' ? action(current.documents) : action;
      const activeStillExists = nextDocuments.some(
        (document) => document.id === current.activeDocumentId,
      );
      return {
        ...current,
        documents: nextDocuments,
        activeDocumentId: activeStillExists
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
      setDocuments((currentDocuments) =>
        currentDocuments.map((document) => {
          if (document.id !== activeDocumentId) return document;
          const nextCircuit =
            typeof action === 'function' ? action(document.circuit) : (action as CircuitDocument);
          if (nextCircuit === document.circuit) return document;
          return { ...document, circuit: nextCircuit, saved: false };
        }),
      );
    },
    [activeDocumentId, setDocuments],
  );

  const setActiveExampleId = useCallback(
    (exampleId: string | null) => {
      setDocuments((currentDocuments) =>
        currentDocuments.map((document) =>
          document.id === activeDocumentId ? { ...document, exampleId } : document,
        ),
      );
    },
    [activeDocumentId, setDocuments],
  );

  function selectDocument(documentId: string) {
    if (documentId === activeDocumentId) return;
    setActiveDocumentId(documentId);
    onMessage('Arquivo alternado.');
  }

  function createNewDocument() {
    const index = documents.length + 1;
    const document = createUntitledDocument(index);
    setDocuments((currentDocuments) => [
      ...currentDocuments,
      { ...document, circuit: normalizeCircuitForEditor(cloneCircuit(document.circuit)) },
    ]);
    setActiveDocumentId(document.id);
    onMessage(`Novo arquivo criado: ${document.name}.`);
  }

  function requestCloseDocument(documentId: string) {
    const document = documents.find((candidate) => candidate.id === documentId);
    if (!document) return;
    if (isDocumentDirty(document)) {
      setPendingCloseId(documentId);
      return;
    }
    closeDocument(documentId);
  }

  async function savePendingCloseDocument() {
    const target = pendingCloseDocument;
    if (!target) return;
    setPendingCloseId(null);
    if (await saveDocument(target)) {
      closeDocument(target.id);
    }
  }

  function discardPendingCloseDocument() {
    if (!pendingCloseDocument) return;
    setPendingCloseId(null);
    closeDocument(pendingCloseDocument.id);
  }

  function cancelPendingClose() {
    setPendingCloseId(null);
  }

  function closeDocument(documentId: string) {
    unlinkFile(documentId);
    const closingIndex = documents.findIndex((document) => document.id === documentId);
    const fallback = documents[closingIndex + 1] ?? documents[closingIndex - 1] ?? documents[0];

    if (documents.length === 1) {
      const replacement = createUntitledDocument(1);
      setDocuments([
        { ...replacement, circuit: normalizeCircuitForEditor(cloneCircuit(replacement.circuit)) },
      ]);
      setActiveDocumentId(replacement.id);
      onMessage('Arquivo fechado. Nova aba vazia aberta.');
      return;
    }

    setDocuments((currentDocuments) =>
      currentDocuments.filter((document) => document.id !== documentId),
    );
    if (documentId === activeDocumentId) {
      setActiveDocumentId(fallback.id);
    }
    onMessage('Arquivo fechado.');
  }

  function markDocumentSaved(documentId: string, name: string) {
    setDocuments((currentDocuments) =>
      currentDocuments.map((document) =>
        document.id === documentId ? { ...document, name, saved: true, everSaved: true } : document,
      ),
    );
  }

  // Com vínculo, sobrescreve o arquivo em silêncio; sem vínculo (ou quando o
  // vínculo morreu) vira "Salvar como". Devolve se o conteúdo foi gravado.
  async function saveDocument(target: WorkspaceDocument): Promise<boolean> {
    const handle = linkedFiles.get(target.id);
    if (!supportsFileSystemAccess() || !handle) return saveDocumentAs(target);

    if (!(await ensureWritePermission(handle))) {
      onMessage('Sem permissão para gravar no arquivo vinculado. Escolha onde salvar.');
      return saveDocumentAs(target);
    }
    try {
      await writeTextToHandle(handle, serializeCircuit(target.circuit));
    } catch {
      // Arquivo movido ou apagado: o vínculo morreu.
      unlinkFile(target.id);
      onMessage('O arquivo vinculado não está mais acessível. Escolha onde salvar.');
      return saveDocumentAs(target);
    }
    markDocumentSaved(target.id, handle.name);
    onMessage(`Arquivo salvo: ${handle.name}.`);
    return true;
  }

  async function saveDocumentAs(target: WorkspaceDocument): Promise<boolean> {
    const filename = ensureJsonExtension(target.name);

    if (!supportsFileSystemAccess()) {
      // Fallback (Firefox/Safari): download direto com o nome da aba.
      downloadJson(filename, target.circuit);
      markDocumentSaved(target.id, filename);
      onMessage(`Arquivo salvo: ${filename}.`);
      return true;
    }

    const handle = await pickFileToSave(filename);
    if (!handle) {
      onMessage('Salvamento cancelado.');
      return false;
    }
    try {
      await writeTextToHandle(handle, serializeCircuit(target.circuit));
    } catch {
      onMessage('Não foi possível gravar o arquivo.');
      return false;
    }
    linkFile(target.id, handle);
    markDocumentSaved(target.id, handle.name);
    onMessage(`Arquivo salvo: ${handle.name}.`);
    return true;
  }

  function saveActiveDocument() {
    void saveDocument(activeDocument);
  }

  function saveActiveDocumentAs() {
    void saveDocumentAs(activeDocument);
  }

  // Abre via showOpenFilePicker e vincula cada arquivo à sua nova aba. O
  // fallback sem a API (input type=file) continua sendo o importJson.
  async function openDocumentsFromPicker() {
    const handles = await pickFilesToOpen();
    if (handles.length === 0) return;

    const opened: WorkspaceDocument[] = [];
    for (const [index, handle] of handles.entries()) {
      try {
        const file = await handle.getFile();
        const parsed: unknown = JSON.parse(await file.text());
        if (!isCircuitDocument(parsed)) throw new Error('Formato inválido');
        const document: WorkspaceDocument = {
          id: `doc-${Date.now()}-${index}`,
          name: file.name,
          circuit: normalizeCircuitForEditor(parsed),
          exampleId: null,
          saved: true,
          everSaved: true,
        };
        opened.push(document);
        linkFile(document.id, handle);
      } catch {
        onMessage(`Não foi possível abrir ${handle.name}.`);
      }
    }
    if (opened.length === 0) return;

    setDocuments((currentDocuments) => [...currentDocuments, ...opened]);
    setActiveDocumentId(opened[opened.length - 1].id);
    if (opened.length === 1) {
      onMessage(`Arquivo aberto: ${opened[0].name}.`);
    } else {
      onMessage(`${opened.length} arquivos abertos.`);
    }
  }

  function renameDocument(documentId: string, name: string) {
    const trimmed = name.trim();
    const current = documents.find((document) => document.id === documentId);
    if (!current || !trimmed || trimmed === current.name) return;
    // Com vínculo o nome segue o arquivo; renomear é só para abas soltas.
    if (linkedDocumentIds.has(documentId)) return;
    setDocuments((currentDocuments) =>
      currentDocuments.map((document) =>
        document.id === documentId ? { ...document, name: trimmed } : document,
      ),
    );
    onMessage(`Arquivo renomeado: ${trimmed}.`);
  }

  function loadExample(exampleId: string) {
    const example = CIRCUIT_EXAMPLES.find((candidate) => candidate.id === exampleId);
    if (!example) return;
    const id = `doc-${Date.now()}`;
    setDocuments((currentDocuments) => [
      ...currentDocuments,
      {
        id,
        name: `${example.name}.json`,
        circuit: normalizeCircuitForEditor(cloneCircuit(example.circuit)),
        exampleId: example.id,
        saved: false,
        everSaved: false,
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
        setDocuments((currentDocuments) => [
          ...currentDocuments,
          {
            id,
            name: file.name || `importado_${currentDocuments.length + 1}.json`,
            circuit: normalizeCircuitForEditor(parsed),
            exampleId: null,
            saved: true,
            everSaved: true,
          },
        ]);
        setActiveDocumentId(id);
        onMessage('Circuito importado em nova aba.');
      })
      .catch(() => onMessage('Não foi possível importar esse JSON.'));
    event.target.value = '';
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
    selectDocument,
    createNewDocument,
    requestCloseDocument,
    pendingCloseDocument,
    savePendingCloseDocument,
    discardPendingCloseDocument,
    cancelPendingClose,
    saveActiveDocument,
    saveActiveDocumentAs,
    openDocumentsFromPicker,
    linkedDocumentIds,
    renameDocument,
    loadExample,
    importJson,
  };
}
