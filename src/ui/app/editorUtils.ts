import { COMPONENT_DEFINITIONS } from '../../core/catalog';
import { withSequentialDefaults } from '../../core/evaluateCircuit';
import type { CircuitDocument, GateType, LogicComponent, Point, Wire } from '../../core/types';
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

export function cloneCircuit(circuit: CircuitDocument): CircuitDocument {
  return {
    version: circuit.version,
    components: circuit.components.map((component) => ({
      ...component,
      memory: component.memory ? { ...component.memory } : undefined,
    })),
    wires: circuit.wires.map((wire) => ({
      ...wire,
      from: { ...wire.from },
      to: { ...wire.to },
      waypoints: wire.waypoints?.map((point) => ({ ...point })),
    })),
  };
}

export function normalizeCircuitForEditor(circuit: CircuitDocument): CircuitDocument {
  return {
    ...cloneCircuit(circuit),
    components: circuit.components.map((component) =>
      withSequentialDefaults({
        ...component,
        memory: component.memory ? { ...component.memory } : undefined,
      }),
    ),
  };
}

export function hasSelection(selection: Selection): boolean {
  return selection.componentIds.length > 0 || selection.wireIds.length > 0;
}

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

export type CircuitClipboard = { components: LogicComponent[]; wires: Wire[] };

export function pasteClipboard(
  circuit: CircuitDocument,
  clipboard: CircuitClipboard,
  offset: Point,
  grid: number,
): { circuit: CircuitDocument; selection: Selection } {
  const nextComponents = [...circuit.components];
  const idMap = new Map<string, string>();

  for (const component of clipboard.components) {
    const newId = nextId(component.type, nextComponents);
    idMap.set(component.id, newId);

    const pasted: LogicComponent = {
      ...component,
      id: newId,
      x: snap({ x: component.x + offset.x, y: 0 }, grid).x,
      y: snap({ x: 0, y: component.y + offset.y }, grid).y,
    };
    if (pasted.state !== undefined) pasted.state = false;
    if (pasted.memory !== undefined) pasted.memory = {};

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

export function createLogicComponent(type: GateType, id: string, point: Point): LogicComponent {
  return withSequentialDefaults({
    id,
    type,
    x: point.x,
    y: point.y,
    label: defaultLabel(type, id),
    state: type === 'input' || type === 'button' ? false : undefined,
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
