import { useEffect, useRef } from 'react';
import { useEventCallback } from '../hooks/useEventCallback';

interface Props {
  documentName: string;
  onSave: () => void;
  onDiscard: () => void;
  onCancel: () => void;
}

export function ConfirmCloseDialog({ documentName, onSave, onDiscard, onCancel }: Props) {
  const cancelButtonRef = useRef<HTMLButtonElement>(null);
  const handleEscape = useEventCallback(onCancel);

  useEffect(() => {
    cancelButtonRef.current?.focus();
  }, []);

  // Captura para que o Escape feche só o diálogo, sem chegar aos atalhos do editor.
  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.key !== 'Escape') return;
      event.stopPropagation();
      handleEscape();
    }
    window.addEventListener('keydown', onKeyDown, true);
    return () => window.removeEventListener('keydown', onKeyDown, true);
  }, [handleEscape]);

  return (
    <div className="dialog-overlay" onMouseDown={onCancel}>
      <div
        className="dialog"
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="confirm-close-title"
        aria-describedby="confirm-close-description"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <h2 id="confirm-close-title">Fechar {documentName}?</h2>
        <p id="confirm-close-description">
          Este arquivo tem mudanças não salvas. Se você fechar sem salvar, elas serão perdidas.
        </p>
        <div className="dialog-actions">
          <button className="dialog-danger" onClick={onDiscard}>
            Descartar
          </button>
          <button ref={cancelButtonRef} onClick={onCancel}>
            Cancelar
          </button>
          <button className="dialog-primary" onClick={onSave}>
            Salvar
          </button>
        </div>
      </div>
    </div>
  );
}
