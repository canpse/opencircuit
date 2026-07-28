import { getPins } from '../catalog';
import type {
  CircuitDocument,
  EvaluationResult,
  LogicComponent,
  LogicValue,
  PinRef,
  SimulationResult,
  Wire,
} from '../types';

const incomingWireIndexCache = new WeakMap<CircuitDocument, ReadonlyMap<string, Wire>>();

function inputKey(componentId: string, pinId: string): string {
  return `${componentId}::${pinId}`;
}

/**
 * Circuit documents are immutable throughout the editor. Indexing by document identity
 * turns every input lookup in the fixed-point loop into O(1), while a structurally changed
 * document naturally receives a new index.
 */
export function buildIncomingWireIndex(circuit: CircuitDocument): ReadonlyMap<string, Wire> {
  const cached = incomingWireIndexCache.get(circuit);
  if (cached) return cached;
  const index = new Map<string, Wire>();
  for (const wire of circuit.wires) {
    index.set(inputKey(wire.to.componentId, wire.to.pinId), wire);
  }
  incomingWireIndexCache.set(circuit, index);
  return index;
}

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
  const incoming = buildIncomingWireIndex(circuit).get(inputKey(componentId, pinId));
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
  const incoming = buildIncomingWireIndex(circuit).get(inputKey(componentId, pinId));
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

// Índice 0 do array = bit menos significativo (convenção já implícita desde a Fase 1:
// merge-4 recebe I0..I3 nos slots [0..3], então I0 já É o bit 0/LSB por construção).
export function busValueToNumber(value: LogicValue | undefined): number {
  if (!Array.isArray(value)) return value ? 1 : 0;
  return value.reduce((total, bit, index) => total + (bit ? 2 ** index : 0), 0);
}

export function formatBusHex(value: LogicValue | undefined): string {
  return busValueToNumber(value).toString(16).toUpperCase();
}
