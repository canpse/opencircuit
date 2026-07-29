import { getPins } from '../catalog';
import { COMPONENT_REGISTRY } from '../componentRegistry';
import type { CircuitDocument, LogicComponent } from '../types';

export interface EvaluationGroup {
  componentIds: readonly string[];
  cyclic: boolean;
}

export interface EvaluationPlan {
  groups: readonly EvaluationGroup[];
  hasFeedback: boolean;
}

const evaluationPlanCache = new WeakMap<CircuitDocument, EvaluationPlan>();

/**
 * Builds a deterministic topological plan for the combinational part of a circuit.
 *
 * Sequential components are treated as dependency boundaries: their current outputs
 * are state, not a combinational function of their current inputs. Strongly connected
 * combinational components are kept together so the simulator can settle only that
 * feedback region instead of repeatedly evaluating the whole document.
 */
export function buildEvaluationPlan(circuit: CircuitDocument): EvaluationPlan {
  const cached = evaluationPlanCache.get(circuit);
  if (cached) return cached;

  const components = new Map(circuit.components.map((component) => [component.id, component]));
  const componentIds = [...components.keys()].sort(compareIds);
  const outgoingSets = new Map(componentIds.map((id) => [id, new Set<string>()]));
  const incomingSets = new Map(componentIds.map((id) => [id, new Set<string>()]));
  const inputDependentOutputs = new Map(
    componentIds.map((id) => [id, hasInputDependentOutputs(components.get(id)!)]),
  );

  for (const wire of circuit.wires) {
    const source = components.get(wire.from.componentId);
    const target = components.get(wire.to.componentId);
    if (!source || !target || !inputDependentOutputs.get(target.id)) continue;
    outgoingSets.get(source.id)?.add(target.id);
    incomingSets.get(target.id)?.add(source.id);
  }

  const outgoing = sortedAdjacency(componentIds, outgoingSets);
  const incoming = sortedAdjacency(componentIds, incomingSets);
  const finishOrder = findFinishOrder(componentIds, outgoing);
  const visited = new Set<string>();
  const stronglyConnected: string[][] = [];

  for (let index = finishOrder.length - 1; index >= 0; index -= 1) {
    const start = finishOrder[index];
    if (visited.has(start)) continue;

    const componentIdsInGroup: string[] = [];
    const stack = [start];
    visited.add(start);
    while (stack.length > 0) {
      const id = stack.pop();
      if (id === undefined) break;
      componentIdsInGroup.push(id);
      const neighbors = incoming.get(id) ?? [];
      for (let neighborIndex = neighbors.length - 1; neighborIndex >= 0; neighborIndex -= 1) {
        const neighbor = neighbors[neighborIndex];
        if (visited.has(neighbor)) continue;
        visited.add(neighbor);
        stack.push(neighbor);
      }
    }
    componentIdsInGroup.sort(compareIds);
    stronglyConnected.push(componentIdsInGroup);
  }

  const groupByComponent = new Map<string, number>();
  stronglyConnected.forEach((group, groupIndex) => {
    for (const componentId of group) groupByComponent.set(componentId, groupIndex);
  });

  const groupOutgoing = stronglyConnected.map(() => new Set<number>());
  const indegree = stronglyConnected.map(() => 0);
  for (const sourceId of componentIds) {
    const sourceGroup = groupByComponent.get(sourceId);
    if (sourceGroup === undefined) continue;
    for (const targetId of outgoing.get(sourceId) ?? []) {
      const targetGroup = groupByComponent.get(targetId);
      if (
        targetGroup === undefined ||
        targetGroup === sourceGroup ||
        groupOutgoing[sourceGroup].has(targetGroup)
      ) {
        continue;
      }
      groupOutgoing[sourceGroup].add(targetGroup);
      indegree[targetGroup] += 1;
    }
  }

  const groupKeys = stronglyConnected.map((group) => group[0] ?? '');
  const ready: number[] = [];
  for (let groupIndex = 0; groupIndex < stronglyConnected.length; groupIndex += 1) {
    if (indegree[groupIndex] === 0) pushReadyGroup(ready, groupIndex, groupKeys);
  }

  const orderedGroupIndexes: number[] = [];
  while (ready.length > 0) {
    const groupIndex = popReadyGroup(ready, groupKeys);
    if (groupIndex === undefined) break;
    orderedGroupIndexes.push(groupIndex);
    const successors = [...groupOutgoing[groupIndex]].sort((left, right) =>
      compareIds(groupKeys[left], groupKeys[right]),
    );
    for (const successor of successors) {
      indegree[successor] -= 1;
      if (indegree[successor] === 0) pushReadyGroup(ready, successor, groupKeys);
    }
  }

  const groups = orderedGroupIndexes.map<EvaluationGroup>((groupIndex) => {
    const group = stronglyConnected[groupIndex];
    return {
      componentIds: group,
      cyclic:
        group.length > 1 ||
        (group.length === 1 && Boolean(outgoing.get(group[0])?.includes(group[0]))),
    };
  });
  const plan: EvaluationPlan = {
    groups,
    hasFeedback: groups.some((group) => group.cyclic),
  };
  evaluationPlanCache.set(circuit, plan);
  return plan;
}

