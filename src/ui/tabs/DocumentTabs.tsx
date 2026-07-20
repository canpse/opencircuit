import { useRef, useState } from 'react';
import { isDocumentDirty, type WorkspaceDocument } from '../../state/workspaceStorage';
import { CIRCUIT_EXAMPLES } from '../../examples/circuitExamples';

interface Props {
  documents: WorkspaceDocument[];
  activeDocumentId: string;
  linkedDocumentIds: ReadonlySet<string>;
  onSelect: (documentId: string) => void;
  onRequestClose: (documentId: string) => void;
  onRename: (documentId: string, name: string) => void;
  onCreate: () => void;
}

export function DocumentTabs({
  documents,
  activeDocumentId,
  linkedDocumentIds,
  onSelect,
  onRequestClose,
  onRename,
  onCreate,
}: Props) {
  const [editing, setEditing] = useState<{ documentId: string; draft: string } | null>(null);
  // Escape precisa descartar o rascunho sem que o blur subsequente o confirme.
  const cancelledRef = useRef(false);

  function startEditing(document: WorkspaceDocument) {
    cancelledRef.current = false;
    setEditing({ documentId: document.id, draft: document.name });
  }

  function commitEditing() {
    if (!editing || cancelledRef.current) return;
    onRename(editing.documentId, editing.draft);
    setEditing(null);
  }

  function cancelEditing() {
    cancelledRef.current = true;
    setEditing(null);
  }

  return (
    <div className="document-tabs">
      {documents.map((document) => (
        <div
          key={document.id}
          className={`document-tab ${document.id === activeDocumentId ? 'active' : ''}`}
          title={
            document.exampleId
              ? `Exemplo: ${CIRCUIT_EXAMPLES.find((example) => example.id === document.exampleId)?.name ?? document.exampleId}`
              : document.name
          }
        >
          {editing?.documentId === document.id ? (
            <input
              className="document-tab-rename"
              value={editing.draft}
              autoFocus
              onFocus={(event) => event.target.select()}
              onChange={(event) =>
                setEditing({ documentId: document.id, draft: event.target.value })
              }
              onKeyDown={(event) => {
                if (event.key === 'Enter') commitEditing();
                if (event.key === 'Escape') cancelEditing();
              }}
              onBlur={commitEditing}
            />
          ) : (
            <button
              className="document-tab-title"
              title={
                linkedDocumentIds.has(document.id)
                  ? 'O nome segue o arquivo vinculado — use Salvar como para trocar'
                  : 'Duplo clique para renomear'
              }
              onClick={() => onSelect(document.id)}
              onDoubleClick={
                linkedDocumentIds.has(document.id) ? undefined : () => startEditing(document)
              }
            >
              {document.name}
            </button>
          )}
          {isDocumentDirty(document) && (
            <span
              className="document-tab-dirty"
              title="Mudanças não salvas"
              aria-label="Mudanças não salvas"
            >
              •
            </span>
          )}
          <button
            className="document-tab-close"
            aria-label={`Fechar ${document.name}`}
            onClick={(event) => {
              event.stopPropagation();
              onRequestClose(document.id);
            }}
          >
            ×
          </button>
        </div>
      ))}
      <button className="document-tab add-tab" onClick={onCreate}>
        +
      </button>
    </div>
  );
}
