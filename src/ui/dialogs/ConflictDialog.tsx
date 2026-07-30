interface Props {
  documentName: string;
  destination: 'remote' | 'library';
  onReload: () => void;
  onSaveCopy: () => void;
  onClose: () => void;
}

export function ConflictDialog({
  documentName,
  destination,
  onReload,
  onSaveCopy,
  onClose,
}: Props) {
  const isLibrary = destination === 'library';
  return (
    <div className="dialog-overlay" onMouseDown={onClose}>
      <div
        className="dialog"
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="conflict-title"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <h2 id="conflict-title">Conflito em {documentName}</h2>
        <p>
          Existe uma versão mais nova {isLibrary ? 'na biblioteca' : 'no servidor'}. Suas alterações
          continuam protegidas localmente.
        </p>
        <div className="dialog-actions">
          <button onClick={onClose}>Agora não</button>
          <button onClick={onSaveCopy}>Criar cópia…</button>
          <button className="dialog-primary" onClick={onReload}>
            {isLibrary ? 'Recarregar da biblioteca' : 'Recarregar do servidor'}
          </button>
        </div>
      </div>
    </div>
  );
}
