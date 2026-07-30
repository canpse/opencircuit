import { useEffect, useRef } from 'react';

import type { StoredLibraryComponentSummary } from '../../state/libraryApi';
import { useEventCallback } from '../hooks/useEventCallback';

interface DeleteLibraryEntryDialogProps {
  entry: StoredLibraryComponentSummary;
  linkedDocumentCount: number;
  deleting: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}

export function DeleteLibraryEntryDialog({
  entry,
  linkedDocumentCount,
  deleting,
  onCancel,
  onConfirm,
}: DeleteLibraryEntryDialogProps) {
  const cancelButtonRef = useRef<HTMLButtonElement>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);
  const deletingRef = useRef(deleting);
  const cancel = useEventCallback(onCancel);

  useEffect(() => {
    deletingRef.current = deleting;
  }, [deleting]);

  useEffect(() => {
    previousFocusRef.current =
      document.activeElement instanceof HTMLElement ? document.activeElement : null;
    cancelButtonRef.current?.focus();

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Escape' || deletingRef.current) return;
      event.preventDefault();
      event.stopPropagation();
      cancel();
    };
    window.addEventListener('keydown', onKeyDown, true);
    return () => {
      window.removeEventListener('keydown', onKeyDown, true);
      previousFocusRef.current?.focus();
    };
  }, [cancel]);

  return (
    <div className="dialog-overlay" role="presentation">
      <section
        className="dialog delete-library-entry-dialog"
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="delete-library-entry-title"
      >
        <h2 id="delete-library-entry-title">Excluir componente da biblioteca?</h2>
        <p>
          <strong>{entry.name}</strong> será removido de Minha biblioteca.
        </p>
        <p>Cópias já inseridas em circuitos são independentes e continuarão funcionando.</p>
        {linkedDocumentCount > 0 ? (
          <p className="dialog-hint">
            {linkedDocumentCount === 1
              ? 'A aba que edita este componente'
              : `${linkedDocumentCount} abas que editam este componente`}{' '}
            será preservada como rascunho local.
          </p>
        ) : null}
        <div className="dialog-actions">
          <button ref={cancelButtonRef} type="button" disabled={deleting} onClick={onCancel}>
            Cancelar
          </button>
          <button type="button" className="dialog-danger" disabled={deleting} onClick={onConfirm}>
            {deleting ? 'Excluindo…' : 'Excluir da biblioteca'}
          </button>
        </div>
      </section>
    </div>
  );
}
