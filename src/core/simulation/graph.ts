import type { CircuitDocument } from '../types';

export function circuitHasFeedback(circuit: CircuitDocument): boolean {
  const componentIds = new Set(circuit.components.map((component) => component.id));
  const edges = new Map<string, string[]>();
  for (const id of componentIds) edges.set(id, []);

  for (const wire of circuit.wires) {
    if (componentIds.has(wire.from.componentId) && componentIds.has(wire.to.componentId)) {
      edges.get(wire.from.componentId)?.push(wire.to.componentId);
    }
  }

  const visiting = new Set<string>();
  const visited = new Set<string>();

  function visit(id: string): boolean {
    if (visiting.has(id)) return true;
    if (visited.has(id)) return false;
    visiting.add(id);
    for (const next of edges.get(id) ?? []) {
      if (visit(next)) return true;
    }
    visiting.delete(id);
    visited.add(id);
    return false;
  }

  return Array.from(componentIds).some(visit);
}
