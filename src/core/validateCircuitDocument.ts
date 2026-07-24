import { COMPONENT_DEFINITIONS, getPinKind } from './catalog';
import type {
  CircuitDefinition,
  CircuitDocument,
  GateType,
  LogicComponent,
  PinRef,
  Wire,
} from './types';

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

function isNestedBooleanRecord(
  value: unknown,
): value is Record<string, Record<string, boolean>> | undefined {
  return value === undefined || (isRecord(value) && Object.values(value).every(isBooleanRecord));
}

// Flattening prefixes ids as "instancePath.internalId", so "." is reserved as the
// separator: an id containing one would make the flattened id ambiguous to unwind.
function isIdWithoutDotSeparator(value: unknown): value is string {
  return typeof value === 'string' && value.length > 0 && !value.includes('.');
}

function isLogicComponent(value: unknown): value is LogicComponent {
  if (!isRecord(value)) return false;

  const baseValid =
    isIdWithoutDotSeparator(value.id) &&
    isGateType(value.type) &&
    isFiniteNumber(value.x) &&
    isFiniteNumber(value.y) &&
    (value.label === undefined || typeof value.label === 'string') &&
    isOptionalBoolean(value.state) &&
    (value.width === undefined || (isFiniteNumber(value.width) && value.width > 0)) &&
    isBooleanRecord(value.memory);

  if (!baseValid) return false;
  if (value.type !== 'subcircuit') return true;

  // definitionId is intentionally NOT required to resolve to a real definition here:
  // a dangling reference (e.g. from a deleted definition) is tolerated, not rejected,
  // matching this file's existing permissive-by-default philosophy.
  return (
    (value.definitionId === undefined || typeof value.definitionId === 'string') &&
    isNestedBooleanRecord(value.instanceMemory)
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

function isPoint(value: unknown): boolean {
  return isRecord(value) && isFiniteNumber(value.x) && isFiniteNumber(value.y);
}

function isWire(value: unknown): value is Wire {
  return (
    isRecord(value) &&
    typeof value.id === 'string' &&
    value.id.length > 0 &&
    isPinRef(value.from) &&
    isPinRef(value.to) &&
    (value.display === undefined || value.display === 'wire' || value.display === 'tunnel') &&
    (value.label === undefined || typeof value.label === 'string') &&
    (value.waypoints === undefined ||
      (Array.isArray(value.waypoints) && value.waypoints.every(isPoint)))
  );
}

function allIdsAreUnique(items: Array<{ id: string }>): boolean {
  return new Set(items.map((item) => item.id)).size === items.length;
}

function connectedInputKey(componentId: string, pinId: string): string {
  return `${componentId}::${pinId}`;
}

/**
 * Structural + semantic validation shared by the document root and every subcircuit
 * definition: each is its own self-contained component/wire graph. `definitions` is
 * threaded into getPinKind so a wire touching a subcircuit instance's dynamically
 * derived pin resolves correctly instead of always failing as pin-less.
 */
function validateScope(
  components: unknown,
  wires: unknown,
  definitions: CircuitDefinition[],
): boolean {
  if (
    !Array.isArray(components) ||
    !Array.isArray(wires) ||
    !components.every(isLogicComponent) ||
    !wires.every(isWire) ||
    !allIdsAreUnique(components) ||
    !allIdsAreUnique(wires)
  ) {
    return false;
  }

  const componentById = new Map(components.map((component) => [component.id, component]));
  const connectedInputs = new Set<string>();

  for (const wire of wires) {
    const source = componentById.get(wire.from.componentId);
    const target = componentById.get(wire.to.componentId);
    if (!source || !target) return false;
    if (getPinKind(source, wire.from.pinId, definitions) !== 'output') return false;
    if (getPinKind(target, wire.to.pinId, definitions) !== 'input') return false;

    const inputKey = connectedInputKey(wire.to.componentId, wire.to.pinId);
    if (connectedInputs.has(inputKey)) return false;
    connectedInputs.add(inputKey);
  }

  return true;
}

function isCircuitDefinition(
  value: unknown,
  definitions: CircuitDefinition[],
): value is CircuitDefinition {
  return (
    isRecord(value) &&
    isIdWithoutDotSeparator(value.id) &&
    typeof value.name === 'string' &&
    value.name.length > 0 &&
    validateScope(value.components, value.wires, definitions)
  );
}

export function isCircuitDocument(value: unknown): value is CircuitDocument {
  if (!isRecord(value) || value.version !== 1) return false;
  if (value.definitions !== undefined && !Array.isArray(value.definitions)) return false;

  const definitions = (value.definitions ?? []) as CircuitDefinition[];
  if (!definitions.every((definition) => isCircuitDefinition(definition, definitions)))
    return false;
  if (!allIdsAreUnique(definitions)) return false;

  return validateScope(value.components, value.wires, definitions);
}
