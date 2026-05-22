export type GateType = 'input' | 'button' | 'led' | 'and' | 'or' | 'not';
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
