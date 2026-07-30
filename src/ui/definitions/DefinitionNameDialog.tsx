import { FormEvent, useEffect, useRef, useState } from 'react';

import type { CircuitDefinition } from '../../core/types';
import { useEventCallback } from '../hooks/useEventCallback';
import { definitionNameError, normalizedDefinitionName } from './definitionManagement';

export type DefinitionNameDialogMode = 'create' | 'transform' | 'rename';

interface DefinitionNameDialogProps {
  mode: DefinitionNameDialogMode;
  definitions: CircuitDefinition[];
  definitionId?: string;
  initialName?: string;
  selectedComponentCount?: number;
  onCancel: () => void;
  onConfirm: (name: string) => boolean;
}

const COPY: Record<DefinitionNameDialogMode, { title: string; confirmLabel: string }> = {
  create: {
    title: 'Nova definição de subcircuito',
    confirmLabel: 'Criar e editar',
  },
  transform: {
    title: 'Transformar seleção em subcircuito',
    confirmLabel: 'Transformar',
  },
  rename: {
    title: 'Renomear subcircuito',
    confirmLabel: 'Renomear',
  },
};

export function DefinitionNameDialog({
  mode,
  definitions,
  definitionId,
  initialName = '',
  selectedComponentCount = 0,
  onCancel,
  onConfirm,
}: DefinitionNameDialogProps) {
  const [name, setName] = useState(initialName);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);
  const cancel = useEventCallback(onCancel);
  const copy = COPY[mode];

  useEffect(() => {
    previousFocusRef.current =
      document.activeElement instanceof HTMLElement ? document.activeElement : null;
    inputRef.current?.focus();
    inputRef.current?.select();

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') {
        return;
      }
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

  const submit = (event: FormEvent) => {
    event.preventDefault();
    const validationError = definitionNameError(
      name,
      definitions,
      mode === 'rename' ? definitionId : undefined,
    );
    if (validationError) {
      setError(validationError);
      return;
    }

    onConfirm(normalizedDefinitionName(name));
  };

  return (
    <div
      className="dialog-overlay"
      role="presentation"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) {
          onCancel();
        }
      }}
    >
      <section
        className="dialog definition-name-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="definition-name-dialog-title"
      >
        <form onSubmit={submit}>
          <h2 id="definition-name-dialog-title">{copy.title}</h2>

          {mode === 'create' ? (
            <p>
              A definição será criada vazia e aberta para edição. Use componentes de entrada e saída
              para criar seus pinos externos.
            </p>
          ) : null}

          {mode === 'transform' ? (
            <>
              <p>
                {selectedComponentCount}{' '}
                {selectedComponentCount === 1
                  ? 'componente selecionado será'
                  : 'componentes selecionados serão'}{' '}
                substituído{selectedComponentCount === 1 ? '' : 's'} por uma instância no escopo
                atual.
              </p>
              <p className="dialog-hint">
                As conexões internas são preservadas. Conexões que cruzam a seleção viram pinos do
                novo subcircuito.
              </p>
            </>
          ) : null}

          {mode === 'rename' ? (
            <p>
              Todas as instâncias continuam apontando para esta definição e exibem o novo nome
              automaticamente, exceto quando têm um rótulo próprio.
            </p>
          ) : null}

          <label className="dialog-field">
            <span>Nome</span>
            <input
              ref={inputRef}
              value={name}
              maxLength={80}
              aria-invalid={error ? 'true' : 'false'}
              aria-describedby={error ? 'definition-name-error' : undefined}
              onChange={(event) => {
                setName(event.target.value);
                if (error) {
                  setError(null);
                }
              }}
            />
          </label>

          {error ? (
            <p id="definition-name-error" className="dialog-error" role="alert">
              {error}
            </p>
          ) : null}

          <div className="dialog-actions">
            <button type="button" onClick={onCancel}>
              Cancelar
            </button>
            <button type="submit" className="dialog-primary">
              {copy.confirmLabel}
            </button>
          </div>
        </form>
      </section>
    </div>
  );
}
