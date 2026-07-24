import type { StoredLibraryComponentSummary } from '../../state/libraryApi';

interface Props {
  entries: StoredLibraryComponentSummary[];
  loading: boolean;
  onInsert: (id: string) => void;
  onEdit: (id: string) => void;
  onDelete: (id: string) => void;
  onRefresh: () => void;
  onClose: () => void;
}

export function LibraryDialog({
  entries,
  loading,
  onInsert,
  onEdit,
  onDelete,
  onRefresh,
  onClose,
}: Props) {
  return (
    <div className="dialog-overlay" onMouseDown={onClose}>
      <div
        className="dialog remote-circuits-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="library-title"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <h2 id="library-title">Minha biblioteca</h2>
        {loading ? (
          <p>Carregando…</p>
        ) : entries.length === 0 ? (
          <p>Nenhum componente salvo na biblioteca.</p>
        ) : (
          <div className="remote-circuit-list">
            {entries.map((entry) => (
              <div className="remote-circuit-row" key={entry.id}>
                <button className="remote-circuit-open" onClick={() => onInsert(entry.id)}>
                  <strong>{entry.name}</strong>
                  <span>Alterado em {new Date(entry.updatedAt).toLocaleString('pt-BR')}</span>
                </button>
                <button onClick={() => onEdit(entry.id)} aria-label={`Editar ${entry.name}`}>
                  Editar
                </button>
                <button
                  className="dialog-danger"
                  onClick={() => onDelete(entry.id)}
                  aria-label={`Excluir ${entry.name}`}
                >
                  Excluir
                </button>
              </div>
            ))}
          </div>
        )}
        <div className="dialog-actions">
          <button onClick={onRefresh}>Atualizar</button>
          <button className="dialog-primary" onClick={onClose}>
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
}
