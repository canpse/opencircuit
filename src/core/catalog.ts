import type {
  CircuitDefinition,
  ComponentDefinition,
  GateType,
  LogicComponent,
  PinDefinition,
  PinRef,
  Point,
} from './types';
import { getContractPin } from './componentContract';

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

type PinSpec = string | { id: string; width: number };

function pinSpecId(spec: PinSpec): string {
  return typeof spec === 'string' ? spec : spec.id;
}

function pinSpecWidth(spec: PinSpec): number | undefined {
  return typeof spec === 'string' ? undefined : spec.width;
}

function block(
  type: GateType,
  label: string,
  inputs: PinSpec[],
  outputs: PinSpec[],
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
      ...inputs.map((spec, index): PinDefinition => ({
        id: pinSpecId(spec),
        kind: 'input',
        label: pinSpecId(spec),
        offset: { x: 0, y: pinY(inputs.length, index) },
        width: pinSpecWidth(spec),
      })),
      ...outputs.map((spec, index): PinDefinition => ({
        id: pinSpecId(spec),
        kind: 'output',
        label: pinSpecId(spec),
        offset: { x: width, y: pinY(outputs.length, index) },
        width: pinSpecWidth(spec),
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
  'merge-4': block('merge-4', 'Merge 4', ['I0', 'I1', 'I2', 'I3'], [{ id: 'OUT', width: 4 }], 140),
  'split-4': block('split-4', 'Split 4', [{ id: 'IN', width: 4 }], ['O0', 'O1', 'O2', 'O3'], 140),
  'display-4': block('display-4', 'Display 4', [{ id: 'IN', width: 4 }], [], 120),
  'bus-in-4': block('bus-in-4', 'Bus In 4', [], [{ id: 'OUT', width: 4 }], 110),
  'adder-4': block(
    'adder-4',
    'Somador 4 bits',
    [{ id: 'A', width: 4 }, { id: 'B', width: 4 }, 'Cin'],
    [{ id: 'SUM', width: 4 }, 'Cout'],
    170,
  ),
  'subtractor-4': block(
    'subtractor-4',
    'Subtrator 4 bits',
    [{ id: 'A', width: 4 }, { id: 'B', width: 4 }, 'Bin'],
    [{ id: 'DIFF', width: 4 }, 'Bout'],
    170,
  ),
  'comparator-4': block(
    'comparator-4',
    'Comparador 4 bits',
    [
      { id: 'A', width: 4 },
      { id: 'B', width: 4 },
    ],
    ['GT', 'EQ', 'LT'],
    170,
  ),
  // Static fallback only: a subcircuit instance's real pins are derived dynamically
  // from its definition by resolveComponentDefinition/deriveSubcircuitDefinition below.
  // This entry exists purely so COMPONENT_DEFINITIONS stays exhaustive over GateType.
  subcircuit: {
    type: 'subcircuit',
    label: 'Subcircuito',
    width: 140,
    height: 74,
    pins: [],
  },
};

const SUBCIRCUIT_DEFAULT_WIDTH = 140;

/**
 * Derives a subcircuit definition's boundary pins from its internal components/wires.
 * Both rules are type-based and unconditional (internal wiring never changes which
 * pins exist, only what drives/reads them) -- explicit marker components, symmetric in
 * both directions:
 *
 * Rule 1 (input): every input/clock/bus-in-4 component inside the definition becomes
 * an input pin. `input`/`clock` are the only two scalar GateTypes with no input pin of
 * their own (pure sources); `bus-in-4` is their width-4 counterpart, same idea, so all
 * three are the natural "external driver enters here" marker.
 *
 * Rule 2 (output): every LED or Display 4 component inside the definition becomes an
 * output pin, sourced from whatever drives that component's `in`/`IN` pin internally.
 * LED/Display are the natural "expose this value" markers: they're already the
 * simulator's dedicated terminal/display components, so reusing them avoids a "forgot
 * to wire this" gate output accidentally becoming a pin, and reads immediately as "this
 * is a boundary output" when authoring a definition.
 */
export function deriveSubcircuitPins(definition: CircuitDefinition): PinDefinition[] {
  const ordered = [...definition.components].sort((a, b) => a.y - b.y || a.x - b.x);

  const inputs: Array<{ id: string; label: string; width?: number }> = ordered
    .filter(
      (component) =>
        component.type === 'input' || component.type === 'clock' || component.type === 'bus-in-4',
    )
    .map((component) => ({
      id: component.id,
      label: component.label ?? component.id,
      width: component.type === 'bus-in-4' ? 4 : undefined,
    }));

  const outputs: Array<{ id: string; label: string; width?: number }> = ordered
    .filter((component) => component.type === 'led' || component.type === 'display-4')
    .map((component) => ({
      id: component.id,
      label: component.label ?? component.id,
      width: component.type === 'display-4' ? 4 : undefined,
    }));

  const height = Math.max(74, Math.max(inputs.length, outputs.length, 1) * 24 + 22);
  const pinY = (count: number, index: number) => height / 2 - ((count - 1) * 24) / 2 + index * 24;

  return [
    ...inputs.map((pin, index): PinDefinition => ({
      id: pin.id,
      kind: 'input',
      label: pin.label,
      offset: { x: 0, y: pinY(inputs.length, index) },
      width: pin.width,
    })),
    ...outputs.map((pin, index): PinDefinition => ({
      id: pin.id,
      kind: 'output',
      label: pin.label,
      offset: { x: SUBCIRCUIT_DEFAULT_WIDTH, y: pinY(outputs.length, index) },
      width: pin.width,
    })),
  ];
}

const derivedDefinitionCache = new WeakMap<CircuitDefinition, ComponentDefinition>();
// Reentrancy guard: breaks infinite recursion if two definitions reference each other
// (directly or indirectly). A cyclic occurrence resolves to a pin-less stub instead of
// hanging: the authoritative cycle guard for simulation lives in flattenCircuit.
const definitionsBeingDerived = new Set<CircuitDefinition>();

export function deriveSubcircuitDefinition(definition: CircuitDefinition): ComponentDefinition {
  const cached = derivedDefinitionCache.get(definition);
  if (cached) return cached;
  if (definitionsBeingDerived.has(definition)) {
    return {
      type: 'subcircuit',
      label: definition.name,
      width: SUBCIRCUIT_DEFAULT_WIDTH,
      height: 74,
      pins: [],
    };
  }
  definitionsBeingDerived.add(definition);
  try {
    const pins = deriveSubcircuitPins(definition);
    const inputCount = pins.filter((pin) => pin.kind === 'input').length;
    const outputCount = pins.filter((pin) => pin.kind === 'output').length;
    const height = Math.max(74, Math.max(inputCount, outputCount, 1) * 24 + 22);
    const result: ComponentDefinition = {
      type: 'subcircuit',
      label: definition.name,
      width: SUBCIRCUIT_DEFAULT_WIDTH,
      height,
      pins,
    };
    derivedDefinitionCache.set(definition, result);
    return result;
  } finally {
    definitionsBeingDerived.delete(definition);
  }
}

export function resolveComponentDefinition(
  component: LogicComponent,
  definitions?: CircuitDefinition[],
): ComponentDefinition {
  if (component.type !== 'subcircuit') return COMPONENT_DEFINITIONS[component.type];
  const definition = definitions?.find((candidate) => candidate.id === component.definitionId);
  if (!definition) return COMPONENT_DEFINITIONS.subcircuit;
  return deriveSubcircuitDefinition(definition);
}

export function getPins(
  component: LogicComponent,
  definitions?: CircuitDefinition[],
): PinDefinition[] {
  return resolveComponentDefinition(component, definitions).pins;
}

export function getPin(
  component: LogicComponent,
  pinId: string,
  definitions?: CircuitDefinition[],
): PinDefinition | undefined {
  return getPins(component, definitions).find((pin) => pin.id === pinId);
}

export function getPinPosition(
  component: LogicComponent,
  pinId: string,
  definitions?: CircuitDefinition[],
): Point {
  const pin = getPin(component, pinId, definitions);
  if (!pin) return { x: component.x, y: component.y };
  return { x: component.x + pin.offset.x, y: component.y + pin.offset.y };
}

export function getPinKind(
  component: LogicComponent,
  pinId: string,
  definitions?: CircuitDefinition[],
) {
  if (component.type !== 'subcircuit') return getContractPin(component.type, pinId)?.kind;
  return getPin(component, pinId, definitions)?.kind;
}

export function getPinWidth(
  component: LogicComponent,
  pinId: string,
  definitions?: CircuitDefinition[],
): number {
  if (component.type !== 'subcircuit') return getContractPin(component.type, pinId)?.width ?? 1;
  return getPin(component, pinId, definitions)?.width ?? 1;
}

export function samePin(a: PinRef, b: PinRef): boolean {
  return a.componentId === b.componentId && a.pinId === b.pinId;
}
