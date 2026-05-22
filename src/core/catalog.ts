import type { ComponentDefinition, GateType, LogicComponent, PinDefinition, PinRef, Point } from './types';

export const COMPONENT_DEFINITIONS: Record<GateType, ComponentDefinition> = {
  input: {
    type: 'input',
    label: 'Input',
    width: 86,
    height: 52,
    pins: [{ id: 'out', kind: 'output', label: 'out', offset: { x: 86, y: 26 } }],
  },
  button: {
    type: 'button',
    label: 'Pulso',
    width: 86,
    height: 52,
    pins: [{ id: 'out', kind: 'output', label: 'out', offset: { x: 86, y: 26 } }],
  },
  led: {
    type: 'led',
    label: 'LED',
    width: 78,
    height: 52,
    pins: [{ id: 'in', kind: 'input', label: 'in', offset: { x: 0, y: 26 } }],
  },
  and: {
    type: 'and',
    label: 'AND',
    width: 92,
    height: 70,
    pins: [
      { id: 'a', kind: 'input', label: 'A', offset: { x: 0, y: 22 } },
      { id: 'b', kind: 'input', label: 'B', offset: { x: 0, y: 48 } },
      { id: 'out', kind: 'output', label: 'out', offset: { x: 92, y: 35 } },
    ],
  },
  or: {
    type: 'or',
    label: 'OR',
    width: 92,
    height: 70,
    pins: [
      { id: 'a', kind: 'input', label: 'A', offset: { x: 0, y: 22 } },
      { id: 'b', kind: 'input', label: 'B', offset: { x: 0, y: 48 } },
      { id: 'out', kind: 'output', label: 'out', offset: { x: 92, y: 35 } },
    ],
  },
  not: {
    type: 'not',
    label: 'NOT',
    width: 82,
    height: 56,
    pins: [
      { id: 'in', kind: 'input', label: 'in', offset: { x: 0, y: 28 } },
      { id: 'out', kind: 'output', label: 'out', offset: { x: 82, y: 28 } },
    ],
  },
};

export function getPins(component: LogicComponent): PinDefinition[] {
  return COMPONENT_DEFINITIONS[component.type].pins;
}

export function getPin(component: LogicComponent, pinId: string): PinDefinition | undefined {
  return getPins(component).find((pin) => pin.id === pinId);
}

export function getPinPosition(component: LogicComponent, pinId: string): Point {
  const pin = getPin(component, pinId);
  if (!pin) return { x: component.x, y: component.y };
  return { x: component.x + pin.offset.x, y: component.y + pin.offset.y };
}

export function getPinKind(component: LogicComponent, pinId: string) {
  return getPin(component, pinId)?.kind;
}

export function samePin(a: PinRef, b: PinRef): boolean {
  return a.componentId === b.componentId && a.pinId === b.pinId;
}
