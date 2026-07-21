import { performance } from 'node:perf_hooks';
import { renderToStaticMarkup } from 'react-dom/server';
import { simulateCircuit } from '../src/core/evaluateCircuit';
import type { CircuitDocument, EvaluationResult } from '../src/core/types';
import { CIRCUIT_EXAMPLES } from '../src/examples/circuitExamples';
import { CircuitCanvas, type WireStyle } from '../src/ui/editor/CircuitCanvas';
import { routeCircuitWires } from '../src/ui/editor/wireRouting';

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

function renderCircuit(
  circuit: CircuitDocument,
  evaluation: EvaluationResult,
  wireStyle: WireStyle,
) {
  renderToStaticMarkup(
    <CircuitCanvas
      circuit={circuit}
      evaluation={evaluation}
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
      onSelectWire={() => undefined}
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
  'cópias | componentes | fios | simulação | rota ortogonal | render Bézier | render ortogonal',
);

for (const copies of [1, 2, 4, 8, 16]) {
  const circuit = tileCircuit(base, copies);
  const simulation = simulateCircuit(circuit);
  if (simulation.unstable) throw new Error(`Circuito com ${copies} cópias ficou instável.`);
  const componentById = new Map(circuit.components.map((component) => [component.id, component]));
  const repetitions = Math.max(3, Math.floor(30 / Math.sqrt(copies)));
  const simulationTime = benchmark(() => void simulateCircuit(circuit), repetitions);
  const routingTime = benchmark(
    () => void routeCircuitWires(circuit.wires, componentById, circuit.components),
    repetitions,
  );
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
      format(simulationTime).padStart(22),
      format(routingTime).padStart(22),
      format(bezierRenderTime).padStart(22),
      format(orthogonalRenderTime).padStart(22),
    ].join(' | '),
  );
}
