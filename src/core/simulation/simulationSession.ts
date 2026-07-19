import { simulateCircuit } from './simulate';
import type { CircuitDocument, SimulationResult, SimulationState } from '../types';

export type SimulationRequest =
  { type: 'simulate'; id: number; circuit: CircuitDocument } | { type: 'reset' };

export type SimulationResponse = {
  id: number;
  result: SimulationResult;
};

// O estado da simulação vive aqui, do lado do worker: como as mensagens são
// processadas em ordem, cada simulação parte do estado da anterior mesmo que
// as respostas cheguem à thread principal depois de novos pedidos (issue #10).
export function createSimulationSession() {
  let previousState: SimulationState | undefined;

  return {
    handle(request: SimulationRequest): SimulationResponse | null {
      if (request.type === 'reset') {
        previousState = undefined;
        return null;
      }
      const result = simulateCircuit(request.circuit, previousState);
      previousState = result.state;
      return { id: request.id, result };
    },
  };
}
