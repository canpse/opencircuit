import { test } from 'vitest';
import assert from 'node:assert/strict';
import {
  collectReferencedDefinitions,
  pasteClipboard,
  type CircuitClipboard,
} from '../../src/ui/app/editorUtils';
import type {
  CircuitDefinition,
  CircuitDocument,
  LogicComponent,
  Wire,
} from '../../src/core/types';

const GRID = 20;
const OFFSET = { x: GRID * 2, y: GRID * 2 };

function component(overrides: Partial<LogicComponent> & { id: string }): LogicComponent {
  return { type: 'and', x: 100, y: 100, ...overrides };
}

function wire(id: string, fromId: string, toId: string): Wire {
  return {
    id,
    from: { componentId: fromId, pinId: 'out' },
    to: { componentId: toId, pinId: 'in1' },
  };
}

function circuitWith(components: LogicComponent[], wires: Wire[] = []): CircuitDocument {
  return { version: 1, components, wires };
}

function definition(
  id: string,
  components: LogicComponent[],
  wires: Wire[] = [],
): CircuitDefinition {
  return { id, name: id, components, wires };
}

test('PasteRemapsComponentIdsAndOffsetsPositions', () => {
  const original = component({ id: 'A1', x: 100, y: 200 });
  const circuit = circuitWith([original]);
  const clipboard: CircuitClipboard = { components: [original], wires: [] };

  const result = pasteClipboard(circuit, clipboard, OFFSET, GRID);

  assert.equal(result.circuit.components.length, 2, 'Colar deve adicionar um novo componente');
  const pasted = result.circuit.components[1];
  assert.notEqual(pasted.id, original.id, 'Componente colado deve receber id novo');
  assert.equal(pasted.x, original.x + OFFSET.x, 'Colado deve deslocar no eixo X');
  assert.equal(pasted.y, original.y + OFFSET.y, 'Colado deve deslocar no eixo Y');
  assert.equal(
    result.circuit.components[0],
    original,
    'Componente original deve permanecer intacto',
  );
});

test('PasteResetsStateAndMemoryOfClones', () => {
  const original = component({ id: 'I1', type: 'input', state: true, memory: { q: true } });
  const circuit = circuitWith([original]);
  const clipboard: CircuitClipboard = { components: [original], wires: [] };

  const result = pasteClipboard(circuit, clipboard, OFFSET, GRID);

  const pasted = result.circuit.components[1];
  assert.equal(pasted.state, false, 'Estado lógico do clone deve ser resetado');
  assert.deepEqual(pasted.memory, {}, 'Memória do clone deve ser limpa');
  assert.equal(original.state, true, 'Estado do original não deve mudar');
});

test('PasteKeepsOnlyWiresWithBothEndpointsInClipboard', () => {
  const a = component({ id: 'A1' });
  const b = component({ id: 'A2', x: 200 });
  const outside = component({ id: 'A3', x: 300 });
  const internal = wire('W1', 'A1', 'A2');
  const dangling = wire('W2', 'A2', 'A3');
  const circuit = circuitWith([a, b, outside], [internal, dangling]);
  const clipboard: CircuitClipboard = { components: [a, b], wires: [internal, dangling] };

  const result = pasteClipboard(circuit, clipboard, OFFSET, GRID);

  assert.equal(result.selection.wireIds.length, 1, 'Só o fio interno ao bloco deve ser colado');
  assert.equal(
    result.circuit.wires.length,
    3,
    'Circuito deve ter os 2 fios originais + 1 fio colado',
  );
});

test('PasteRewiresClonesToNewComponentIds', () => {
  const a = component({ id: 'A1' });
  const b = component({ id: 'A2', x: 200 });
  const internal = wire('W1', 'A1', 'A2');
  const circuit = circuitWith([a, b], [internal]);
  const clipboard: CircuitClipboard = { components: [a, b], wires: [internal] };

  const result = pasteClipboard(circuit, clipboard, OFFSET, GRID);

  const pastedWire = result.circuit.wires[1];
  const [newAId, newBId] = result.selection.componentIds;
  assert.equal(pastedWire.from.componentId, newAId, 'Origem do fio deve apontar para o clone');
  assert.equal(pastedWire.to.componentId, newBId, 'Destino do fio deve apontar para o clone');
  assert.equal(pastedWire.from.pinId, 'out', 'Pino de origem deve ser preservado');
  assert.equal(pastedWire.to.pinId, 'in1', 'Pino de destino deve ser preservado');
});

test('PastePreservesTunnelMetadata', () => {
  const a = component({ id: 'A1' });
  const b = component({ id: 'A2', x: 200 });
  const tunnel: Wire = { ...wire('W1', 'A1', 'A2'), display: 'tunnel', label: 'CLK' };
  const circuit = circuitWith([a, b], [tunnel]);

  const result = pasteClipboard(circuit, { components: [a, b], wires: [tunnel] }, OFFSET, GRID);

  assert.equal(result.circuit.wires[1].display, 'tunnel');
  assert.equal(result.circuit.wires[1].label, 'CLK');
});

