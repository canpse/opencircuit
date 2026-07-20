import { COMPONENT_DEFINITIONS, getPinKind } from './catalog';
import type { CircuitDocument, GateType, LogicComponent, PinRef, Wire } from './types';

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isGateType(value: unknown): value is GateType {
  return (
    typeof value === 'string' && Object.prototype.hasOwnProperty.call(COMPONENT_DEFINITIONS, value)
  );
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value);
}

function isOptionalBoolean(value: unknown): value is boolean | undefined {
  return value === undefined || typeof value === 'boolean';
}

function isBooleanRecord(value: unknown): value is Record<string, boolean> | undefined {
  return (
    value === undefined ||
    (isRecord(value) && Object.values(value).every((entry) => typeof entry === 'boolean'))
  );
}

function isLogicComponent(value: unknown): value is LogicComponent {
  if (!isRecord(value)) return false;

  return (
    typeof value.id === 'string' &&
    value.id.length > 0 &&
    isGateType(value.type) &&
    isFiniteNumber(value.x) &&
    isFiniteNumber(value.y) &&
    (value.label === undefined || typeof value.label === 'string') &&
    isOptionalBoolean(value.state) &&
    (value.width === undefined || (isFiniteNumber(value.width) && value.width > 0)) &&
    isBooleanRecord(value.memory)
  );
}

function isPinRef(value: unknown): value is PinRef {
  return (
    isRecord(value) &&
    typeof value.componentId === 'string' &&
    value.componentId.length > 0 &&
    typeof value.pinId === 'string' &&
    value.pinId.length > 0
  );
}

function isWire(value: unknown): value is Wire {
  return (
    isRecord(value) &&
    typeof value.id === 'string' &&
    value.id.length > 0 &&
    isPinRef(value.from) &&
    isPinRef(value.to) &&
    (value.display === undefined || value.display === 'wire' || value.display === 'tunnel') &&
    (value.label === undefined || typeof value.label === 'string')
  );
}

function allIdsAreUnique(items: Array<{ id: string }>): boolean {
  return new Set(items.map((item) => item.id)).size === items.length;
}

export function isCircuitDocument(value: unknown): value is CircuitDocument {
  if (
    !isRecord(value) ||
    value.version !== 1 ||
    !Array.isArray(value.components) ||
    !Array.isArray(value.wires) ||
    !value.components.every(isLogicComponent) ||
    !value.wires.every(isWire) ||
    !allIdsAreUnique(value.components) ||
    !allIdsAreUnique(value.wires)
  ) {
    return false;
  }

  const components = new Map(value.components.map((component) => [component.id, component]));
  const connectedInputs = new Set<string>();

  for (const wire of value.wires) {
    const source = components.get(wire.from.componentId);
    const target = components.get(wire.to.componentId);
    if (!source || !target) return false;
    if (getPinKind(source, wire.from.pinId) !== 'output') return false;
    if (getPinKind(target, wire.to.pinId) !== 'input') return false;

    const inputKey = `${wire.to.componentId}\u0000${wire.to.pinId}`;
    if (connectedInputs.has(inputKey)) return false;
    connectedInputs.add(inputKey);
  }

  return true;
}
