import { useState, type SetStateAction } from 'react';
import {
  libraryApi,
  type LibraryComponentDefinition,
  type StoredLibraryComponent,
  type StoredLibraryComponentSummary,
} from '../../state/libraryApi';
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

export function libraryEntryToWorkspaceDocument(
  stored: StoredLibraryComponent,
  documentId = `doc-${Date.now()}`,
): WorkspaceDocument {
  return {
    id: documentId,
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
}

export function useLibraryBrowser({
  documents,
  setDocuments,
  setActiveDocumentId,
  setSyncState,
  onMessage,
}: Options) {
  const [entries, setEntries] = useState<StoredLibraryComponentSummary[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  async function refresh(shouldOpen = false) {
    if (shouldOpen) setOpen(true);
    setLoading(true);
    try {
      setEntries(await libraryApi.list());
    } catch (error) {
      onMessage(error instanceof Error ? error.message : 'Não foi possível listar a biblioteca.');
    } finally {
      setLoading(false);
    }
  }

  async function openEntryForEditing(id: string) {
    const alreadyOpen = documents.find((item) => item.libraryId === id);
    if (alreadyOpen) {
      setActiveDocumentId(alreadyOpen.id);
      setOpen(false);
      onMessage(`Componente já aberto: ${alreadyOpen.name}.`);
      return;
    }
    try {
      const stored = await libraryApi.get(id);
      const document = libraryEntryToWorkspaceDocument(stored);
      setDocuments((current) => [...current, document]);
      setActiveDocumentId(document.id);
      setSyncState(document.id, 'saved');
      setOpen(false);
      onMessage(`Componente aberto para edição: ${stored.name}.`);
    } catch (error) {
      onMessage(error instanceof Error ? error.message : 'Não foi possível abrir o componente.');
    }
  }

  async function deleteEntry(id: string) {
    const summary = entries.find((item) => item.id === id);
    if (!summary || !window.confirm(`Excluir “${summary.name}” da biblioteca?`)) return;
    try {
      await libraryApi.delete(id);
      setEntries((current) => current.filter((item) => item.id !== id));
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

  async function saveDefinition(
    name: string,
    definition: LibraryComponentDefinition,
  ): Promise<boolean> {
    try {
      const stored = await libraryApi.create(name, definition);
      setEntries((current) => [
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

  return {
    entries,
    open,
    loading,
    openDialog: () => void refresh(true),
    closeDialog: () => setOpen(false),
    refresh: () => void refresh(),
    openEntryForEditing: (id: string) => void openEntryForEditing(id),
    deleteEntry: (id: string) => void deleteEntry(id),
    saveDefinition,
  };
}
