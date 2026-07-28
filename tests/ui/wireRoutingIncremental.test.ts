import assert from 'node:assert/strict';
import { test } from 'vitest';
import type { CircuitDefinition, LogicComponent, Wire } from '../../src/core/types';
import { createIncrementalWireRouter } from '../../src/ui/editor/wireRouting';

const definitions: CircuitDefinition[] = [];
const wires: Wire[] = [
  {
    id: 'W1',
    from: { componentId: 'A1', pinId: 'out' },
    to: { componentId: 'L1', pinId: 'in' },
  },
  {
    id: 'W2',
    from: { componentId: 'A2', pinId: 'out' },
    to: { componentId: 'L2', pinId: 'in' },
  },
];
const components: LogicComponent[] = [
  { id: 'A1', type: 'input', x: 20, y: 100 },
  { id: 'L1', type: 'led', x: 340, y: 100 },
  { id: 'A2', type: 'input', x: 20, y: 500 },
  { id: 'L2', type: 'led', x: 340, y: 500 },
];

function byId(items: LogicComponent[]) {
  return new Map(items.map((component) => [component.id, component]));
}

test('roteamento incremental preserva fios independentes ao mover um componente', () => {
  const router = createIncrementalWireRouter();
  const initial = router.route(wires, byId(components), components, definitions);
  assert.deepEqual([...initial.recomputedWireIds], ['W1', 'W2']);
  const initialIndependentRoute = initial.routes.find((route) => route.wireId === 'W2');
  assert.ok(initialIndependentRoute);

  const moved = components.map((component) =>
    component.id === 'A1' ? { ...component, x: component.x + 20 } : component,
  );
  const updated = router.route(wires, byId(moved), moved, definitions);

  assert.deepEqual([...updated.recomputedWireIds], ['W1']);
  assert.deepEqual(
    updated.routes.find((route) => route.wireId === 'W2'),
    initialIndependentRoute,
  );
});

test('reset invalida explicitamente todas as rotas', () => {
  const router = createIncrementalWireRouter();
  router.route(wires, byId(components), components, definitions);
  router.reset();

  const rerouted = router.route(wires, byId(components), components, definitions);
  assert.deepEqual([...rerouted.recomputedWireIds], ['W1', 'W2']);
});
