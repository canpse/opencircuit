import { FormEvent, useEffect, useRef, useState } from 'react';

import { useEventCallback } from '../hooks/useEventCallback';
import {
  MAX_PERSISTENCE_NAME_LENGTH,
  normalizedPersistenceName,
  persistenceNameError,
  type PersistenceSaveRequest,
} from './documentPersistence';

interface PersistenceNameDialogProps {
  request: PersistenceSaveRequest;
  onCancel: () => void;
  onConfirm: (name: string) => Promise<boolean>;
}

export function PersistenceNameDialog({
  request,
  onCancel,
  onConfirm,
}: PersistenceNameDialogProps) {
  const [name, setName] = useState(request.initialName);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);
  const submittingRef = useRef(false);
  const cancel = useEventCallback(onCancel);
  const isCopy = request.mode === 'copy';
  const isLibrary = request.destination === 'library';
  const title = isCopy
    ? isLibrary
      ? 'Criar cópia na biblioteca'
      : 'Criar cópia no servidor'
    : 'Salvar no servidor';

  useEffect(() => {
    submittingRef.current = submitting;
  }, [submitting]);

  useEffect(() => {
    previousFocusRef.current =
      document.activeElement instanceof HTMLElement ? document.activeElement : null;
    inputRef.current?.focus();
    inputRef.current?.select();

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Escape' || submittingRef.current) return;
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

  async function submit(event: FormEvent) {
    event.preventDefault();
    const validationError = persistenceNameError(name);
    if (validationError) {
      setError(validationError);
      return;
    }

    setSubmitting(true);
    const succeeded = await onConfirm(normalizedPersistenceName(name));
    if (!succeeded) setSubmitting(false);
  }

  return (
    <div
      className="dialog-overlay"
      role="presentation"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget && !submitting) onCancel();
      }}
    >
      <section
        className="dialog persistence-name-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="persistence-name-dialog-title"
      >
        <form onSubmit={(event) => void submit(event)}>
          <h2 id="persistence-name-dialog-title">{title}</h2>
          <p>
            {isCopy
              ? `A cópia será criada ${
                  isLibrary ? 'na biblioteca' : 'no servidor'
                } e aberta em uma nova aba. A aba original permanecerá intacta.`
              : 'Um circuito será criado no servidor e a aba atual ficará vinculada a ele.'}
          </p>

          <div className="persistence-destination-summary">
            <span>Destino</span>
            <strong>{isLibrary ? 'Minha biblioteca' : 'Meus circuitos no servidor'}</strong>
          </div>

          <label className="dialog-field">
            <span>Nome</span>
            <input
              ref={inputRef}
              value={name}
              maxLength={MAX_PERSISTENCE_NAME_LENGTH}
              disabled={submitting}
              aria-invalid={error ? 'true' : 'false'}
              aria-describedby={error ? 'persistence-name-error' : 'persistence-name-help'}
              onChange={(event) => {
                setName(event.target.value);
                if (error) setError(null);
              }}
            />
          </label>
          <p id="persistence-name-help" className="dialog-hint">
            Use um nome de projeto, sem a extensão .json.
          </p>

          {error ? (
            <p id="persistence-name-error" className="dialog-error" role="alert">
              {error}
            </p>
          ) : null}

          <div className="dialog-actions">
            <button type="button" disabled={submitting} onClick={onCancel}>
              Cancelar
            </button>
            <button type="submit" className="dialog-primary" disabled={submitting}>
              {submitting
                ? 'Salvando…'
                : isCopy
                  ? 'Criar cópia'
                  : request.closeAfterSave
                    ? 'Salvar e fechar'
                    : 'Salvar e vincular aba'}
            </button>
          </div>
        </form>
      </section>
    </div>
  );
}
