import { COMPONENT_DEFINITIONS } from '../../core/catalog';
import { withSequentialDefaults } from '../../core/evaluateCircuit';
import { nextDefinitionId } from '../../core/hierarchy/scope';
import type {
  CircuitDefinition,
  CircuitDocument,
  GateType,
  LogicComponent,
  PinRef,
  Point,
  Wire,
} from '../../core/types';
import type { Selection } from '../context-menu/ContextMenuView';
import type { WireStyle } from '../editor/CircuitCanvas';

export function loadWireStyle(storageKey: string): WireStyle {
  try {
    const stored = localStorage.getItem(storageKey);
    return stored === 'bezier' ? 'bezier' : 'orthogonal';
  } catch {
    return 'orthogonal';
  }
}

function cloneComponent(component: LogicComponent): LogicComponent {
  return {
    ...component,
    memory: component.memory ? { ...component.memory } : undefined,
    instanceMemory: component.instanceMemory
      ? Object.fromEntries(
          Object.entries(component.instanceMemory).map(([path, memory]) => [path, { ...memory }]),
        )
      : undefined,
  };
}

function cloneWire(wire: Wire): Wire {
  return {
    ...wire,
    from: { ...wire.from },
    to: { ...wire.to },
    waypoints: wire.waypoints?.map((point) => ({ ...point })),
  };
}

function cloneDefinition(definition: CircuitDefinition): CircuitDefinition {
  return {
    id: definition.id,
    name: definition.name,
    components: definition.components.map(cloneComponent),
    wires: definition.wires.map(cloneWire),
  };
}

export function cloneCircuit(circuit: CircuitDocument): CircuitDocument {
  return {
    version: circuit.version,
    components: circuit.components.map(cloneComponent),
    wires: circuit.wires.map(cloneWire),
    definitions: circuit.definitions?.map(cloneDefinition),
  };
}

function normalizeDefinition(definition: CircuitDefinition): CircuitDefinition {
  return {
    ...definition,
    components: definition.components.map((component) =>
      withSequentialDefaults(cloneComponent(component)),
    ),
  };
}

export function normalizeCircuitForEditor(circuit: CircuitDocument): CircuitDocument {
  return {
    ...cloneCircuit(circuit),
    components: circuit.components.map((component) =>
      withSequentialDefaults(cloneComponent(component)),
    ),
    definitions: circuit.definitions?.map(normalizeDefinition),
  };
}

export function hasSelection(selection: Selection): boolean {
  return selection.componentIds.length > 0 || selection.wireIds.length > 0;
}

export const GRID = 20;

export function snap(point: Point, grid: number): Point {
  return { x: Math.round(point.x / grid) * grid, y: Math.round(point.y / grid) * grid };
}

export type ComponentMove = { componentId: string; point: Point };

export function moveComponentsWithWaypoints(
  circuit: CircuitDocument,
  moves: ComponentMove[],
  grid: number,
): CircuitDocument {
  const positions = new Map(moves.map((move) => [move.componentId, snap(move.point, grid)]));
  const translations = new Map(
    circuit.components.flatMap((component) => {
      const position = positions.get(component.id);
      return position
        ? [[component.id, { x: position.x - component.x, y: position.y - component.y }] as const]
        : [];
    }),
  );

  return {
    ...circuit,
    components: circuit.components.map((component) => {
      const position = positions.get(component.id);
      if (!position || (component.x === position.x && component.y === position.y)) return component;
      return { ...component, x: position.x, y: position.y };
    }),
    wires: circuit.wires.map((wire) => {
      const fromTranslation = translations.get(wire.from.componentId);
      const toTranslation = translations.get(wire.to.componentId);
      const movesWithGroup =
        fromTranslation &&
        toTranslation &&
        (fromTranslation.x !== 0 || fromTranslation.y !== 0) &&
        fromTranslation.x === toTranslation.x &&
        fromTranslation.y === toTranslation.y &&
        wire.waypoints?.length &&
        positions.has(wire.from.componentId) &&
        positions.has(wire.to.componentId);
      if (!movesWithGroup) return wire;
      return {
        ...wire,
        waypoints: wire.waypoints?.map((waypoint) => ({
          x: waypoint.x + fromTranslation.x,
          y: waypoint.y + fromTranslation.y,
        })),
      };
    }),
  };
}

