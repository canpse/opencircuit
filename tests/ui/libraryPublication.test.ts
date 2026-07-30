import { describe, expect, it } from 'vitest';
import type { CircuitDefinition } from '../../src/core/types';
import { assessLibraryPublication } from '../../src/ui/library/libraryPublication';

const validDefinition: CircuitDefinition = {
  id: 'valid',
  name: 'Indicador',
  components: [
    { id: 'A', type: 'input', x: 0, y: 0 },
    { id: 'OUT', type: 'led', x: 200, y: 0 },
  ],
  wires: [
    {
      id: 'W1',
      from: { componentId: 'A', pinId: 'out' },
      to: { componentId: 'OUT', pinId: 'in' },
    },
  ],
};

describe('avaliação de publicação na biblioteca', () => {
  it('resume componentes, fios e pinos externos', () => {
    expect(assessLibraryPublication(validDefinition, [validDefinition])).toEqual({
      componentCount: 2,
      wireCount: 1,
      inputCount: 1,
      outputCount: 1,
      nestedDefinitionNames: [],
      blockingReasons: [],
      canPublish: true,
    });
  });

  it('bloqueia definição vazia', () => {
    const empty: CircuitDefinition = {
      id: 'empty',
      name: 'Vazia',
      components: [],
      wires: [],
    };

    const assessment = assessLibraryPublication(empty, [empty]);
    expect(assessment.canPublish).toBe(false);
    expect(assessment.blockingReasons[0]).toContain('está vazia');
  });

  it('bloqueia aninhamento e identifica a dependência pelo nome', () => {
    const outer: CircuitDefinition = {
      id: 'outer',
      name: 'Externa',
      components: [
        {
          id: 'U1',
          type: 'subcircuit',
          definitionId: validDefinition.id,
          x: 0,
          y: 0,
        },
      ],
      wires: [],
    };

    const assessment = assessLibraryPublication(outer, [outer, validDefinition]);
    expect(assessment.canPublish).toBe(false);
    expect(assessment.nestedDefinitionNames).toEqual(['Indicador']);
    expect(assessment.blockingReasons[0]).toContain('Indicador');
  });
});
