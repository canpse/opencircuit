import { getPins } from './catalog';
import type { CircuitDocument, EvaluationResult, LogicComponent, PinRef } from './types';

const MAX_ITERATIONS = 64;

export function evaluateCircuit(circuit: CircuitDocument): EvaluationResult {
  const values: EvaluationResult = {};
  const componentById = new Map(circuit.components.map((component) => [component.id, component]));

  for (const component of circuit.components) {
    values[component.id] = {};
    for (const pin of getPins(component)) {
      values[component.id][pin.id] = false;
    }
    if (component.type === 'input' || component.type === 'button') {
      values[component.id].out = Boolean(component.state);
    }
  }

  for (let iteration = 0; iteration < MAX_ITERATIONS; iteration += 1) {
    let changed = false;

    for (const component of circuit.components) {
      changed = evaluateComponent(component, circuit, values, componentById) || changed;
    }

    for (const wire of circuit.wires) {
      const sourceValue = readPin(values, wire.from);
      if (writePin(values, wire.to, sourceValue)) changed = true;
    }

    if (!changed) return values;
  }

  return values;
}

function evaluateComponent(
  component: LogicComponent,
  circuit: CircuitDocument,
  values: EvaluationResult,
  componentById: Map<string, LogicComponent>,
): boolean {
  switch (component.type) {
    case 'input':
    case 'button':
      return writePin(values, { componentId: component.id, pinId: 'out' }, Boolean(component.state));
    case 'led':
      return false;
    case 'not':
      return writePin(values, { componentId: component.id, pinId: 'out' }, !inputValue(circuit, values, componentById, component.id, 'in'));
    case 'and': {
      const a = inputValue(circuit, values, componentById, component.id, 'a');
      const b = inputValue(circuit, values, componentById, component.id, 'b');
      return writePin(values, { componentId: component.id, pinId: 'out' }, a && b);
    }
    case 'nand': {
      const a = inputValue(circuit, values, componentById, component.id, 'a');
      const b = inputValue(circuit, values, componentById, component.id, 'b');
      return writePin(values, { componentId: component.id, pinId: 'out' }, !(a && b));
    }
    case 'or': {
      const a = inputValue(circuit, values, componentById, component.id, 'a');
      const b = inputValue(circuit, values, componentById, component.id, 'b');
      return writePin(values, { componentId: component.id, pinId: 'out' }, a || b);
    }
    case 'nor': {
      const a = inputValue(circuit, values, componentById, component.id, 'a');
      const b = inputValue(circuit, values, componentById, component.id, 'b');
      return writePin(values, { componentId: component.id, pinId: 'out' }, !(a || b));
    }
    case 'xor': {
      const a = inputValue(circuit, values, componentById, component.id, 'a');
      const b = inputValue(circuit, values, componentById, component.id, 'b');
      return writePin(values, { componentId: component.id, pinId: 'out' }, a !== b);
    }
    case 'xnor': {
      const a = inputValue(circuit, values, componentById, component.id, 'a');
      const b = inputValue(circuit, values, componentById, component.id, 'b');
      return writePin(values, { componentId: component.id, pinId: 'out' }, a === b);
    }
  }
}

function inputValue(
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

function readPin(values: EvaluationResult, pin: PinRef): boolean {
  return Boolean(values[pin.componentId]?.[pin.pinId]);
}

function writePin(values: EvaluationResult, pin: PinRef, value: boolean): boolean {
  if (!values[pin.componentId]) values[pin.componentId] = {};
  if (values[pin.componentId][pin.pinId] === value) return false;
  values[pin.componentId][pin.pinId] = value;
  return true;
}
