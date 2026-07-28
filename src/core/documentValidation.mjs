import componentContract from './component-contract.json' with { type: 'json' };
import documentLimits from './document-limits.json' with { type: 'json' };

const isRecord = (value) => typeof value === 'object' && value !== null && !Array.isArray(value);
const isFiniteNumber = (value) => typeof value === 'number' && Number.isFinite(value);
const isPinRef = (value) =>
  isRecord(value) &&
  typeof value.componentId === 'string' &&
  value.componentId.length > 0 &&
  typeof value.pinId === 'string' &&
  value.pinId.length > 0;

const isIdWithoutDot = (value) =>
  typeof value === 'string' &&
  value.length > 0 &&
  value.length <= documentLimits.maxComponentIdLength &&
  !value.includes('.');

const isBooleanRecord = (value) =>
  value === undefined ||
  (isRecord(value) && Object.values(value).every((entry) => typeof entry === 'boolean'));

const isNestedBooleanRecord = (value) =>
  value === undefined || (isRecord(value) && Object.values(value).every(isBooleanRecord));

/**
 * Semantic boundary role for a marker component inside a subcircuit definition.
 * This is the canonical rule consumed by validation and by the visual catalog.
 */
export function getBoundaryPinSpec(component) {
  if (!isRecord(component)) return null;
  if (component.type === 'input' || component.type === 'clock') {
    return { kind: 'input', width: 1 };
  }
  if (component.type === 'bus-in-4') return { kind: 'input', width: 4 };
  if (component.type === 'led') return { kind: 'output', width: 1 };
  if (component.type === 'display-4') return { kind: 'output', width: 4 };
  return null;
}

function resolvePinSpec(component, pinId, definitionsById) {
  if (component.type !== 'subcircuit') return componentContract[component.type]?.pins?.[pinId];
  const definition = definitionsById.get(component.definitionId);
  if (!definition || !Array.isArray(definition.components)) return undefined;
  const marker = definition.components.find(
    (candidate) => isRecord(candidate) && candidate.id === pinId,
  );
  return marker ? (getBoundaryPinSpec(marker) ?? undefined) : undefined;
}

export function resolvePinKind(component, pinId, definitionsById) {
  return resolvePinSpec(component, pinId, definitionsById)?.kind;
}

export function resolvePinWidth(component, pinId, definitionsById) {
  return resolvePinSpec(component, pinId, definitionsById)?.width ?? 1;
}

function isValidComponent(component) {
  if (
    !isRecord(component) ||
    !isIdWithoutDot(component.id) ||
    !isFiniteNumber(component.x) ||
    !isFiniteNumber(component.y) ||
    (component.label !== undefined && typeof component.label !== 'string') ||
    (component.state !== undefined && typeof component.state !== 'boolean') ||
    (component.width !== undefined && (!isFiniteNumber(component.width) || component.width <= 0)) ||
    !isBooleanRecord(component.memory)
  ) {
    return false;
  }

  if (component.type === 'subcircuit') {
    return (
      (component.definitionId === undefined || typeof component.definitionId === 'string') &&
      isNestedBooleanRecord(component.instanceMemory)
    );
  }
  return Object.hasOwn(componentContract, component.type) && component.type !== 'subcircuit';
}

export function validateScope(components, wires, definitionsById = new Map()) {
  if (
    !Array.isArray(components) ||
    !Array.isArray(wires) ||
    components.length > documentLimits.maxComponentsPerScope ||
    wires.length > documentLimits.maxWiresPerScope
  ) {
    return false;
  }

  const componentById = new Map();
  for (const component of components) {
    if (!isValidComponent(component) || componentById.has(component.id)) return false;
    componentById.set(component.id, component);
  }

  const wireIds = new Set();
  const connectedInputs = new Set();
  for (const wire of wires) {
    if (
      !isRecord(wire) ||
      typeof wire.id !== 'string' ||
      !wire.id ||
      wireIds.has(wire.id) ||
      !isPinRef(wire.from) ||
      !isPinRef(wire.to) ||
      (wire.display !== undefined && wire.display !== 'wire' && wire.display !== 'tunnel') ||
      (wire.label !== undefined && typeof wire.label !== 'string') ||
      (wire.waypoints !== undefined &&
        (!Array.isArray(wire.waypoints) ||
          !wire.waypoints.every(
            (point) => isRecord(point) && isFiniteNumber(point.x) && isFiniteNumber(point.y),
          )))
    ) {
      return false;
    }

    const source = componentById.get(wire.from.componentId);
    const target = componentById.get(wire.to.componentId);
    if (
      !source ||
      !target ||
      resolvePinKind(source, wire.from.pinId, definitionsById) !== 'output' ||
      resolvePinKind(target, wire.to.pinId, definitionsById) !== 'input' ||
      resolvePinWidth(source, wire.from.pinId, definitionsById) !==
        resolvePinWidth(target, wire.to.pinId, definitionsById)
    ) {
      return false;
    }

    const inputKey = JSON.stringify([wire.to.componentId, wire.to.pinId]);
    if (connectedInputs.has(inputKey)) return false;
    connectedInputs.add(inputKey);
    wireIds.add(wire.id);
  }
  return true;
}

function isValidDefinition(value, definitionsById) {
  return (
    isRecord(value) &&
    isIdWithoutDot(value.id) &&
    typeof value.name === 'string' &&
    value.name.length > 0 &&
    validateScope(value.components, value.wires, definitionsById)
  );
}

export function isCircuitDocument(value) {
  if (!isRecord(value) || value.version !== 1) return false;
  if (value.definitions !== undefined && !Array.isArray(value.definitions)) return false;

  const definitions = value.definitions ?? [];
  const definitionsById = new Map();
  for (const definition of definitions) {
    if (!isRecord(definition) || typeof definition.id !== 'string') return false;
    if (definitionsById.has(definition.id)) return false;
    definitionsById.set(definition.id, definition);
  }

  for (const definition of definitions) {
    if (!isValidDefinition(definition, definitionsById)) return false;
  }
  return validateScope(value.components, value.wires, definitionsById);
}