export type CircuitClipboard = {
  components: LogicComponent[];
  wires: Wire[];
  /** Every definition transitively referenced by a copied subcircuit instance -- see
   * collectReferencedDefinitions. Optional/defaulted to [] so existing callers (and
   * clipboards with no subcircuit instances) don't need to think about it. */
  definitions?: CircuitDefinition[];
};

/**
 * Every CircuitDefinition a subcircuit instance among `components` needs to keep
 * working, followed transitively through nested instances (a definition can itself
 * place another subcircuit instance). Used to make copy/paste of a subcircuit instance
 * bring its definition along -- without this, pasting into a document that doesn't
 * already have that definition (a different tab/project) leaves the pasted instance
 * pointing at a definitionId nobody knows, so it renders as a pin-less "Subcircuito"
 * stub that does nothing (COMPONENT_DEFINITIONS.subcircuit's static fallback).
 */
export function collectReferencedDefinitions(
  components: LogicComponent[],
  allDefinitions: CircuitDefinition[],
): CircuitDefinition[] {
  const byId = new Map(allDefinitions.map((definition) => [definition.id, definition]));
  const collected = new Map<string, CircuitDefinition>();
  const pending = components
    .filter((component) => component.type === 'subcircuit' && component.definitionId)
    .map((component) => component.definitionId!);

  while (pending.length > 0) {
    const id = pending.pop()!;
    if (collected.has(id)) continue;
    const definition = byId.get(id);
    if (!definition) continue; // dangling reference -- tolerated elsewhere too, nothing to bring along
    collected.set(id, definition);
    for (const component of definition.components) {
      if (component.type === 'subcircuit' && component.definitionId) {
        pending.push(component.definitionId);
      }
    }
  }

  return [...collected.values()];
}

// Structural comparison (name excluded -- the user may have legitimately renamed a
// definition without changing what it does) used to tell "this id already in the target
// really is the same definition" apart from "coincidentally the same id, e.g. two
// documents that both auto-generated 'def1'". Good enough for this one-off check; not a
// hot path, so a stringify comparison is simpler than hand-rolling a deep-equal.
function sameDefinitionContent(a: CircuitDefinition, b: CircuitDefinition): boolean {
  return (
    JSON.stringify(a.components) === JSON.stringify(b.components) &&
    JSON.stringify(a.wires) === JSON.stringify(b.wires)
  );
}

