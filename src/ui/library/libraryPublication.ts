import { deriveSubcircuitPins } from '../../core/catalog';
import type { CircuitDefinition } from '../../core/types';

export interface LibraryPublicationAssessment {
  componentCount: number;
  wireCount: number;
  inputCount: number;
  outputCount: number;
  nestedDefinitionNames: string[];
  blockingReasons: string[];
  canPublish: boolean;
}

export function assessLibraryPublication(
  definition: CircuitDefinition,
  definitions: readonly CircuitDefinition[],
): LibraryPublicationAssessment {
  const pins = deriveSubcircuitPins(definition);
  const definitionNames = new Map(definitions.map((candidate) => [candidate.id, candidate.name]));
  const nestedDefinitionNames = Array.from(
    new Set(
      definition.components
        .filter((component) => component.type === 'subcircuit' && component.definitionId)
        .map(
          (component) => definitionNames.get(component.definitionId!) ?? 'subcircuito desconhecido',
        ),
    ),
  );
  const blockingReasons: string[] = [];

  if (definition.components.length === 0) {
    blockingReasons.push('A definição está vazia. Adicione componentes antes de publicar.');
  }
  if (nestedDefinitionNames.length > 0) {
    blockingReasons.push(
      `A biblioteca ainda não aceita subcircuitos aninhados: ${nestedDefinitionNames.join(', ')}.`,
    );
  }

  return {
    componentCount: definition.components.length,
    wireCount: definition.wires.length,
    inputCount: pins.filter((pin) => pin.kind === 'input').length,
    outputCount: pins.filter((pin) => pin.kind === 'output').length,
    nestedDefinitionNames,
    blockingReasons,
    canPublish: blockingReasons.length === 0,
  };
}
