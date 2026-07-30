import type { CircuitDefinition } from '../../core/types';

interface EmptyDefinitionGuideProps {
  definition: CircuitDefinition;
  onReturnToRoot: () => void;
}

export function EmptyDefinitionGuide({ definition, onReturnToRoot }: EmptyDefinitionGuideProps) {
  return (
    <aside className="empty-definition-guide" aria-label="Como criar o subcircuito">
      <strong>{definition.name} está vazio.</strong>
      <span>
        Input, Clock e Bus In 4 criam entradas externas. LED e Display 4 criam saídas externas. Tudo
        que você adicionar aqui será compartilhado por todas as instâncias.
      </span>
      <button type="button" onClick={onReturnToRoot}>
        Voltar ao circuito principal
      </button>
      <span className="empty-definition-place-hint">
        Depois, insira uma instância em Biblioteca → Subcircuitos.
      </span>
    </aside>
  );
}