test('PasteOffsetsAndClonesWaypoints', () => {
  const a = component({ id: 'A1' });
  const b = component({ id: 'A2', x: 200 });
  const guided: Wire = { ...wire('W1', 'A1', 'A2'), waypoints: [{ x: 140, y: 160 }] };
  const circuit = circuitWith([a, b], [guided]);

  const result = pasteClipboard(circuit, { components: [a, b], wires: [guided] }, OFFSET, GRID);
  const pasted = result.circuit.wires[1];

  assert.deepEqual(pasted.waypoints, [{ x: 140 + OFFSET.x, y: 160 + OFFSET.y }]);
  assert.notEqual(pasted.waypoints, guided.waypoints, 'A lista de guias deve ser clonada');
  assert.notEqual(pasted.waypoints?.[0], guided.waypoints?.[0], 'Cada guia deve ser clonada');
});

test('PasteGeneratesWireIdsUniqueAgainstExistingOnes', () => {
  const a = component({ id: 'A1' });
  const b = component({ id: 'A2', x: 200 });
  const internal = wire('W1', 'A1', 'A2');
  // Fio existente com o id que a colagem tentaria gerar primeiro (W{timestamp}_0).
  const colliding = wire(`W${Date.now()}_0`, 'A1', 'A2');
  const circuit = circuitWith([a, b], [internal, colliding]);
  const clipboard: CircuitClipboard = { components: [a, b], wires: [internal] };

  const result = pasteClipboard(circuit, clipboard, OFFSET, GRID);

  const ids = result.circuit.wires.map((candidate) => candidate.id);
  assert.equal(new Set(ids).size, ids.length, 'Todos os ids de fio devem ser únicos');
});

test('PasteSelectionPointsToPastedItemsInCommittedCircuit', () => {
  const a = component({ id: 'A1' });
  const b = component({ id: 'A2', x: 200 });
  const internal = wire('W1', 'A1', 'A2');
  const circuit = circuitWith([a, b], [internal]);
  const clipboard: CircuitClipboard = { components: [a, b], wires: [internal] };

  const result = pasteClipboard(circuit, clipboard, OFFSET, GRID);

  const componentIds = new Set(result.circuit.components.map((candidate) => candidate.id));
  const wireIds = new Set(result.circuit.wires.map((candidate) => candidate.id));
  for (const id of result.selection.componentIds) {
    assert.ok(componentIds.has(id), `Seleção aponta para componente inexistente: ${id}`);
  }
  for (const id of result.selection.wireIds) {
    assert.ok(wireIds.has(id), `Seleção aponta para fio inexistente: ${id}`);
  }
  assert.equal(result.selection.componentIds.length, 2);
  assert.equal(result.selection.wireIds.length, 1);
});

// Regressão: copiar uma seleção com uma instância de subcircuito e colar num documento
// que não tem a definição referenciada (outra aba/projeto) deixava a instância colada
// apontando pra um definitionId inexistente -- ela renderizava como um "Subcircuito"
// sem pinos, que não faz nada (COMPONENT_DEFINITIONS.subcircuit, o fallback estático).

test('collectReferencedDefinitions segue referências transitivas através de instâncias aninhadas', () => {
  const inner = definition('inner-def', [component({ id: 'G1' })]);
  const outer = definition('outer-def', [
    component({ id: 'SUB', type: 'subcircuit', definitionId: 'inner-def' }),
  ]);
  const unrelated = definition('unrelated-def', [component({ id: 'G2' })]);
  const u1 = component({ id: 'U1', type: 'subcircuit', definitionId: 'outer-def' });

  const result = collectReferencedDefinitions([u1], [inner, outer, unrelated]);

  assert.deepEqual(
    result.map((d) => d.id).sort(),
    ['inner-def', 'outer-def'],
    'deve trazer outer-def e, transitivamente, inner-def (referenciada de dentro dele) -- mas não unrelated-def',
  );
});

test('collectReferencedDefinitions tolera referência solta e não entra em loop com ciclo', () => {
  const dangling = component({ id: 'U1', type: 'subcircuit', definitionId: 'nao-existe' });
  assert.deepEqual(collectReferencedDefinitions([dangling], []), []);

  const a = definition('a', [component({ id: 'B1', type: 'subcircuit', definitionId: 'b' })]);
  const b = definition('b', [component({ id: 'A1', type: 'subcircuit', definitionId: 'a' })]);
  const u1 = component({ id: 'U1', type: 'subcircuit', definitionId: 'a' });
  const result = collectReferencedDefinitions([u1], [a, b]);
  assert.deepEqual(result.map((d) => d.id).sort(), ['a', 'b']);
});

test('PasteWithinSameDocumentReusesExistingDefinitionWithoutDuplicating', () => {
  const def = definition('half-adder-def', [component({ id: 'G1' })]);
  const u1 = component({ id: 'U1', type: 'subcircuit', definitionId: 'half-adder-def' });
  const circuit = circuitWith([u1]);
  const clipboard: CircuitClipboard = {
    components: [u1],
    wires: [],
    definitions: [def],
  };

  const result = pasteClipboard(circuit, clipboard, OFFSET, GRID, [def]);

  assert.equal(result.definitions.length, 0, 'não deve duplicar uma definição já presente no alvo');
  const pastedInstance = result.circuit.components[1];
  assert.equal(
    pastedInstance.definitionId,
    'half-adder-def',
    'a instância colada deve continuar referenciando a mesma definição (compartilhada, não copiada)',
  );
});

