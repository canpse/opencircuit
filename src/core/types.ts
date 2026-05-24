export type GateType =
  | 'input' | 'button' | 'led' | 'and' | 'nand' | 'or' | 'nor' | 'xor' | 'xnor' | 'not' | 'text'
  | 'half-adder' | 'full-adder' | 'mux-2-1' | 'mux-4-1' | 'decoder-2-4' | 'comparator-1-bit'
  | 'encoder-4-2' | 'odd-parity-3' | 'majority-3' | 'half-subtractor' | 'full-subtractor'
  | 'clock' | 'd-latch' | 'd-flip-flop';
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
}

export interface PinRef {
  componentId: string;
  pinId: string;
}

export interface Wire {
  id: string;
  from: PinRef;
  to: PinRef;
}

export interface CircuitDocument {
  version: 1;
  components: LogicComponent[];
  wires: Wire[];
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
