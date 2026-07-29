import { isCircuitDocument as validateCircuitDocument } from '../src/core/documentValidation.mjs';

export { resolvePinKind, resolvePinWidth, validateScope } from '../src/core/documentValidation.mjs';

/** @param {unknown} value @returns {value is import('../src/core/types.js').CircuitDocument} */
export function isCircuitDocument(value) {
  return validateCircuitDocument(value);
}
