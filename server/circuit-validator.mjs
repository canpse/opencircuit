import componentContract from '../src/core/component-contract.json' with { type: 'json' };
import documentLimits from '../src/core/document-limits.json' with { type: 'json' };

const isRecord = (value) => typeof value === 'object' && value !== null && !Array.isArray(value);
const isFiniteNumber = (value) => typeof value === 'number' && Number.isFinite(value);
const isPinRef = (value) =>
  isRecord(value) &&
  typeof value.componentId === 'string' &&
  value.componentId.length > 0 &&
  typeof value.pinId === 'string' &&
  value.pinId.length > 0;

// Flattening prefixes ids as "instancePath.internalId" (src/core/hierarchy), so "." is
// reserved as the separator: an id containing one would make a flattened id ambiguous
// to unwind. Mirrors src/core/validateCircuitDocument.ts's isIdWithoutDotSeparator.
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
 * Pin kind for a component+pinId, skipping the full PinDefinition (offset/label) the
 * client needs for rendering -- the server only ever checks wire direction. For a
 * subcircuit instance, a pin id is the id of the input/clock/bus-in-4/led/display-4
 * "marker" component that produces it inside the referenced definition (mirrors
 * src/core/catalog.ts's deriveSubcircuitPins). This lookup is intentionally
 * non-recursive: it only reads the referenced definition's OWN components, never
 * follows a nested instance's definitionId, so unlike flattenCircuit it cannot cycle --
 * no cache, no reentrancy guard needed.
 */
function resolvePinKind(component, pinId, definitionsById) {
  if (component.type !== 'subcircuit')
    return componentContract[component.type]?.pins?.[pinId]?.kind;
  const definition = definitionsById.get(component.definitionId);
  if (!definition || !Array.isArray(definition.components)) return undefined;
  const marker = definition.components.find(
    (candidate) => isRecord(candidate) && candidate.id === pinId,
  );
  if (!marker) return undefined;
  if (marker.type === 'input' || marker.type === 'clock' || marker.type === 'bus-in-4')
    return 'input';
  if (marker.type === 'led' || marker.type === 'display-4') return 'output';
  return undefined;
}

/**
 * Bit width for a component+pinId, default 1. For a subcircuit instance, mirrors
 * resolvePinKind's marker lookup: a bus-in-4/display-4 marker exposes its boundary pin
 * as width 4, everything else (including the classic input/clock/led markers) stays
 * scalar.
 */
function resolvePinWidth(component, pinId, definitionsById) {
  if (component.type !== 'subcircuit')
    return componentContract[component.type]?.pins?.[pinId]?.width ?? 1;
  const definition = definitionsById.get(component.definitionId);
  if (!definition || !Array.isArray(definition.components)) return 1;
  const marker = definition.components.find(
    (candidate) => isRecord(candidate) && candidate.id === pinId,
  );
  return marker && (marker.type === 'bus-in-4' || marker.type === 'display-4') ? 4 : 1;
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
  )
    return false;

  if (component.type === 'subcircuit') {
    // definitionId is intentionally NOT required to resolve to a real definition: a
    // dangling reference (e.g. a deleted definition) is tolerated, matching
    // src/core/validateCircuitDocument.ts's permissive-by-default philosophy.
    return (
      (component.definitionId === undefined || typeof component.definitionId === 'string') &&
      isNestedBooleanRecord(component.instanceMemory)
    );
  }
  return Object.hasOwn(componentContract, component.type) && component.type !== 'subcircuit';
}

/**
 * Structural + semantic validation shared by the document root and every subcircuit
 * definition: each is its own self-contained component/wire graph. Mirrors
 * src/core/validateCircuitDocument.ts's validateScope. definitionsById is threaded
 * into resolvePinKind so a wire touching a subcircuit instance's dynamically derived
 * pin resolves correctly instead of always failing as pin-less.
 */
export function validateScope(components, wires, definitionsById) {
  if (
    !Array.isArray(components) ||
    !Array.isArray(wires) ||
    components.length > documentLimits.maxComponentsPerScope ||
    wires.length > documentLimits.maxWiresPerScope
  )
    return false;

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
    )
      return false;

    const source = componentById.get(wire.from.componentId);
    const target = componentById.get(wire.to.componentId);
    if (
      !source ||
      !target ||
      resolvePinKind(source, wire.from.pinId, definitionsById) !== 'output' ||
      resolvePinKind(target, wire.to.pinId, definitionsById) !== 'input' ||
      resolvePinWidth(source, wire.from.pinId, definitionsById) !==
        resolvePinWidth(target, wire.to.pinId, definitionsById)
    )
      return false;

    const inputKey = `${wire.to.componentId}::${wire.to.pinId}`;
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
    if (definitionsById.has(definition.id)) return false; // duplicate definition ids
    definitionsById.set(definition.id, definition);
  }

  for (const definition of definitions) {
    if (!isValidDefinition(definition, definitionsById)) return false;
  }

  return validateScope(value.components, value.wires, definitionsById);
}
