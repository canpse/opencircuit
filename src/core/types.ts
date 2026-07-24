export type GateType =
  | 'input'
  | 'button'
  | 'led'
  | 'and'
  | 'nand'
  | 'or'
  | 'nor'
  | 'xor'
  | 'xnor'
  | 'not'
  | 'text'
  | 'half-adder'
  | 'full-adder'
  | 'mux-2-1'
  | 'mux-4-1'
  | 'decoder-2-4'
  | 'comparator-1-bit'
  | 'encoder-4-2'
  | 'odd-parity-3'
  | 'majority-3'
  | 'half-subtractor'
  | 'full-subtractor'
  | 'clock'
  | 'd-latch'
  | 'd-flip-flop'
  | 'register-4'
  | 'subcircuit';
export type LogicValue = boolean;
export type PinKind = 'input' | 'output';

export interface Point {
  x: number;
  y: number;
}

export interface LogicComponent {
  id: string;
  type: GateType;
  x: number;
  y: number;
  label?: string;
  state?: boolean;
  width?: number;
  memory?: Record<string, boolean>;
  /** Only meaningful when type === 'subcircuit': id of the CircuitDefinition this instance renders/simulates. */
  definitionId?: string;
  /**
   * Only meaningful when type === 'subcircuit'. Per-instance sequential state for
   * components inside the referenced definition, keyed by dotted path relative to
   * this instance (e.g. "G1" or "SUB2.G1" for a nested instance) — NOT stored on the
   * shared definition template, since every instance needs independent state.
   */
  instanceMemory?: Record<string, Record<string, boolean>>;
}

export interface PinRef {
  componentId: string;
  pinId: string;
}

export interface Wire {
  id: string;
  from: PinRef;
  to: PinRef;
  display?: 'wire' | 'tunnel';
  label?: string;
  waypoints?: Point[];
}

/** A named, reusable circuit graph that can be instantiated as a 'subcircuit' component. */
export interface CircuitDefinition {
  id: string;
  name: string;
  components: LogicComponent[];
  wires: Wire[];
}

export interface CircuitDocument {
  version: 1;
  components: LogicComponent[];
  wires: Wire[];
  definitions?: CircuitDefinition[];
}

export interface PinDefinition {
  id: string;
  kind: PinKind;
  label: string;
  offset: Point;
}

export interface ComponentDefinition {
  type: GateType;
  label: string;
  width: number;
  height: number;
  pins: PinDefinition[];
}

export type EvaluationResult = Record<string, Record<string, LogicValue>>;

export interface SimulationState {
  values: EvaluationResult;
  unstable: boolean;
  iterations: number;
}

export interface SimulationResult {
  values: EvaluationResult;
  state: SimulationState;
  unstable: boolean;
  iterations: number;
}