export function pasteClipboard(
  circuit: CircuitDocument,
  clipboard: CircuitClipboard,
  offset: Point,
  grid: number,
  existingDefinitions: CircuitDefinition[] = [],
): { circuit: CircuitDocument; selection: Selection; definitions: CircuitDefinition[] } {
  // Same id AND same content already present in the target -- it's the same definition
  // (the common case: pasting within the same document, or pasting the same clipboard
  // again), so just reference it as-is, no duplicate. Only a definition that's genuinely
  // new to the target gets added, keeping its original id so a later paste referencing
  // the same definition recognizes it as already-present too. An id that's taken by a
  // DIFFERENT definition (content differs, or it's simply new but the id is already
  // allocated by something else added earlier in this same paste) falls back to a fresh
  // id via nextDefinitionId.
  const existingById = new Map(
    existingDefinitions.map((definition) => [definition.id, definition]),
  );
  const definitionIdMap = new Map<string, string>();
  const allocatedIds = new Set(existingById.keys());
  const definitionsToAdd: CircuitDefinition[] = [];

  for (const definition of clipboard.definitions ?? []) {
    const existing = existingById.get(definition.id);
    if (existing && sameDefinitionContent(existing, definition)) continue;
    let outputId = definition.id;
    if (allocatedIds.has(outputId)) {
      outputId = nextDefinitionId([...allocatedIds].map((id) => ({ id }) as CircuitDefinition));
      definitionIdMap.set(definition.id, outputId);
    }
    allocatedIds.add(outputId);
    definitionsToAdd.push({ ...definition, id: outputId });
  }

  function withRemappedDefinitionId(component: LogicComponent): LogicComponent {
    if (component.type !== 'subcircuit' || !component.definitionId) return component;
    const remappedId = definitionIdMap.get(component.definitionId);
    return remappedId ? { ...component, definitionId: remappedId } : component;
  }

  const pastedDefinitions: CircuitDefinition[] = definitionsToAdd.map((definition) => ({
    ...definition,
    components: definition.components.map(withRemappedDefinitionId),
  }));

  const nextComponents = [...circuit.components];
  const idMap = new Map<string, string>();

  for (const component of clipboard.components) {
    const newId = nextId(component.type, nextComponents);
    idMap.set(component.id, newId);

    const pasted: LogicComponent = withRemappedDefinitionId({
      ...component,
      id: newId,
      x: snap({ x: component.x + offset.x, y: 0 }, grid).x,
      y: snap({ x: 0, y: component.y + offset.y }, grid).y,
    });
    if (pasted.state !== undefined) pasted.state = false;
    if (pasted.memory !== undefined) pasted.memory = {};
    if (pasted.instanceMemory !== undefined) pasted.instanceMemory = {};

    nextComponents.push(pasted);
  }

  const usedWireIds = new Set(circuit.wires.map((wire) => wire.id));
  const timestamp = Date.now();
  let wireIndex = 0;
  const pastedWires: Wire[] = clipboard.wires
    .filter((wire) => idMap.has(wire.from.componentId) && idMap.has(wire.to.componentId))
    .map((wire) => {
      let id = `W${timestamp}_${wireIndex}`;
      while (usedWireIds.has(id)) {
        wireIndex += 1;
        id = `W${timestamp}_${wireIndex}`;
      }
      usedWireIds.add(id);
      wireIndex += 1;
      return {
        ...wire,
        id,
        from: { ...wire.from, componentId: idMap.get(wire.from.componentId)! },
        to: { ...wire.to, componentId: idMap.get(wire.to.componentId)! },
        waypoints: wire.waypoints?.map((point) => ({
          x: point.x + offset.x,
          y: point.y + offset.y,
        })),
      };
    });

  return {
    circuit: {
      ...circuit,
      components: nextComponents,
      wires: [...circuit.wires, ...pastedWires],
    },
    selection: {
      componentIds: clipboard.components.map((component) => idMap.get(component.id)!),
      wireIds: pastedWires.map((wire) => wire.id),
    },
    definitions: pastedDefinitions,
  };
}

export function nextId(type: GateType, components: LogicComponent[]): string {
  const prefixByType: Record<GateType, string> = {
    input: 'I',
    button: 'P',
    led: 'L',
    and: 'A',
    nand: 'NA',
    or: 'O',
    nor: 'NO',
    xor: 'X',
    xnor: 'XN',
    not: 'N',
    text: 'T',
    'half-adder': 'HS',
    'full-adder': 'FS',
    'mux-2-1': 'M2',
    'mux-4-1': 'M4',
    'decoder-2-4': 'D',
    'comparator-1-bit': 'C',
    'encoder-4-2': 'E',
    'odd-parity-3': 'P',
    'majority-3': 'MJ',
    'half-subtractor': 'HSub',
    'full-subtractor': 'FSub',
    clock: 'CLK',
    'd-latch': 'DL',
    'd-flip-flop': 'DFF',
    'register-4': 'REG',
    'merge-4': 'MG',
    'split-4': 'SP',
    'display-4': 'DISP',
    'bus-in-4': 'BI',
    'adder-4': 'AD4',
    'subtractor-4': 'SB4',
    'comparator-4': 'CP4',
    subcircuit: 'U',
  };
  const prefix = prefixByType[type];
  let index = components.length + 1;
  let id = `${prefix}${index}`;
  const ids = new Set(components.map((component) => component.id));
  while (ids.has(id)) {
    index += 1;
    id = `${prefix}${index}`;
  }
  return id;
}

