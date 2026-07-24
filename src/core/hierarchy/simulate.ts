import type {
  CircuitDefinition,
  CircuitDocument,
  EvaluationResult,
  SimulationState,
} from '../types';
import { settleSequentialCircuit, simulateCircuit, stepCircuit } from '../evaluateCircuit';
import { flattenCircuit, type FlattenNode } from './flatten';
import { writeBackMemory } from './memory';

/**
 * Lifts a flattened evaluation result back to the given scope's own component/pin ids,
 * so the canvas can color a scope's own components (including each direct subcircuit
 * instance's boundary pins) without knowing anything about flattening. Only nodes
 * declared directly in the scope that was flattened (parentScopePath === null) are
 * lifted -- nested instances are addressed through their own recursive flatten call
 * when that definition is being viewed directly.
 */
export function liftEvaluationForScope(
  nodes: FlattenNode[],
  flatValues: EvaluationResult,
): EvaluationResult {
  const lifted: EvaluationResult = {};

  for (const [id, pins] of Object.entries(flatValues)) {
    if (!id.includes('.')) lifted[id] = pins;
  }

  for (const node of nodes) {
    if (node.parentScopePath !== null) continue;
    const pins: Record<string, boolean> = { ...(lifted[node.localId] ?? {}) };
    for (const [pinId, source] of Object.entries(node.pinSources)) {
      pins[pinId] = Boolean(flatValues[source.componentId]?.[source.pinId]);
    }
    lifted[node.localId] = pins;
  }

  return lifted;
}

export function evaluateHierarchical(
  scope: CircuitDocument,
  definitions: CircuitDefinition[],
  previousState?: SimulationState,
) {
  const { flat, nodes } = flattenCircuit(scope, definitions);
  const result = simulateCircuit(flat, previousState);
  return { result, canvasEvaluation: liftEvaluationForScope(nodes, result.values), flat, nodes };
}

export function stepHierarchical(
  scope: CircuitDocument,
  definitions: CircuitDefinition[],
): CircuitDocument {
  const { flat } = flattenCircuit(scope, definitions);
  return writeBackMemory(scope, stepCircuit(flat));
}

export function settleHierarchical(
  scope: CircuitDocument,
  definitions: CircuitDefinition[],
): CircuitDocument {
  const { flat } = flattenCircuit(scope, definitions);
  return writeBackMemory(scope, settleSequentialCircuit(flat));
}
