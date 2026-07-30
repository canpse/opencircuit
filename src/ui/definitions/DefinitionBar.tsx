import { useMemo } from 'react';

import type { CircuitDefinition, CircuitDocument } from '../../core/types';
import type { EditorCommand } from '../commands/editorCommands';
import { definitionUsageCounts } from './definitionManagement';

interface DefinitionBarProps {
  circuit: CircuitDocument;
  definitions: CircuitDefinition[];
  activeDefinitionId: string | null;
  transformCommand: EditorCommand;
  onEnter: (definitionId: string) => void;
  onCreate: () => void;
  onRename: (definitionId: string) => void;
  onDelete: (definitionId: string) => void;
  onSaveToLibrary: (definitionId: string) => void;
}

export function DefinitionBar({
  circuit,
  definitions,
  activeDefinitionId,
  transformCommand,
  onEnter,
  onCreate,
  onRename,
  onDelete,
  onSaveToLibrary,
}: DefinitionBarProps) {
  const usageCounts = useMemo(
    () => definitionUsageCounts(circuit.components, definitions),
    [circuit.components, definitions],
  );
  const activeDefinition = definitions.find((definition) => definition.id === activeDefinitionId);

  return (
    <section className="definition-bar" aria-label="Gerenciar subcircuitos">
      <div className="definition-list" aria-label="Definições do arquivo">
        <strong className="definition-bar-label">Subcircuitos</strong>
        {definitions.length === 0 ? (
          <span className="definition-empty-label">Nenhuma definição</span>
        ) : null}
        {definitions.map((definition) => {
          const usageCount = usageCounts.get(definition.id) ?? 0;
          return (
            <span className="definition-entry" key={definition.id}>
              <button
                type="button"
                className={
                  definition.id === activeDefinitionId
                    ? 'definition-button active'
                    : 'definition-button'
                }
                aria-pressed={definition.id === activeDefinitionId}
                title={`Editar ${definition.name}`}
                onClick={() => onEnter(definition.id)}
              >
                {definition.name}
              </button>
              <span
                className={usageCount === 0 ? 'definition-usage orphan' : 'definition-usage'}
                title={
                  usageCount === 0
                    ? 'Esta definição não é usada no circuito'
                    : `${usageCount} ${
                        usageCount === 1 ? 'instância usa' : 'instâncias usam'
                      } esta definição`
                }
              >
                {usageCount === 0 ? 'sem uso' : usageCount}
              </span>
            </span>
          );
        })}
      </div>

      <div className="definition-actions">
        <button type="button" onClick={onCreate}>
          Nova definição
        </button>
        <button
          type="button"
          disabled={!transformCommand.enabled}
          title={transformCommand.description}
          onClick={() => transformCommand.run()}
        >
          Transformar seleção
        </button>
        {activeDefinition ? (
          <>
            <button type="button" onClick={() => onRename(activeDefinition.id)}>
              Renomear
            </button>
            <button type="button" onClick={() => onDelete(activeDefinition.id)}>
              Excluir
            </button>
            <button type="button" onClick={() => onSaveToLibrary(activeDefinition.id)}>
              Salvar na biblioteca
            </button>
          </>
        ) : null}
      </div>
    </section>
  );
}
