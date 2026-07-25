import { getPins } from '../catalog';
import type {
  CircuitDocument,
  EvaluationResult,
  LogicComponent,
  LogicValue,
  PinRef,
  SimulationResult,
} from '../types';

export function initializeValues(
  circuit: CircuitDocument,
  previousValues?: EvaluationResult,
): EvaluationResult {
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

export function simulationResult(
  values: EvaluationResult,
  unstable: boolean,
  iterations: number,
): SimulationResult {
  return {
    values,
    unstable,
    iterations,
    state: { values: cloneValues(values), unstable, iterations },
  };
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
  const incoming = circuit.wires.find(
    (wire) => wire.to.componentId === componentId && wire.to.pinId === pinId,
  );
  if (!incoming) return false;
  const sourceComponent = componentById.get(incoming.from.componentId);
  if (!sourceComponent) return false;
  const value = readPin(values, incoming.from);
  return typeof value === 'boolean' ? value : false;
}

export function inputBusValue(
  circuit: CircuitDocument,
  values: EvaluationResult,
  componentById: Map<string, LogicComponent>,
  componentId: string,
  pinId: string,
  width: number,
): boolean[] {
  const incoming = circuit.wires.find(
    (wire) => wire.to.componentId === componentId && wire.to.pinId === pinId,
  );
  const fallback = () => new Array<boolean>(width).fill(false);
  if (!incoming) return fallback();
  const sourceComponent = componentById.get(incoming.from.componentId);
  if (!sourceComponent) return fallback();
  const value = readPin(values, incoming.from);
  return Array.isArray(value) ? value : fallback();
}

export function readPin(values: EvaluationResult, pin: PinRef): LogicValue {
  return values[pin.componentId]?.[pin.pinId] ?? false;
}

/**
 * evaluateComponent for a bus pin always writes a fresh array (never mutates one in
 * place), so reference equality would report "changed" every iteration even when the
 * bits didn't -- compare by value instead, or the fixed-point loop in simulate.ts would
 * never converge and every circuit with a bus component would falsely flag `unstable`.
 */
export function logicValuesEqual(a: LogicValue | undefined, b: LogicValue): boolean {
  if (Array.isArray(a) && Array.isArray(b)) {
    return a.length === b.length && a.every((bit, index) => bit === b[index]);
  }
  return a === b;
}

export function writePin(values: EvaluationResult, pin: PinRef, value: LogicValue): boolean {
  if (!values[pin.componentId]) values[pin.componentId] = {};
  if (logicValuesEqual(values[pin.componentId][pin.pinId], value)) return false;
  values[pin.componentId][pin.pinId] = value;
  return true;
}

export function writeMany(
  values: EvaluationResult,
  componentId: string,
  outputs: Record<string, LogicValue>,
): boolean {
  return Object.entries(outputs).reduce(
    (changed, [pinId, value]) => writePin(values, { componentId, pinId }, value) || changed,
    false,
  );
}
