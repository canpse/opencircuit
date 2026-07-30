import type { StoredLibraryComponentSummary } from '../../state/libraryApi';

interface Props {
  entries: StoredLibraryComponentSummary[];
  loading: boolean;
  pendingInsertId: string | null;
  onInsert: (id: string) => void;
  onEdit: (id: string) => void;
  onDelete: (id: string) => void;
  onRefresh: () => void;
  onClose: () => void;
}

export function LibraryDialog({
  entries,
  loading,
  pendingInsertId,
  onInsert,
  onEdit,
  onDelete,
  onRefresh,
  onClose,
}: Props) {
  return (
    <div
      className="dialog-overlay"
      onMouseDown={() => {
        if (!pendingInsertId) onClose();
      }}
    >
      <div
        className="dialog remote-circuits-dialog library-browser-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="library-title"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <span className="library-dialog-eyebrow">Componentes reutilizáveis</span>
        <h2 id="library-title">Minha biblioteca</h2>
        <p>
          Insira uma cópia independente no circuito atual ou abra a origem em uma aba para editá-la.
        </p>
        {loading ? (
          <p>Carregando…</p>
        ) : entries.length === 0 ? (
          <p>Nenhum componente salvo na biblioteca.</p>
        ) : (
          <div className="remote-circuit-list">
            {entries.map((entry) => (
              <article className="remote-circuit-row library-entry-row" key={entry.id}>
                <div className="library-entry-details">
                  <strong>{entry.name}</strong>
                  <span>Alterado em {new Date(entry.updatedAt).toLocaleString('pt-BR')}</span>
                </div>
                <button
                  className="dialog-primary"
                  disabled={pendingInsertId !== null}
                  onClick={() => onInsert(entry.id)}
                  aria-label={`Inserir ${entry.name}`}
                >
                  {pendingInsertId === entry.id ? 'Preparando…' : 'Inserir'}
                </button>
                <button
                  disabled={pendingInsertId !== null}
                  onClick={() => onEdit(entry.id)}
                  aria-label={`Editar ${entry.name}`}
                >
                  Editar
                </button>
                <button
                  className="dialog-danger"
                  disabled={pendingInsertId !== null}
                  onClick={() => onDelete(entry.id)}
                  aria-label={`Excluir ${entry.name}`}
                >
                  Excluir
                </button>
              </article>
            ))}
          </div>
        )}
        <div className="dialog-actions">
          <button disabled={pendingInsertId !== null} onClick={onRefresh}>
            Recarregar lista
          </button>
          <button className="dialog-primary" disabled={pendingInsertId !== null} onClick={onClose}>
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
}
