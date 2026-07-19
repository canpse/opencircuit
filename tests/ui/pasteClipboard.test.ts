import { test } from 'vitest';
import assert from 'node:assert/strict';
import { pasteClipboard, type CircuitClipboard } from '../../src/ui/app/editorUtils';
import type { CircuitDocument, LogicComponent, Wire } from '../../src/core/types';

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
