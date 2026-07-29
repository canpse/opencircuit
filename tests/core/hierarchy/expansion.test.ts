import assert from 'node:assert/strict';
import { test } from 'vitest';
import {
  assertHierarchyExpansionAllowed,
  HierarchyExpansionError,
  inspectCircuitHierarchy,
  inspectHierarchyExpansion,
  type HierarchyExpansionLimits,
} from '../../../src/core/hierarchy/expansion.mjs';
import { flattenCircuit } from '../../../src/core/hierarchy/flatten';
import type { CircuitDefinition, CircuitDocument, LogicComponent } from '../../../src/core/types';

function permissiveLimits(
  overrides: Partial<HierarchyExpansionLimits> = {},
): HierarchyExpansionLimits {
  return {
    maxDepth: 1_000_000,
    maxComponents: 1_000_000,
    maxWires: 1_000_000,
    maxInstances: 1_000_000,
    maxPathLength: 1_000_000,
    maxIdCharacters: 1_000_000,
    maxWork: 1_000_000,
    ...overrides,
  };
}

function leaf(id: string): LogicComponent {
  return { id, type: 'not', x: 0, y: 0 };
}

test('preflight statistics match the materialized flat graph', () => {
  const definition: CircuitDefinition = {
    id: 'fanout',
    name: 'Fanout',
    components: [
      { id: 'IN', type: 'input', x: 0, y: 0 },
      { id: 'N1', type: 'not', x: 100, y: 0 },
      { id: 'N2', type: 'not', x: 100, y: 60 },
      { id: 'OUT', type: 'led', x: 220, y: 0 },
    ],
    wires: [
      {
        id: 'd1',
        from: { componentId: 'IN', pinId: 'out' },
        to: { componentId: 'N1', pinId: 'in' },
      },
      {
        id: 'd2',
        from: { componentId: 'IN', pinId: 'out' },
        to: { componentId: 'N2', pinId: 'in' },
      },
      {
        id: 'd3',
        from: { componentId: 'N1', pinId: 'out' },
        to: { componentId: 'OUT', pinId: 'in' },
      },
    ],
  };
  const document: CircuitDocument = {
    version: 1,
    components: [
      { id: 'SOURCE', type: 'input', x: 0, y: 0 },
      { id: 'U1', type: 'subcircuit', x: 100, y: 0, definitionId: definition.id },
      { id: 'LED', type: 'led', x: 300, y: 0 },
    ],
    wires: [
      {
        id: 'w1',
        from: { componentId: 'SOURCE', pinId: 'out' },
        to: { componentId: 'U1', pinId: 'IN' },
      },
      {
        id: 'w2',
        from: { componentId: 'U1', pinId: 'OUT' },
        to: { componentId: 'LED', pinId: 'in' },
      },
    ],
  };

  const result = inspectHierarchyExpansion(document, [definition]);
  assert.equal(result.ok, true);
  const flattened = flattenCircuit(document, [definition]);
  assert.equal(result.stats.components, flattened.flat.components.length);
  assert.equal(result.stats.wires, flattened.flat.wires.length);
  assert.equal(result.stats.instances, flattened.nodes.length);
});

test('direct scalar and bus boundary aliases are counted as real flattened wires', () => {
  const scalar: CircuitDefinition = {
    id: 'scalar',
    name: 'Scalar',
    components: [
      { id: 'IN', type: 'input', x: 0, y: 0 },
      { id: 'OUT', type: 'led', x: 100, y: 0 },
    ],
    wires: [
      {
        id: 'w',
        from: { componentId: 'IN', pinId: 'out' },
        to: { componentId: 'OUT', pinId: 'in' },
      },
    ],
  };
  const bus: CircuitDefinition = {
    id: 'bus',
    name: 'Bus',
    components: [
      { id: 'IN', type: 'bus-in-4', x: 0, y: 0 },
      { id: 'OUT', type: 'display-4', x: 100, y: 0 },
    ],
    wires: [
      {
        id: 'w',
        from: { componentId: 'IN', pinId: 'OUT' },
        to: { componentId: 'OUT', pinId: 'IN' },
      },
    ],
  };
  const document: CircuitDocument = {
    version: 1,
    components: [
      { id: 'A', type: 'input', x: 0, y: 0 },
      { id: 'U1', type: 'subcircuit', x: 100, y: 0, definitionId: scalar.id },
      { id: 'L', type: 'led', x: 200, y: 0 },
      { id: 'B', type: 'bus-in-4', x: 0, y: 100 },
      { id: 'U2', type: 'subcircuit', x: 100, y: 100, definitionId: bus.id },
      { id: 'D', type: 'display-4', x: 200, y: 100 },
    ],
    wires: [
      {
        id: 'w1',
        from: { componentId: 'A', pinId: 'out' },
        to: { componentId: 'U1', pinId: 'IN' },
      },
      {
        id: 'w2',
        from: { componentId: 'U1', pinId: 'OUT' },
        to: { componentId: 'L', pinId: 'in' },
      },
      {
        id: 'w3',
        from: { componentId: 'B', pinId: 'OUT' },
        to: { componentId: 'U2', pinId: 'IN' },
      },
      {
        id: 'w4',
        from: { componentId: 'U2', pinId: 'OUT' },
        to: { componentId: 'D', pinId: 'IN' },
      },
    ],
  };

  const result = inspectHierarchyExpansion(document, [scalar, bus]);
  const flat = flattenCircuit(document, [scalar, bus]).flat;
  assert.equal(result.ok, true);
  assert.equal(result.stats.wires, 2);
  assert.equal(result.stats.wires, flat.wires.length);
});

