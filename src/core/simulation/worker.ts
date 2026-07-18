import { simulateCircuit } from './simulate';
import type { CircuitDocument, SimulationState } from '../types';

export type SimulationRequest = {
  id: number;
  circuit: CircuitDocument;
  previousState: SimulationState | undefined;
};

self.onmessage = (e: MessageEvent<SimulationRequest>) => {
  const { id, circuit, previousState } = e.data;
  const result = simulateCircuit(circuit, previousState);
  self.postMessage({ id, result });
};
