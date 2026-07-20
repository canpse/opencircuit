import type { StoredCircuitSummary } from '../../state/circuitApi';

interface Props {
  circuits: StoredCircuitSummary[];
  loading: boolean;
  onOpen: (id: string) => void;
  onDelete: (id: string) => void;
  onRefresh: () => void;
  onClose: () => void;
}

export function RemoteCircuitsDialog({
  circuits,
  loading,
  onOpen,
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
        aria-labelledby="remote-circuits-title"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <h2 id="remote-circuits-title">Meus circuitos</h2>
        {loading ? (
          <p>Carregando…</p>
        ) : circuits.length === 0 ? (
          <p>Nenhum circuito salvo no servidor.</p>
        ) : (
          <div className="remote-circuit-list">
            {circuits.map((circuit) => (
              <div className="remote-circuit-row" key={circuit.id}>
                <button className="remote-circuit-open" onClick={() => onOpen(circuit.id)}>
                  <strong>{circuit.name}</strong>
                  <span>Alterado em {new Date(circuit.updatedAt).toLocaleString('pt-BR')}</span>
                </button>
                <button
                  className="dialog-danger"
                  onClick={() => onDelete(circuit.id)}
                  aria-label={`Excluir ${circuit.name}`}
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
