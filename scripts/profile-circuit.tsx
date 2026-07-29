import { performance } from 'node:perf_hooks';
import { renderToStaticMarkup } from 'react-dom/server';
import { simulateCircuit } from '../src/core/evaluateCircuit';
import { flattenCircuit } from '../src/core/hierarchy/flatten';
import { inspectHierarchyExpansion } from '../src/core/hierarchy/expansion.mjs';
import { buildIncomingWireIndex } from '../src/core/simulation/signals';
import type {
  CircuitDefinition,
  CircuitDocument,
  EvaluationResult,
  LogicComponent,
  Wire,
} from '../src/core/types';
import { CIRCUIT_EXAMPLES } from '../src/examples/circuitExamples';
import { CircuitCanvas, type WireStyle } from '../src/ui/editor/CircuitCanvas';
import { createIncrementalWireRouter, routeCircuitWires } from '../src/ui/editor/wireRouting';

type Summary = {
  median: number;
  p95: number;
  max: number;
};

const base = CIRCUIT_EXAMPLES.find((example) => example.id === 'alu-4-bit')?.circuit;
if (!base) throw new Error('Exemplo alu-4-bit não encontrado.');

function percentile(sorted: number[], ratio: number): number {
  return sorted[Math.min(sorted.length - 1, Math.floor(sorted.length * ratio))] ?? 0;
}

function benchmark(operation: () => void, repetitions: number): Summary {
  for (let index = 0; index < Math.min(3, repetitions); index += 1) operation();
  const durations: number[] = [];
  for (let index = 0; index < repetitions; index += 1) {
    const startedAt = performance.now();
    operation();
    durations.push(performance.now() - startedAt);
  }
  durations.sort((left, right) => left - right);
  return {
    median: percentile(durations, 0.5),
    p95: percentile(durations, 0.95),
    max: durations[durations.length - 1] ?? 0,
  };
}

function tileCircuit(circuit: CircuitDocument, copies: number): CircuitDocument {
  const columns = Math.ceil(Math.sqrt(copies));
  return {
    version: 1,
    components: Array.from({ length: copies }, (_, copy) => {
      const prefix = `C${copy}:`;
      const column = copy % columns;
      const row = Math.floor(copy / columns);
      return circuit.components.map((component) => ({
        ...component,
        id: `${prefix}${component.id}`,
        x: component.x + column * 1_100,
        y: component.y + row * 1_450,
      }));
    }).flat(),
    wires: Array.from({ length: copies }, (_, copy) => {
      const prefix = `C${copy}:`;
      return circuit.wires.map((wire) => ({
        ...wire,
        id: `${prefix}${wire.id}`,
        from: { ...wire.from, componentId: `${prefix}${wire.from.componentId}` },
        to: { ...wire.to, componentId: `${prefix}${wire.to.componentId}` },
      }));
    }).flat(),
  };
}

function inverterChain(length: number, reversed: boolean): CircuitDocument {
  const gates: LogicComponent[] = Array.from({ length }, (_, index) => ({
    id: `N${String(index).padStart(5, '0')}`,
    type: 'not',
    x: index,
    y: 0,
  }));
  const components: LogicComponent[] = [
    { id: 'IN', type: 'input', x: 0, y: 0, state: true },
    ...gates,
    { id: 'OUT', type: 'led', x: length, y: 0 },
  ];
  const wires: Wire[] = gates.map((gate, index) => ({
    id: `W${String(index).padStart(5, '0')}`,
    from:
      index === 0
        ? { componentId: 'IN', pinId: 'out' }
        : { componentId: gates[index - 1].id, pinId: 'out' },
    to: { componentId: gate.id, pinId: 'in' },
  }));
  wires.push({
    id: 'W-OUT',
    from: { componentId: gates[gates.length - 1].id, pinId: 'out' },
    to: { componentId: 'OUT', pinId: 'in' },
  });
  return {
    version: 1,
    components: reversed ? [...components].reverse() : components,
    wires: reversed ? [...wires].reverse() : wires,
  };
}

