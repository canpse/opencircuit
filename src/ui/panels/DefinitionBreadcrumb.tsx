import type { CircuitDefinition } from '../../core/types';

export function DefinitionBreadcrumb({
  navigationPath,
  definitions,
  onNavigate,
}: {
  navigationPath: string[];
  definitions: CircuitDefinition[];
  onNavigate: (index: number) => void;
}) {
  if (navigationPath.length === 0) return null;

  return (
    <div className="history-view-banner definition-breadcrumb">
      <button onClick={() => onNavigate(-1)}>Início</button>
      {navigationPath.map((definitionId, index) => {
        const definition = definitions.find((candidate) => candidate.id === definitionId);
        const label = definition?.name ?? '?';
        const isLast = index === navigationPath.length - 1;
        return (
          // Definições recursivas podem repetir o mesmo ID; a posição distingue cada nível.
          // eslint-disable-next-line @eslint-react/no-array-index-key
          <span className="definition-breadcrumb-segment" key={`${definitionId}-${index}`}>
            <span aria-hidden="true" className="definition-breadcrumb-separator">
              ›
            </span>
            {isLast ? (
              <strong>{label}</strong>
            ) : (
              <button onClick={() => onNavigate(index)}>{label}</button>
            )}
          </span>
        );
      })}
    </div>
  );
}
