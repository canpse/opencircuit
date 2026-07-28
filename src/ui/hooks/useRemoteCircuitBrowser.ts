import { useState, type SetStateAction } from 'react';
import { circuitApi, type StoredCircuit, type StoredCircuitSummary } from '../../state/circuitApi';
import type { WorkspaceDocument } from '../../state/workspaceStorage';
import { normalizeCircuitForEditor } from '../app/editorUtils';
import type { RemoteSyncState } from './workspaceTypes';

interface Options {
  documents: WorkspaceDocument[];
  setDocuments: (action: SetStateAction<WorkspaceDocument[]>) => void;
  setActiveDocumentId: (documentId: string) => void;
  setSyncState: (documentId: string, state: RemoteSyncState) => void;
  onMessage: (message: string) => void;
}

export function remoteCircuitToWorkspaceDocument(
  stored: StoredCircuit,
  documentId = `doc-${Date.now()}`,
): WorkspaceDocument {
  return {
    id: documentId,
    name: stored.name,
    circuit: normalizeCircuitForEditor(stored.circuit),
    exampleId: null,
    saved: true,
    everSaved: true,
    remoteId: stored.id,
    revision: stored.revision,
  };
}

export function useRemoteCircuitBrowser({
  documents,
  setDocuments,
  setActiveDocumentId,
  setSyncState,
  onMessage,
}: Options) {
  const [circuits, setCircuits] = useState<StoredCircuitSummary[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  async function refresh(shouldOpen = false) {
    if (shouldOpen) setOpen(true);
    setLoading(true);
    try {
      setCircuits(await circuitApi.list());
    } catch (error) {
      onMessage(error instanceof Error ? error.message : 'Não foi possível listar os circuitos.');
    } finally {
      setLoading(false);
    }
  }

  async function openDocument(remoteId: string) {
    const alreadyOpen = documents.find((item) => item.remoteId === remoteId);
    if (alreadyOpen) {
      setActiveDocumentId(alreadyOpen.id);
      setOpen(false);
      onMessage(`Circuito já aberto: ${alreadyOpen.name}.`);
      return;
    }
    try {
      const stored = await circuitApi.get(remoteId);
      const document = remoteCircuitToWorkspaceDocument(stored);
      setDocuments((current) => [...current, document]);
      setActiveDocumentId(document.id);
      setSyncState(document.id, 'saved');
      setOpen(false);
      onMessage(`Circuito aberto: ${stored.name}.`);
    } catch (error) {
      onMessage(error instanceof Error ? error.message : 'Não foi possível abrir o circuito.');
    }
  }

  async function deleteDocument(remoteId: string) {
    const summary = circuits.find((item) => item.id === remoteId);
    if (!summary || !window.confirm(`Excluir “${summary.name}” do servidor?`)) return;
    try {
      await circuitApi.delete(remoteId);
      setCircuits((current) => current.filter((item) => item.id !== remoteId));
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

  return {
    circuits,
    open,
    loading,
    openBrowser: () => void refresh(true),
    closeBrowser: () => setOpen(false),
    refresh: () => void refresh(),
    openDocument: (id: string) => void openDocument(id),
    deleteDocument: (id: string) => void deleteDocument(id),
  };
}