export function circuitHasFeedback(circuit: CircuitDocument): boolean {
  return buildEvaluationPlan(circuit).hasFeedback;
}

function hasInputDependentOutputs(component: LogicComponent): boolean {
  if (COMPONENT_REGISTRY[component.type].sequential) return false;
  const pins = getPins(component);
  return pins.some((pin) => pin.kind === 'input') && pins.some((pin) => pin.kind === 'output');
}

function sortedAdjacency(
  componentIds: readonly string[],
  adjacency: ReadonlyMap<string, ReadonlySet<string>>,
): ReadonlyMap<string, readonly string[]> {
  return new Map(componentIds.map((id) => [id, [...(adjacency.get(id) ?? [])].sort(compareIds)]));
}

function findFinishOrder(
  componentIds: readonly string[],
  outgoing: ReadonlyMap<string, readonly string[]>,
): string[] {
  const visited = new Set<string>();
  const result: string[] = [];

  for (const start of componentIds) {
    if (visited.has(start)) continue;
    visited.add(start);
    const stack: Array<{ id: string; nextNeighbor: number }> = [{ id: start, nextNeighbor: 0 }];

    while (stack.length > 0) {
      const frame = stack[stack.length - 1];
      const neighbors = outgoing.get(frame.id) ?? [];
      if (frame.nextNeighbor < neighbors.length) {
        const neighbor = neighbors[frame.nextNeighbor];
        frame.nextNeighbor += 1;
        if (!visited.has(neighbor)) {
          visited.add(neighbor);
          stack.push({ id: neighbor, nextNeighbor: 0 });
        }
      } else {
        result.push(frame.id);
        stack.pop();
      }
    }
  }

  return result;
}

function pushReadyGroup(heap: number[], groupIndex: number, groupKeys: readonly string[]): void {
  heap.push(groupIndex);
  let index = heap.length - 1;
  while (index > 0) {
    const parent = (index - 1) >>> 1;
    if (compareGroups(heap[parent], heap[index], groupKeys) <= 0) break;
    [heap[parent], heap[index]] = [heap[index], heap[parent]];
    index = parent;
  }
}

function popReadyGroup(heap: number[], groupKeys: readonly string[]): number | undefined {
  const first = heap[0];
  const last = heap.pop();
  if (last === undefined || heap.length === 0) return first;
  heap[0] = last;
  let index = 0;
  while (index < heap.length) {
    const left = index * 2 + 1;
    const right = left + 1;
    let smallest = index;
    if (left < heap.length && compareGroups(heap[left], heap[smallest], groupKeys) < 0) {
      smallest = left;
    }
    if (right < heap.length && compareGroups(heap[right], heap[smallest], groupKeys) < 0) {
      smallest = right;
    }
    if (smallest === index) break;
    [heap[index], heap[smallest]] = [heap[smallest], heap[index]];
    index = smallest;
  }
  return first;
}

function compareGroups(left: number, right: number, groupKeys: readonly string[]): number {
  return compareIds(groupKeys[left], groupKeys[right]) || left - right;
}

function compareIds(left: string, right: string): number {
  return left < right ? -1 : left > right ? 1 : 0;
}
