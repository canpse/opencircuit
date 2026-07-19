import { createSimulationSession } from './simulationSession';
import type { SimulationRequest } from './simulationSession';

export type { SimulationRequest, SimulationResponse } from './simulationSession';

const session = createSimulationSession();

self.onmessage = (e: MessageEvent<SimulationRequest>) => {
  const response = session.handle(e.data);
  if (response) {
    self.postMessage(response);
  }
};
