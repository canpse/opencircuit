import type { CircuitDocument, LogicComponent, PinKind } from './types';

export type BoundaryPinSpec = {
  kind: PinKind;
  width: number;
};

export function getBoundaryPinSpec(component: unknown): BoundaryPinSpec | null;
export function resolvePinKind(
  component: LogicComponent,
  pinId: string,
  definitionsById: ReadonlyMap<string, unknown>,
): PinKind | undefined;
export function resolvePinWidth(
  component: LogicComponent,
  pinId: string,
  definitionsById: ReadonlyMap<string, unknown>,
): number;
export function validateScope(
  components: unknown,
  wires: unknown,
  definitionsById?: ReadonlyMap<string, unknown>,
): boolean;
export function isCircuitDocument(value: unknown): value is CircuitDocument;
