import type { CircuitDocument } from '../core/types';

const STORAGE_KEY = 'opencircuit.logic.document.v1';

export const STARTER_CIRCUIT: CircuitDocument = {
  version: 1,
  components: [
    { id: 'A', type: 'input', x: 80, y: 90, label: 'A', state: true },
    { id: 'B', type: 'input', x: 80, y: 180, label: 'B', state: false },
    { id: 'G1', type: 'and', x: 250, y: 115, label: 'AND' },
    { id: 'L1', type: 'led', x: 430, y: 124, label: 'Saída' },
  ],
  wires: [
    { id: 'W1', from: { componentId: 'A', pinId: 'out' }, to: { componentId: 'G1', pinId: 'a' } },
    { id: 'W2', from: { componentId: 'B', pinId: 'out' }, to: { componentId: 'G1', pinId: 'b' } },
    { id: 'W3', from: { componentId: 'G1', pinId: 'out' }, to: { componentId: 'L1', pinId: 'in' } },
  ],
};

export function loadCircuit(): CircuitDocument {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return STARTER_CIRCUIT;

  try {
    const parsed = JSON.parse(raw) as CircuitDocument;
    if (parsed.version === 1 && Array.isArray(parsed.components) && Array.isArray(parsed.wires)) {
      return parsed;
    }
  } catch {
    // Fall back to starter circuit.
  }

  return STARTER_CIRCUIT;
}

export function downloadJson(filename: string, data: unknown): void {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}
