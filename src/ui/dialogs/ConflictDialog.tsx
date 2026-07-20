interface Props {
  documentName: string;
  onReload: () => void;
  onSaveCopy: () => void;
  onClose: () => void;
}

export function ConflictDialog({ documentName, onReload, onSaveCopy, onClose }: Props) {
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
        <p>Outra aba salvou uma versão mais nova. Suas alterações locais continuam no rascunho.</p>
        <div className="dialog-actions">
          <button onClick={onClose}>Agora não</button>
          <button onClick={onSaveCopy}>Salvar uma cópia</button>
          <button className="dialog-primary" onClick={onReload}>
            Recarregar versão remota
          </button>
        </div>
      </div>
    </div>
  );
}