function renderCircuit(
  circuit: CircuitDocument,
  evaluation: EvaluationResult,
  wireStyle: WireStyle,
) {
  renderToStaticMarkup(
    <CircuitCanvas
      circuit={circuit}
      evaluation={evaluation}
      changedSignals={new Map()}
      selectedTool="select"
      wireStyle={wireStyle}
      pendingWire={null}
      selection={{ componentIds: [], wireIds: [] }}
      renameRequest={null}
      onRenameRequestHandled={() => undefined}
      onCanvasAdd={() => undefined}
      onBeginMoveComponent={() => undefined}
      onMoveComponents={() => undefined}
      onResizeTextComponent={() => undefined}
      onToggleInput={() => undefined}
      onSetButtonPressed={() => undefined}
      onPinClick={() => undefined}
      onEnterInstance={() => undefined}
      onRenameWire={() => undefined}
      onAddWireWaypoint={() => undefined}
      onBeginMoveWireWaypoint={() => undefined}
      onMoveWireWaypoint={() => undefined}
      onRemoveWireWaypoint={() => undefined}
      onRemoveComponent={() => undefined}
      onRenameComponent={() => undefined}
      onCancelPendingWire={() => undefined}
      onOpenCanvasMenu={() => undefined}
      onOpenComponentMenu={() => undefined}
      onOpenWireMenu={() => undefined}
      onOpenWaypointMenu={() => undefined}
      onSelectComponent={() => undefined}
      onToggleComponentSelection={() => undefined}
      onSelectWire={() => undefined}
      onToggleWireSelection={() => undefined}
      onSelectItems={() => undefined}
      onClearSelection={() => undefined}
      onSelectTool={() => undefined}
    />,
  );
}

function format(summary: Summary): string {
  return `${summary.median.toFixed(2)} / ${summary.p95.toFixed(2)} / ${summary.max.toFixed(2)}`;
}

console.log('OpenCircuit profile — ULA de 4 bits');
console.log('Tempos em ms: mediana / p95 / máximo');
console.log(
  'cópias | componentes | fios | flatten | índice | simulação | rota ortogonal | movimento local | render Bézier | render ortogonal',
);

const routingBudgets = new Map([
  [144, { full: 30, local: 20 }],
  [288, { full: 90, local: 35 }],
  [576, { full: 260, local: 70 }],
]);
const budgetResults: string[] = [];

for (const copies of [1, 2, 4, 8, 16]) {
  const circuit = tileCircuit(base, copies);
  const simulation = simulateCircuit(circuit);
  if (simulation.unstable) throw new Error(`Circuito com ${copies} cópias ficou instável.`);
  const componentById = new Map(circuit.components.map((component) => [component.id, component]));
  const repetitions = Math.max(3, Math.floor(30 / Math.sqrt(copies)));
  const flattenTime = benchmark(() => void flattenCircuit(circuit, []), repetitions);
  const indexTime = benchmark(() => void buildIncomingWireIndex({ ...circuit }), repetitions);
  const simulationTime = benchmark(() => void simulateCircuit(circuit), repetitions);
  const routingTime = benchmark(
    () => void routeCircuitWires(circuit.wires, componentById, circuit.components),
    repetitions,
  );
  const incrementalRouter = createIncrementalWireRouter();
  const definitions: CircuitDefinition[] = [];
  incrementalRouter.route(circuit.wires, componentById, circuit.components, definitions);
  let moved = false;
  const localMoveTime = benchmark(() => {
    moved = !moved;
    const movedComponents = circuit.components.map((component, index) =>
      index === 0 ? { ...component, x: component.x + (moved ? 12 : 0) } : component,
    );
    incrementalRouter.route(
      circuit.wires,
      new Map(movedComponents.map((component) => [component.id, component])),
      movedComponents,
      definitions,
    );
  }, repetitions);
  const bezierRenderTime = benchmark(
    () => renderCircuit(circuit, simulation.values, 'bezier'),
    repetitions,
  );
  const orthogonalRenderTime = benchmark(
    () => renderCircuit(circuit, simulation.values, 'orthogonal'),
    repetitions,
  );

  console.log(
    [
      copies.toString().padStart(6),
      circuit.components.length.toString().padStart(11),
      circuit.wires.length.toString().padStart(4),
      format(flattenTime).padStart(22),
      format(indexTime).padStart(22),
      format(simulationTime).padStart(22),
      format(routingTime).padStart(22),
      format(localMoveTime).padStart(22),
      format(bezierRenderTime).padStart(22),
      format(orthogonalRenderTime).padStart(22),
    ].join(' | '),
  );

  const budget = routingBudgets.get(circuit.components.length);
  if (budget) {
    const fullOk = routingTime.median <= budget.full;
    const localOk = localMoveTime.median <= budget.local;
    budgetResults.push(
      `${circuit.components.length} componentes: rota ${routingTime.median.toFixed(2)}/${budget.full} ms, movimento ${localMoveTime.median.toFixed(2)}/${budget.local} ms — ${fullOk && localOk ? 'OK' : 'ACIMA DO ORÇAMENTO'}`,
    );
  }
}