test('multiplicative hierarchy is rejected before flattening', () => {
  const leafDefinition: CircuitDefinition = {
    id: 'leaf',
    name: 'Leaf',
    components: [leaf('G')],
    wires: [],
  };
  const branch: CircuitDefinition = {
    id: 'branch',
    name: 'Branch',
    components: Array.from({ length: 3 }, (_, index) => ({
      id: `L${index}`,
      type: 'subcircuit' as const,
      x: index * 20,
      y: 0,
      definitionId: leafDefinition.id,
    })),
    wires: [],
  };
  const document: CircuitDocument = {
    version: 1,
    components: Array.from({ length: 3 }, (_, index) => ({
      id: `B${index}`,
      type: 'subcircuit' as const,
      x: index * 20,
      y: 0,
      definitionId: branch.id,
    })),
    wires: [],
  };
  const result = inspectHierarchyExpansion(document, [leafDefinition, branch], {
    limits: permissiveLimits({ maxComponents: 8 }),
  });

  assert.equal(result.ok, false);
  if (result.ok) return;
  assert.equal(result.violation.code, 'max-components');
  assert.equal(result.violation.actual, 9);
  assert.throws(
    () =>
      assertHierarchyExpansionAllowed(document, [leafDefinition, branch], {
        limits: permissiveLimits({ maxComponents: 8 }),
      }),
    (error) =>
      error instanceof HierarchyExpansionError &&
      error.code === 'HIERARCHY_EXPANSION_LIMIT' &&
      error.violation.code === 'max-components',
  );
});

test('every hierarchy budget reports its own distinguishable violation', () => {
  const threeLeaves: CircuitDocument = {
    version: 1,
    components: [leaf('A'), leaf('B'), leaf('C')],
    wires: [],
  };
  const threeWires: CircuitDocument = {
    version: 1,
    components: [leaf('A'), leaf('B'), leaf('C'), leaf('D')],
    wires: [
      { id: 'w1', from: { componentId: 'A', pinId: 'out' }, to: { componentId: 'B', pinId: 'in' } },
      { id: 'w2', from: { componentId: 'A', pinId: 'out' }, to: { componentId: 'C', pinId: 'in' } },
      { id: 'w3', from: { componentId: 'A', pinId: 'out' }, to: { componentId: 'D', pinId: 'in' } },
    ],
  };
  const nested: CircuitDefinition = {
    id: 'nested',
    name: 'Nested',
    components: [leaf('LONG')],
    wires: [],
  };
  const nestedDocument: CircuitDocument = {
    version: 1,
    components: [{ id: 'INSTANCE', type: 'subcircuit', x: 0, y: 0, definitionId: nested.id }],
    wires: [],
  };

  const cases = [
    [threeLeaves, [], { maxComponents: 2 }, 'max-components'],
    [threeWires, [], { maxWires: 2 }, 'max-wires'],
    [nestedDocument, [nested], { maxInstances: 0 }, 'max-instances'],
    [nestedDocument, [nested], { maxDepth: 0 }, 'max-depth'],
    [nestedDocument, [nested], { maxPathLength: 10 }, 'max-path-length'],
    [threeLeaves, [], { maxIdCharacters: 2 }, 'max-id-characters'],
    [threeLeaves, [], { maxWork: 2 }, 'max-work'],
  ] as const;

  for (const [document, definitions, override, expectedCode] of cases) {
    const result = inspectHierarchyExpansion(document, [...definitions], {
      limits: permissiveLimits(override),
    });
    assert.equal(result.ok, false, expectedCode);
    if (!result.ok) assert.equal(result.violation.code, expectedCode);
  }
});

test('values exactly on each hierarchy boundary remain accepted', () => {
  const flat: CircuitDocument = {
    version: 1,
    components: [leaf('A'), leaf('B'), leaf('C')],
    wires: [
      {
        id: 'w1',
        from: { componentId: 'A', pinId: 'out' },
        to: { componentId: 'B', pinId: 'in' },
      },
      {
        id: 'w2',
        from: { componentId: 'A', pinId: 'out' },
        to: { componentId: 'C', pinId: 'in' },
      },
    ],
  };
  const nested: CircuitDefinition = {
    id: 'nested',
    name: 'Nested',
    components: [leaf('LONG')],
    wires: [],
  };
  const hierarchy: CircuitDocument = {
    version: 1,
    components: [{ id: 'INSTANCE', type: 'subcircuit', x: 0, y: 0, definitionId: nested.id }],
    wires: [],
  };

  assert.equal(
    inspectHierarchyExpansion(flat, [], {
      limits: permissiveLimits({
        maxComponents: 3,
        maxWires: 2,
        maxIdCharacters: 3,
        maxWork: 6,
      }),
    }).ok,
    true,
  );
  assert.equal(
    inspectHierarchyExpansion(hierarchy, [nested], {
      limits: permissiveLimits({
        maxComponents: 1,
        maxInstances: 1,
        maxDepth: 1,
        maxPathLength: 13,
        maxIdCharacters: 21,
        maxWork: 2,
      }),
    }).ok,
    true,
  );
});

test('definition previews are checked even when the definition is unused by the root', () => {
  const unused: CircuitDefinition = {
    id: 'unused',
    name: 'Unused',
    components: [leaf('A'), leaf('B')],
    wires: [],
  };
  const document: CircuitDocument = {
    version: 1,
    components: [],
    wires: [],
    definitions: [unused],
  };

  const result = inspectCircuitHierarchy(document, {
    limits: permissiveLimits({ maxComponents: 1 }),
  });
  assert.equal(result.ok, false);
  if (!result.ok) {
    assert.equal(result.scopeId, 'unused');
    assert.equal(result.violation.code, 'max-components');
  }
});
