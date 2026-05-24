import { useEffect } from 'react';
import type { CircuitDocument } from '../../core/types';
import { saveCircuit } from '../../state/storage';

export function useAutoSaveCircuit(circuit: CircuitDocument) {
  useEffect(() => {
    saveCircuit(circuit);
  }, [circuit]);
}