export function createLogicComponent(
  type: GateType,
  id: string,
  point: Point,
  definitionId?: string,
): LogicComponent {
  return withSequentialDefaults({
    id,
    type,
    x: point.x,
    y: point.y,
    // Left undefined for a subcircuit instance: leaving no fixed label means the
    // rendered name always live-reflects the definition's current name (reference
    // semantics -- renaming a definition should not require touching every instance).
    label: type === 'subcircuit' ? undefined : defaultLabel(type, id),
    state: type === 'input' || type === 'button' ? false : undefined,
    definitionId: type === 'subcircuit' ? definitionId : undefined,
  });
}

export function componentDefinitionLabel(type: GateType): string {
  return COMPONENT_DEFINITIONS[type].label;
}

function defaultLabel(type: GateType, id: string): string {
  if (type === 'input') return id;
  if (type === 'button') return 'Pulso';
  if (type === 'led') return 'LED';
  if (type === 'text') return 'Texto';
  return COMPONENT_DEFINITIONS[type].label;
}

function pinKey(ref: PinRef): string {
  return `${ref.componentId}::${ref.pinId}`;
}

function mintWireId(usedIds: Set<string>): string {
  const timestamp = Date.now();
  let index = 0;
  let id = `W${timestamp}_${index}`;
  while (usedIds.has(id)) {
    index += 1;
    id = `W${timestamp}_${index}`;
  }
  usedIds.add(id);
  return id;
}

export interface ExtractedSubcircuit {
  scope: CircuitDocument;
  definition: CircuitDefinition;
  instanceId: string;
}

/**
 * Extracts a selection of components (plus whatever wires connect them) out of
 * `scope` into a brand-new CircuitDefinition, replacing the selection in `scope`
 * with a single subcircuit instance. Wires crossing the selection boundary get an
 * input/clock or LED marker synthesized inside the new definition (mirroring the
 * type-based pin rule from deriveSubcircuitPins), and get rewired to the new
 * instance's derived pin instead of the original inner component.
 *
 * This relies on a global invariant enforced by isCircuitDocument: every Wire.from
 * is always an output-kind pin and every Wire.to is always an input-kind pin. That
 * lets boundary-wire direction alone (which endpoint is `from` vs `to`) decide
 * whether the inside endpoint needs an input marker or an output marker, with no
 * need to resolve pin kinds here -- this function does not re-validate `scope`,
 * it trusts that invariant already holds.
 */
