import type { CircuitDefinition, CircuitDocument, LogicComponent } from '../../core/types';

export const MAX_DEFINITION_NAME_LENGTH = 80;

export interface DefinitionUsage {
  scopeId: string | null;
  scopeName: string;
  instanceIds: string[];
}

export function normalizedDefinitionName(name: string): string {
  return name.trim();
}

export function definitionNameError(
  name: string,
  definitions: readonly CircuitDefinition[],
  definitionIdToIgnore?: string,
): string | null {
  const normalized = normalizedDefinitionName(name);
  if (!normalized) return 'Informe um nome para o subcircuito.';
  if (normalized.length > MAX_DEFINITION_NAME_LENGTH) {
    return `Use no máximo ${MAX_DEFINITION_NAME_LENGTH} caracteres.`;
  }
  const normalizedKey = normalized.toLocaleLowerCase('pt-BR');
  const duplicate = definitions.some(
    (definition) =>
      definition.id !== definitionIdToIgnore &&
      normalizedDefinitionName(definition.name).toLocaleLowerCase('pt-BR') === normalizedKey,
  );
  return duplicate ? 'Já existe um subcircuito com esse nome.' : null;
}

export function definitionUsages(
  circuit: CircuitDocument,
  definitionId: string,
): DefinitionUsage[] {
  const definitions = circuit.definitions ?? [];
  const scopes: Array<{
    scopeId: string | null;
    scopeName: string;
    components: CircuitDocument['components'];
  }> = [
    { scopeId: null, scopeName: 'Circuito principal', components: circuit.components },
    ...definitions.map((definition) => ({
      scopeId: definition.id,
      scopeName: definition.name,
      components: definition.components,
    })),
  ];

  return scopes.flatMap((scope) => {
    const instanceIds = scope.components
      .filter(
        (component) => component.type === 'subcircuit' && component.definitionId === definitionId,
      )
      .map((component) => component.id);
    return instanceIds.length > 0
      ? [{ scopeId: scope.scopeId, scopeName: scope.scopeName, instanceIds }]
      : [];
  });
}

export function definitionUsageCount(usages: readonly DefinitionUsage[]): number {
  return usages.reduce((total, usage) => total + usage.instanceIds.length, 0);
}

export function definitionUsageCounts(
  rootComponents: readonly LogicComponent[],
  definitions: readonly CircuitDefinition[],
): Map<string, number> {
  const counts = new Map(definitions.map((definition) => [definition.id, 0]));
  const scopes = [rootComponents, ...definitions.map((definition) => definition.components)];
  for (const components of scopes) {
    for (const component of components) {
      if (component.type !== 'subcircuit' || !component.definitionId) continue;
      counts.set(component.definitionId, (counts.get(component.definitionId) ?? 0) + 1);
    }
  }
  return counts;
}

export function renameDefinitionInCircuit(
  circuit: CircuitDocument,
  definitionId: string,
  name: string,
): CircuitDocument {
  const normalized = normalizedDefinitionName(name);
  return {
    ...circuit,
    definitions: (circuit.definitions ?? []).map((definition) =>
      definition.id === definitionId ? { ...definition, name: normalized } : definition,
    ),
  };
}

export function deleteUnusedDefinitionFromCircuit(
  circuit: CircuitDocument,
  definitionId: string,
): CircuitDocument | null {
  if (definitionUsages(circuit, definitionId).length > 0) return null;
  if (!(circuit.definitions ?? []).some((definition) => definition.id === definitionId))
    return null;
  const definitions = (circuit.definitions ?? []).filter(
    (definition) => definition.id !== definitionId,
  );
  return {
    ...circuit,
    definitions: definitions.length > 0 ? definitions : undefined,
  };
}
