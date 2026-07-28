import { isCircuitDocument as validateCircuitDocument } from './documentValidation.mjs';
import type { CircuitDocument } from './types';

export function isCircuitDocument(value: unknown): value is CircuitDocument {
  return validateCircuitDocument(value);
}