export function extractSelectionIntoDefinition(
  scope: CircuitDocument,
  componentIds: string[],
  definitionId: string,
  definitionName: string,
  grid: number,
): ExtractedSubcircuit | null {
  const selectedIds = new Set(
    componentIds.filter((id) => scope.components.some((component) => component.id === id)),
  );
  if (selectedIds.size === 0) return null;

  const selectedComponents = scope.components.filter((component) => selectedIds.has(component.id));
  const remainingComponents = scope.components.filter(
    (component) => !selectedIds.has(component.id),
  );
  const componentById = new Map(scope.components.map((component) => [component.id, component]));

  const internalWires: Wire[] = [];
  const externalWires: Wire[] = [];
  // Boundary wire whose `to` is inside: grouped by the outside `from` source, so
  // several wires sharing the same external driver collapse into one marker.
  const inboundGroups = new Map<string, { source: PinRef; targets: PinRef[] }>();
  // Boundary wire whose `from` is inside: grouped by the inside `from` source, so
  // one inside output read by several external destinations shares one marker.
  const outboundGroups = new Map<string, { source: PinRef; wires: Wire[] }>();

  for (const wire of scope.wires) {
    const fromInside = selectedIds.has(wire.from.componentId);
    const toInside = selectedIds.has(wire.to.componentId);
    if (fromInside && toInside) {
      internalWires.push(wire);
    } else if (!fromInside && !toInside) {
      externalWires.push(wire);
    } else if (toInside) {
      const key = pinKey(wire.from);
      const entry = inboundGroups.get(key) ?? { source: wire.from, targets: [] };
      entry.targets.push(wire.to);
      inboundGroups.set(key, entry);
    } else {
      const key = pinKey(wire.from);
      const entry = outboundGroups.get(key) ?? { source: wire.from, wires: [] };
      entry.wires.push(wire);
      outboundGroups.set(key, entry);
    }
  }

  const definitionComponents: LogicComponent[] = [...selectedComponents];
  const definitionWires: Wire[] = [...internalWires];
  const definitionUsedWireIds = new Set(internalWires.map((wire) => wire.id));
  const scopeUsedWireIds = new Set(scope.wires.map((wire) => wire.id));
  const rewrittenBoundaryWires: Wire[] = [];

  const xs = selectedComponents.map((component) => component.x);
  const ys = selectedComponents.map((component) => component.y);
  const minX = Math.min(...xs);
  const maxX = Math.max(...xs);
  const minY = Math.min(...ys);

  const instanceId = nextId('subcircuit', remainingComponents);

  let inputIndex = 0;
  for (const { source, targets } of inboundGroups.values()) {
    const outsideComponent = componentById.get(source.componentId);
    const markerType: GateType = outsideComponent?.type === 'clock' ? 'clock' : 'input';
    const markerId = nextId(markerType, definitionComponents);
    definitionComponents.push(
      createLogicComponent(markerType, markerId, { x: minX - 160, y: minY + inputIndex * 80 }),
    );
    inputIndex += 1;

    const markerOutPin = markerType === 'clock' ? 'CLK' : 'out';
    for (const target of targets) {
      definitionWires.push({
        id: mintWireId(definitionUsedWireIds),
        from: { componentId: markerId, pinId: markerOutPin },
        to: target,
      });
    }

    rewrittenBoundaryWires.push({
      id: mintWireId(scopeUsedWireIds),
      from: source,
      to: { componentId: instanceId, pinId: markerId },
    });
  }

  let outputIndex = 0;
  for (const { source, wires: originalWires } of outboundGroups.values()) {
    const markerId = nextId('led', definitionComponents);
    definitionComponents.push(
      createLogicComponent('led', markerId, { x: maxX + 160, y: minY + outputIndex * 80 }),
    );
    outputIndex += 1;

    definitionWires.push({
      id: mintWireId(definitionUsedWireIds),
      from: source,
      to: { componentId: markerId, pinId: 'in' },
    });

    for (const original of originalWires) {
      rewrittenBoundaryWires.push({
        ...original,
        from: { componentId: instanceId, pinId: markerId },
      });
    }
  }

  const instancePosition = snap(
    {
      x: Math.round(xs.reduce((sum, x) => sum + x, 0) / xs.length),
      y: Math.round(ys.reduce((sum, y) => sum + y, 0) / ys.length),
    },
    grid,
  );
  const instanceComponent = createLogicComponent(
    'subcircuit',
    instanceId,
    instancePosition,
    definitionId,
  );

  return {
    scope: {
      ...scope,
      components: [...remainingComponents, instanceComponent],
      wires: [...externalWires, ...rewrittenBoundaryWires],
    },
    definition: {
      id: definitionId,
      name: definitionName,
      components: definitionComponents,
      wires: definitionWires,
    },
    instanceId,
  };
}

/** Drills one level deeper: double-clicking a subcircuit instance pushes onto the current navigation path. */
export function pushDefinitionPath(path: string[], definitionId: string): string[] {
  return [...path, definitionId];
}

/** Jumps to a breadcrumb segment: index -1 means the root (empty path), index N keeps path[0..N]. */
export function truncateDefinitionPath(path: string[], index: number): string[] {
  return path.slice(0, index + 1);
}
