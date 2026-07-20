const PINS = {
  input: { out: 'output' },
  button: { out: 'output' },
  led: { in: 'input' },
  and: { a: 'input', b: 'input', out: 'output' },
  nand: { a: 'input', b: 'input', out: 'output' },
  or: { a: 'input', b: 'input', out: 'output' },
  nor: { a: 'input', b: 'input', out: 'output' },
  xor: { a: 'input', b: 'input', out: 'output' },
  xnor: { a: 'input', b: 'input', out: 'output' },
  not: { in: 'input', out: 'output' },
  text: {},
  'half-adder': { A: 'input', B: 'input', SUM: 'output', CARRY: 'output' },
  'full-adder': { A: 'input', B: 'input', Cin: 'input', SUM: 'output', Cout: 'output' },
  'mux-2-1': { A: 'input', B: 'input', Sel: 'input', OUT: 'output' },
  'mux-4-1': {
    D0: 'input',
    D1: 'input',
    D2: 'input',
    D3: 'input',
    S0: 'input',
    S1: 'input',
    OUT: 'output',
  },
  'decoder-2-4': { A: 'input', B: 'input', Y0: 'output', Y1: 'output', Y2: 'output', Y3: 'output' },
  'comparator-1-bit': { A: 'input', B: 'input', GT: 'output', EQ: 'output', LT: 'output' },
  'encoder-4-2': { D0: 'input', D1: 'input', D2: 'input', D3: 'input', Y0: 'output', Y1: 'output' },
  'odd-parity-3': { A: 'input', B: 'input', C: 'input', OUT: 'output' },
  'majority-3': { A: 'input', B: 'input', C: 'input', OUT: 'output' },
  'half-subtractor': { A: 'input', B: 'input', DIFF: 'output', BORROW: 'output' },
  'full-subtractor': { A: 'input', B: 'input', Bin: 'input', DIFF: 'output', Bout: 'output' },
  clock: { CLK: 'output' },
  'd-latch': { D: 'input', EN: 'input', Q: 'output' },
  'd-flip-flop': { D: 'input', CLK: 'input', Q: 'output' },
  'register-4': {
    D0: 'input',
    D1: 'input',
    D2: 'input',
    D3: 'input',
    CLK: 'input',
    Q0: 'output',
    Q1: 'output',
    Q2: 'output',
    Q3: 'output',
  },
};

const isRecord = (value) => typeof value === 'object' && value !== null && !Array.isArray(value);
const isFiniteNumber = (value) => typeof value === 'number' && Number.isFinite(value);
const isPinRef = (value) =>
  isRecord(value) &&
  typeof value.componentId === 'string' &&
  value.componentId.length > 0 &&
  typeof value.pinId === 'string' &&
  value.pinId.length > 0;

export function isCircuitDocument(value) {
  if (
    !isRecord(value) ||
    value.version !== 1 ||
    !Array.isArray(value.components) ||
    !Array.isArray(value.wires)
  )
    return false;
  if (value.components.length > 10_000 || value.wires.length > 20_000) return false;

  const components = new Map();
  for (const component of value.components) {
    if (
      !isRecord(component) ||
      typeof component.id !== 'string' ||
      !component.id ||
      component.id.length > 200 ||
      !Object.hasOwn(PINS, component.type) ||
      !isFiniteNumber(component.x) ||
      !isFiniteNumber(component.y) ||
      (component.label !== undefined && typeof component.label !== 'string') ||
      (component.state !== undefined && typeof component.state !== 'boolean') ||
      (component.width !== undefined &&
        (!isFiniteNumber(component.width) || component.width <= 0)) ||
      (component.memory !== undefined &&
        (!isRecord(component.memory) ||
          !Object.values(component.memory).every((item) => typeof item === 'boolean'))) ||
      components.has(component.id)
    )
      return false;
    components.set(component.id, component);
  }

  const wireIds = new Set();
  const connectedInputs = new Set();
  for (const wire of value.wires) {
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
    const source = components.get(wire.from.componentId);
    const target = components.get(wire.to.componentId);
    if (
      !source ||
      !target ||
      PINS[source.type][wire.from.pinId] !== 'output' ||
      PINS[target.type][wire.to.pinId] !== 'input'
    )
      return false;
    const inputKey = `${wire.to.componentId}\0${wire.to.pinId}`;
    if (connectedInputs.has(inputKey)) return false;
    connectedInputs.add(inputKey);
    wireIds.add(wire.id);
  }
  return true;
}
