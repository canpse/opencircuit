import type { CircuitDefinition, LogicComponent } from '../types';
import { isSequentialType } from '../evaluateCircuit';

export function getDefinition(
  definitions: CircuitDefinition[],
  definitionId: string | undefined,
): CircuitDefinition | undefined {
  return definitionId
    ? definitions.find((definition) => definition.id === definitionId)
    : undefined;
}

export function nextDefinitionId(definitions: CircuitDefinition[]): string {
  const ids = new Set(definitions.map((definition) => definition.id));
  let n = definitions.length + 1;
  while (ids.has(`def${n}`)) n += 1;
  return `def${n}`;
}

/**
 * Whether a scope (root document or a definition's own components) contains a
 * sequential component, either directly or inside any subcircuit instance it places,
 * recursively. Mirrors isSequentialType but walks through instances instead of
 * stopping at the flat top-level components list, so Tick/auto-clock stay enabled
 * for a circuit whose only sequential component lives inside a subcircuit instance.
 */
export function circuitOrInstancesHaveSequential(
  components: LogicComponent[],
  definitions: CircuitDefinition[],
  visiting: ReadonlySet<string> = new Set(),
): boolean {
  for (const component of components) {
    if (isSequentialType(component.type)) return true;
    if (
      component.type === 'subcircuit' &&
      component.definitionId &&
      !visiting.has(component.definitionId)
    ) {
      const definition = getDefinition(definitions, component.definitionId);
      if (
        definition &&
        circuitOrInstancesHaveSequential(
          definition.components,
          definitions,
          new Set(visiting).add(component.definitionId),
        )
      ) {
        return true;
      }
    }
  }
  return false;
}
