import { useEffect, useRef } from 'react';

import type { CircuitDefinition } from '../../core/types';
import { useEventCallback } from '../hooks/useEventCallback';
import type { DefinitionUsage } from './definitionManagement';
import { definitionUsageCount } from './definitionManagement';

interface DeleteDefinitionDialogProps {
  definition: CircuitDefinition;
  usages: DefinitionUsage[];
  onCancel: () => void;
  onConfirm: () => void;
}

export function DeleteDefinitionDialog({
  definition,
  usages,
  onCancel,
  onConfirm,
}: DeleteDefinitionDialogProps) {
  const cancelButtonRef = useRef<HTMLButtonElement>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);
  const cancel = useEventCallback(onCancel);
  const usageCount = definitionUsageCount(usages);
  const isUsed = usageCount > 0;

  useEffect(() => {
    previousFocusRef.current =
      document.activeElement instanceof HTMLElement ? document.activeElement : null;
    cancelButtonRef.current?.focus();

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
        className="dialog delete-definition-dialog"
        role={isUsed ? 'alertdialog' : 'dialog'}
        aria-modal="true"
        aria-labelledby="delete-definition-dialog-title"
      >
        <h2 id="delete-definition-dialog-title">
          {isUsed ? 'Não é possível excluir' : 'Excluir subcircuito?'}
        </h2>

        {isUsed ? (
          <>
            <p>
              <strong>{definition.name}</strong> tem {usageCount}{' '}
              {usageCount === 1 ? 'instância' : 'instâncias'}. Remova as instâncias abaixo antes de
              excluir a definição:
            </p>
            <ul className="definition-usage-list">
              {usages.map((usage) => (
                <li key={usage.scopeId ?? 'root'}>
                  {usage.scopeName}: {usage.instanceIds.length}{' '}
                  {usage.instanceIds.length === 1 ? 'instância' : 'instâncias'}
                </li>
              ))}
            </ul>
            <p className="dialog-hint">
              A exclusão em cascata não é feita para evitar apagar partes do circuito sem intenção.
            </p>
          </>
        ) : (
          <>
            <p>
              A definição <strong>{definition.name}</strong> não é usada por nenhuma instância e
              será removida deste arquivo.
            </p>
            <p className="dialog-hint">Você poderá restaurá-la imediatamente com Desfazer.</p>
          </>
        )}

        <div className="dialog-actions">
          <button ref={cancelButtonRef} type="button" onClick={onCancel}>
            {isUsed ? 'Fechar' : 'Cancelar'}
          </button>
          {!isUsed ? (
            <button type="button" className="dialog-danger" onClick={onConfirm}>
              Excluir definição
            </button>
          ) : null}
        </div>
      </section>
    </div>
  );
}
