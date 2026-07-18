import { ChangeEvent, useCallback, useState, type SetStateAction } from 'react';
import type { CircuitDocument } from '../../core/types';
import { isCircuitDocument } from '../../core/validateCircuitDocument';
import { cloneCircuit, normalizeCircuitForEditor } from '../app/editorUtils';
import { downloadJson } from '../../state/storage';
import {
  createUntitledDocument,
  loadWorkspace,
  type WorkspaceDocument,
} from '../../state/workspaceStorage';
import { CIRCUIT_EXAMPLES } from '../../examples/circuitExamples';

interface Options {
  onMessage: (message: string) => void;
}

export function useWorkspaceManager({ onMessage }: Options) {
  const [workspace, setWorkspace] = useState(() => loadWorkspace());

  const documents = workspace.documents;
  const activeDocumentId = workspace.activeDocumentId;
  const activeDocument =
    documents.find((document) => document.id === activeDocumentId) ?? documents[0];
  const circuit = activeDocument.circuit;
  const currentExampleId = activeDocument.exampleId;

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

  function closeDocument(documentId: string) {
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

  function saveActiveDocument() {
    const suggestedName = activeDocument.name.endsWith('.json')
      ? activeDocument.name
      : `${activeDocument.name}.json`;
    const chosenName = window.prompt('Nome do arquivo para salvar:', suggestedName);
    if (!chosenName) {
      onMessage('Salvamento cancelado.');
      return;
    }
    const filename = chosenName.endsWith('.json') ? chosenName : `${chosenName}.json`;
    downloadJson(filename, circuit);
    setDocuments((currentDocuments) =>
      currentDocuments.map((document) =>
        document.id === activeDocumentId ? { ...document, name: filename, saved: true } : document,
      ),
    );
    onMessage(`Arquivo salvo: ${filename}.`);
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
    closeDocument,
    saveActiveDocument,
    loadExample,
    importJson,
  };
}
