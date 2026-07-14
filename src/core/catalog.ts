import type {
  ComponentDefinition,
  GateType,
  LogicComponent,
  PinDefinition,
  PinRef,
  Point,
} from './types';

function twoInputGate(type: GateType, label: string, width = 92): ComponentDefinition {
  return {
    type,
    label,
    width,
    height: 70,
    pins: [
      { id: 'a', kind: 'input', label: 'A', offset: { x: 0, y: 22 } },
      { id: 'b', kind: 'input', label: 'B', offset: { x: 0, y: 48 } },
      { id: 'out', kind: 'output', label: 'out', offset: { x: width, y: 35 } },
    ],
  };
}

function block(
  type: GateType,
  label: string,
  inputs: string[],
  outputs: string[],
  width = 140,
): ComponentDefinition {
  const height = Math.max(74, Math.max(inputs.length, outputs.length) * 24 + 22);
  const pinY = (count: number, index: number) => height / 2 - ((count - 1) * 24) / 2 + index * 24;
  return {
    type,
    label,
    width,
    height,
    pins: [
      ...inputs.map((id, index): PinDefinition => ({
        id,
        kind: 'input',
        label: id,
        offset: { x: 0, y: pinY(inputs.length, index) },
      })),
      ...outputs.map((id, index): PinDefinition => ({
        id,
        kind: 'output',
        label: id,
        offset: { x: width, y: pinY(outputs.length, index) },
      })),
    ],
  };
}

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
  and: twoInputGate('and', 'AND'),
  nand: twoInputGate('nand', 'NAND', 104),
  or: twoInputGate('or', 'OR'),
  nor: twoInputGate('nor', 'NOR'),
  xor: twoInputGate('xor', 'XOR'),
  xnor: twoInputGate('xnor', 'XNOR', 104),
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
  text: {
    type: 'text',
    label: 'Texto',
    width: 150,
    height: 52,
    pins: [],
  },
  'half-adder': block('half-adder', 'Meio Somador', ['A', 'B'], ['SUM', 'CARRY'], 150),
  'full-adder': block('full-adder', 'Somador Completo', ['A', 'B', 'Cin'], ['SUM', 'Cout'], 170),
  'mux-2-1': block('mux-2-1', 'MUX 2:1', ['A', 'B', 'Sel'], ['OUT'], 140),
  'mux-4-1': block('mux-4-1', 'MUX 4:1', ['D0', 'D1', 'D2', 'D3', 'S0', 'S1'], ['OUT'], 160),
  'decoder-2-4': block('decoder-2-4', 'Decod. 2→4', ['A', 'B'], ['Y0', 'Y1', 'Y2', 'Y3'], 160),
  'comparator-1-bit': block(
    'comparator-1-bit',
    'Comparador 1 bit',
    ['A', 'B'],
    ['GT', 'EQ', 'LT'],
    170,
  ),
  'encoder-4-2': block('encoder-4-2', 'Encoder 4→2', ['D0', 'D1', 'D2', 'D3'], ['Y0', 'Y1'], 150),
  'odd-parity-3': block('odd-parity-3', 'Paridade Ímpar', ['A', 'B', 'C'], ['OUT'], 160),
  'majority-3': block('majority-3', 'Maioria 3 bits', ['A', 'B', 'C'], ['OUT'], 160),
  'half-subtractor': block(
    'half-subtractor',
    'Meio Subtrator',
    ['A', 'B'],
    ['DIFF', 'BORROW'],
    160,
  ),
  'full-subtractor': block(
    'full-subtractor',
    'Subtrator Completo',
    ['A', 'B', 'Bin'],
    ['DIFF', 'Bout'],
    180,
  ),
  clock: block('clock', 'Clock', [], ['CLK'], 110),
  'd-latch': block('d-latch', 'Latch D', ['D', 'EN'], ['Q'], 130),
  'd-flip-flop': block('d-flip-flop', 'Flip-Flop D', ['D', 'CLK'], ['Q'], 150),
  'register-4': block(
    'register-4',
    'Registrador 4 bits',
    ['D0', 'D1', 'D2', 'D3', 'CLK'],
    ['Q0', 'Q1', 'Q2', 'Q3'],
    180,
  ),
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
