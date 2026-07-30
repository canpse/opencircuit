import { describe, expect, it } from 'vitest';

import type { CircuitDefinition, CircuitDocument, LogicComponent } from '../../src/core/types';
import {
  definitionNameError,
  definitionUsageCount,
  definitionUsageCounts,
  definitionUsages,
  deleteUnusedDefinitionFromCircuit,
  renameDefinitionInCircuit,
} from '../../src/ui/definitions/definitionManagement';

function definition(
  id: string,
  name: string,
  components: LogicComponent[] = [],
): CircuitDefinition {
  return { id, name, components, wires: [] };
}

function instance(id: string, definitionId: string): LogicComponent {
  return { id, type: 'subcircuit', definitionId, x: 0, y: 0 };
}

describe('definition management', () => {
  const definitions = [definition('alpha', 'Somador'), definition('beta', 'Registrador')];

  it('requires a trimmed, bounded and case-insensitively unique name', () => {
    expect(definitionNameError('   ', definitions)).toBe('Informe um nome para o subcircuito.');
    expect(definitionNameError('sOmAdOr', definitions)).toBe(
      'Já existe um subcircuito com esse nome.',
    );
    expect(definitionNameError('x'.repeat(81), definitions)).toBe('Use no máximo 80 caracteres.');
    expect(definitionNameError(' Somador ', definitions, 'alpha')).toBeNull();
    expect(definitionNameError('Decodificador', definitions)).toBeNull();
  });

  it('reports every direct usage grouped by root and definition scope', () => {
    const circuit: CircuitDocument = {
      version: 1,
      components: [instance('root-a', 'target'), instance('root-b', 'target')],
      wires: [],
      definitions: [
        definition('target', 'Alvo'),
        definition('consumer', 'Consumidor', [
          instance('nested', 'target'),
          instance('other', 'unrelated'),
        ]),
      ],
    };

    const usages = definitionUsages(circuit, 'target');

    expect(usages).toEqual([
      {
        scopeId: null,
        scopeName: 'Circuito principal',
        instanceIds: ['root-a', 'root-b'],
      },
      {
        scopeId: 'consumer',
        scopeName: 'Consumidor',
        instanceIds: ['nested'],
      },
    ]);
    expect(definitionUsageCount(usages)).toBe(3);
    expect(definitionUsageCounts(circuit.components, circuit.definitions ?? [])).toEqual(
      new Map([
        ['target', 3],
        ['consumer', 0],
        ['unrelated', 1],
      ]),
    );
  });

  it('renames only the definition while preserving its identity and instances', () => {
    const circuit: CircuitDocument = {
      version: 1,
      components: [instance('use', 'alpha')],
      wires: [],
      definitions,
    };

    const renamed = renameDefinitionInCircuit(circuit, 'alpha', '  Somador completo  ');

    expect(renamed.definitions?.find((item) => item.id === 'alpha')?.name).toBe('Somador completo');
    expect(renamed.components[0].definitionId).toBe('alpha');
    expect(circuit.definitions?.[0].name).toBe('Somador');
  });

  it('blocks deletion while the definition is used and removes only an orphan', () => {
    const usedCircuit: CircuitDocument = {
      version: 1,
      components: [instance('use', 'alpha')],
      wires: [],
      definitions,
    };
    expect(deleteUnusedDefinitionFromCircuit(usedCircuit, 'alpha')).toBeNull();

    const withoutOrphan = deleteUnusedDefinitionFromCircuit(usedCircuit, 'beta');
    expect(withoutOrphan?.definitions?.map((item) => item.id)).toEqual(['alpha']);
    expect(withoutOrphan?.components).toEqual(usedCircuit.components);
  });
});