const hierarchyLeaf: CircuitDefinition = {
  id: 'profile-leaf',
  name: 'Folha de perfil',
  components: Array.from({ length: 100 }, (_, index) => ({
    id: `G${index}`,
    type: 'not',
    x: index,
    y: 0,
  })),
  wires: [],
};
const hierarchyCircuit: CircuitDocument = {
  version: 1,
  components: Array.from({ length: 100 }, (_, index) => ({
    id: `U${index}`,
    type: 'subcircuit',
    x: index,
    y: 0,
    definitionId: hierarchyLeaf.id,
  })),
  wires: [],
};
const hierarchyPreflight = benchmark(
  () => void inspectHierarchyExpansion(hierarchyCircuit, [hierarchyLeaf]),
  30,
);
const hierarchyFlatten = benchmark(
  () =>
    void flattenCircuit({ ...hierarchyCircuit, components: [...hierarchyCircuit.components] }, [
      hierarchyLeaf,
    ]),
  30,
);

console.log('\nHierarquia sintética no limite de 10.000 componentes:');
console.log(`- preflight: ${format(hierarchyPreflight)} ms`);
console.log(`- flatten (inclui preflight): ${format(hierarchyFlatten)} ms`);
budgetResults.push(
  `preflight hierárquico p95 ${hierarchyPreflight.p95.toFixed(2)}/15 ms — ${
    hierarchyPreflight.p95 <= 15 ? 'OK' : 'ACIMA DO ORÇAMENTO'
  }`,
  `flatten hierárquico p95 ${hierarchyFlatten.p95.toFixed(2)}/50 ms — ${
    hierarchyFlatten.p95 <= 50 ? 'OK' : 'ACIMA DO ORÇAMENTO'
  }`,
);

const deepChain = inverterChain(9_998, true);
const deepChainResult = simulateCircuit(deepChain);
if (
  deepChainResult.status !== 'stable' ||
  deepChainResult.iterations !== 1 ||
  deepChainResult.values.OUT?.in !== true
) {
  throw new Error('A cadeia combinacional profunda não convergiu corretamente.');
}
const deepChainWarm = benchmark(() => void simulateCircuit(deepChain), 15);
const deepChainCold = benchmark(() => void simulateCircuit({ ...deepChain }), 10);

console.log('\nCadeia combinacional invertida com 10.000 componentes:');
console.log(`- simulação com plano cacheado: ${format(deepChainWarm)} ms`);
console.log(`- simulação com plano e índice novos: ${format(deepChainCold)} ms`);

console.log('\nOrçamentos de mediana (medido / limite):');
for (const result of budgetResults) console.log(`- ${result}`);
