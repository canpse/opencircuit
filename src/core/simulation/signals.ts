import { getPins } from '../catalog';
import type { CircuitDocument, EvaluationResult, LogicComponent, PinRef, SimulationResult } from '../types';

export function initializeValues(circuit: CircuitDocument, previousValues?: EvaluationResult): EvaluationResult {
  const values: EvaluationResult = {};
  for (const component of circuit.components) {
    values[component.id] = {};
    for (const pin of getPins(component)) {
      values[component.id][pin.id] = previousValues?.[component.id]?.[pin.id] ?? false;
    }
    if (component.type === 'input' || component.type === 'button') {
      values[component.id].out = Boolean(component.state);
    }
    if (component.type === 'clock') {
      values[component.id].CLK = Boolean(component.state);
    }
    if (component.type === 'd-latch' || component.type === 'd-flip-flop') {
      values[component.id].Q = Boolean(component.memory?.q);
    }
  }
  return values;
}

export function simulationResult(values: EvaluationResult, unstable: boolean, iterations: number): SimulationResult {
  return { values, unstable, iterations, state: { values: cloneValues(values), unstable, iterations } };
}

export function cloneValues(values: EvaluationResult): EvaluationResult {
  return Object.fromEntries(
    Object.entries(values).map(([componentId, pins]) => [componentId, { ...pins }]),
  );
}

export function inputValue(
  circuit: CircuitDocument,
  values: EvaluationResult,
  componentById: Map<string, LogicComponent>,
  componentId: string,
  pinId: string,
): boolean {
  const incoming = circuit.wires.find((wire) => wire.to.componentId === componentId && wire.to.pinId === pinId);
  if (!incoming) return false;
  const sourceComponent = componentById.get(incoming.from.componentId);
  if (!sourceComponent) return false;
  return readPin(values, incoming.from);
}

export function readPin(values: EvaluationResult, pin: PinRef): boolean {
  return Boolean(values[pin.componentId]?.[pin.pinId]);
}

export function writePin(values: EvaluationResult, pin: PinRef, value: boolean): boolean {
  if (!values[pin.componentId]) values[pin.componentId] = {};
  if (values[pin.componentId][pin.pinId] === value) return false;
  values[pin.componentId][pin.pinId] = value;
  return true;
}

export function writeMany(values: EvaluationResult, componentId: string, outputs: Record<string, boolean>): boolean {
  return Object.entries(outputs).reduce(
    (changed, [pinId, value]) => writePin(values, { componentId, pinId }, value) || changed,
    false,
  );
}
