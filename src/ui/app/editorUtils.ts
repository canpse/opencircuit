import { COMPONENT_DEFINITIONS } from '../../core/catalog';
import { withSequentialDefaults } from '../../core/evaluateCircuit';
import type { CircuitDocument, GateType, LogicComponent, Point } from '../../core/types';
import type { Selection } from '../context-menu/ContextMenuView';
import type { WireStyle } from '../editor/CircuitCanvas';

export function loadWireStyle(storageKey: string): WireStyle {
  const stored = localStorage.getItem(storageKey);
  return stored === 'bezier' ? 'bezier' : 'orthogonal';
}

export function cloneCircuit(circuit: CircuitDocument): CircuitDocument {
  return {
    version: circuit.version,
    components: circuit.components.map((component) => ({
      ...component,
      memory: component.memory ? { ...component.memory } : undefined,
    })),
    wires: circuit.wires.map((wire) => ({
      id: wire.id,
      from: { ...wire.from },
      to: { ...wire.to },
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