test('PasteBringsSubcircuitDefinitionIntoDocumentThatDoesNotHaveIt', () => {
  const def = definition('half-adder-def', [component({ id: 'G1' })]);
  const u1 = component({ id: 'U1', type: 'subcircuit', definitionId: 'half-adder-def' });
  const circuit = circuitWith([]); // documento-alvo "diferente", sem essa definição
  const clipboard: CircuitClipboard = { components: [u1], wires: [], definitions: [def] };

  const result = pasteClipboard(circuit, clipboard, OFFSET, GRID, []);

  assert.equal(result.definitions.length, 1, 'a definição referenciada deve ser trazida junto');
  assert.equal(
    result.definitions[0].id,
    'half-adder-def',
    'mantém o id original (não existia conflito)',
  );
  const pastedInstance = result.circuit.components[0];
  assert.equal(
    pastedInstance.definitionId,
    'half-adder-def',
    'a instância colada deve apontar pra definição recém-trazida',
  );
});

test('PasteRemapsDefinitionIdOnCollisionWithUnrelatedDefinition', () => {
  const sourceDef = definition('def1', [component({ id: 'G1' })]);
  const u1 = component({ id: 'U1', type: 'subcircuit', definitionId: 'def1' });
  const unrelatedTargetDef = definition('def1', [component({ id: 'X1', type: 'or' })]);
  const circuit = circuitWith([]);
  const clipboard: CircuitClipboard = { components: [u1], wires: [], definitions: [sourceDef] };

  const result = pasteClipboard(circuit, clipboard, OFFSET, GRID, [unrelatedTargetDef]);

  assert.equal(
    result.definitions.length,
    1,
    'deve trazer uma cópia com id novo, sem sobrescrever a existente',
  );
  const newDef = result.definitions[0];
  assert.notEqual(
    newDef.id,
    'def1',
    'id colidia com uma definição não relacionada, então precisa mudar',
  );
  const pastedInstance = result.circuit.components[0];
  assert.equal(
    pastedInstance.definitionId,
    newDef.id,
    'a instância colada deve apontar pro id remapeado, não pro original',
  );
});

test('PasteBringsNestedDefinitionsAndRemapsInternalReferencesTogether', () => {
  const inner = definition('inner-def', [component({ id: 'G1' })]);
  const outer = definition('outer-def', [
    component({ id: 'SUB', type: 'subcircuit', definitionId: 'inner-def' }),
  ]);
  const u1 = component({ id: 'U1', type: 'subcircuit', definitionId: 'outer-def' });
  // O alvo já tem uma definição SEM relação nenhuma, mas com o mesmo id que 'inner-def'
  // usaria -- força o remapeamento em cascata (outer precisa apontar pro inner remapeado).
  const unrelatedCollision = definition('inner-def', [component({ id: 'X1', type: 'or' })]);
  const circuit = circuitWith([]);
  const clipboard: CircuitClipboard = {
    components: [u1],
    wires: [],
    definitions: [inner, outer],
  };

  const result = pasteClipboard(circuit, clipboard, OFFSET, GRID, [unrelatedCollision]);

  assert.equal(result.definitions.length, 2);
  const newOuter = result.definitions.find((d) => d.components.some((c) => c.id === 'SUB'));
  const newInner = result.definitions.find((d) => d.id !== newOuter?.id);
  assert.ok(newOuter && newInner, 'as duas definições devem ter sido trazidas');
  assert.notEqual(newInner!.id, 'inner-def', 'colidia com a definição não relacionada do alvo');
  const subInstance = newOuter!.components.find((c) => c.id === 'SUB')!;
  assert.equal(
    subInstance.definitionId,
    newInner!.id,
    'a referência interna de outer-def pra inner-def deve acompanhar o remapeamento',
  );
  const pastedU1 = result.circuit.components[0];
  assert.equal(pastedU1.definitionId, newOuter!.id);
});

test('PasteResetsInstanceMemoryOfPastedSubcircuitInstance', () => {
  const def = definition('def1', [component({ id: 'G1' })]);
  const u1 = component({
    id: 'U1',
    type: 'subcircuit',
    definitionId: 'def1',
    instanceMemory: { G1: { q: true } },
  });
  const circuit = circuitWith([u1]);
  const clipboard: CircuitClipboard = { components: [u1], wires: [], definitions: [def] };

  const result = pasteClipboard(circuit, clipboard, OFFSET, GRID, [def]);

  const pasted = result.circuit.components[1];
  assert.deepEqual(pasted.instanceMemory, {}, 'memória de instância do clone deve ser limpa');
  assert.deepEqual(u1.instanceMemory, { G1: { q: true } }, 'original não deve ser afetado');
});
