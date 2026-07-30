import { FormEvent, useEffect, useRef, useState } from 'react';

import type { CircuitDefinition } from '../../core/types';
import { useEventCallback } from '../hooks/useEventCallback';
import {
  MAX_PERSISTENCE_NAME_LENGTH,
  normalizedPersistenceName,
  persistenceNameError,
} from '../persistence/documentPersistence';
import { assessLibraryPublication, type LibraryPublicationAssessment } from './libraryPublication';

interface PublishLibraryDefinitionDialogProps {
  definition: CircuitDefinition;
  definitions: readonly CircuitDefinition[];
  onCancel: () => void;
  onConfirm: (name: string) => Promise<boolean>;
}

export function PublishLibraryDefinitionDialog({
  definition,
  definitions,
  onCancel,
  onConfirm,
}: PublishLibraryDefinitionDialogProps) {
  const [name, setName] = useState(definition.name);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);
  const submittingRef = useRef(false);
  const cancel = useEventCallback(onCancel);
  const assessment = assessLibraryPublication(definition, definitions);

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
    if (!assessment.canPublish) return;

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
        className="dialog publish-library-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="publish-library-title"
      >
        <form onSubmit={(event) => void submit(event)}>
          <h2 id="publish-library-title">Publicar na biblioteca</h2>
          <p>
            Será criado um componente reutilizável independente. Alterações futuras nesta definição
            não atualizarão a publicação automaticamente.
          </p>

          <div className="persistence-destination-summary library-destination-summary">
            <span>Destino</span>
            <strong>Minha biblioteca</strong>
          </div>

          <PublicationSummary assessment={assessment} />

          <label className="dialog-field">
            <span>Nome do componente</span>
            <input
              ref={inputRef}
              value={name}
              maxLength={MAX_PERSISTENCE_NAME_LENGTH}
              disabled={submitting}
              aria-invalid={error ? 'true' : 'false'}
              aria-describedby={error ? 'publish-library-name-error' : undefined}
              onChange={(event) => {
                setName(event.target.value);
                if (error) setError(null);
              }}
            />
          </label>

          {error ? (
            <p id="publish-library-name-error" className="dialog-error" role="alert">
              {error}
            </p>
          ) : null}

          {assessment.blockingReasons.length > 0 ? (
            <div className="library-publication-blockers" role="alert">
              <strong>Publicação indisponível</strong>
              <ul>
                {assessment.blockingReasons.map((reason) => (
                  <li key={reason}>{reason}</li>
                ))}
              </ul>
            </div>
          ) : null}

          <div className="dialog-actions">
            <button type="button" disabled={submitting} onClick={onCancel}>
              Cancelar
            </button>
            <button
              type="submit"
              className="dialog-primary"
              disabled={submitting || !assessment.canPublish}
            >
              {submitting ? 'Publicando…' : 'Publicar componente'}
            </button>
          </div>
        </form>
      </section>
    </div>
  );
}

function PublicationSummary({ assessment }: { assessment: LibraryPublicationAssessment }) {
  return (
    <dl className="library-publication-summary" role="group" aria-label="Resumo do componente">
      <div>
        <dt>Componentes</dt>
        <dd>{assessment.componentCount}</dd>
      </div>
      <div>
        <dt>Fios</dt>
        <dd>{assessment.wireCount}</dd>
      </div>
      <div>
        <dt>Entradas</dt>
        <dd>{assessment.inputCount}</dd>
      </div>
      <div>
        <dt>Saídas</dt>
        <dd>{assessment.outputCount}</dd>
      </div>
    </dl>
  );
}
