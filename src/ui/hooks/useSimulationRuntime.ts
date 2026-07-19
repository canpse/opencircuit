import { useEffect, useRef, useState } from 'react';
import type { CircuitDocument, SimulationResult } from '../../core/types';
import type {
  SimulationRequest,
  SimulationResponse,
} from '../../core/simulation/simulationSession';
import SimulationWorker from '../../core/simulation/worker?worker';

const EMPTY_RESULT: SimulationResult = {
  values: {},
  state: { values: {}, unstable: false, iterations: 0 },
  unstable: false,
  iterations: 0,
};

export function useSimulationRuntime(circuit: CircuitDocument) {
  const [resetToken, setResetToken] = useState(0);
  const [simulationResult, setSimulationResult] = useState<SimulationResult>(EMPTY_RESULT);

  const workerRef = useRef<Worker | null>(null);
  const messageIdRef = useRef(0);

  useEffect(() => {
    workerRef.current = new SimulationWorker();
    return () => {
      workerRef.current?.terminate();
      workerRef.current = null;
    };
  }, []);

  useEffect(() => {
    if (!workerRef.current) return;

    const id = ++messageIdRef.current;

    const handleMessage = (e: MessageEvent<SimulationResponse>) => {
      if (e.data.id === id) {
        setSimulationResult(e.data.result);
      }
    };

    workerRef.current.addEventListener('message', handleMessage);
    const request: SimulationRequest = { type: 'simulate', id, circuit };
    workerRef.current.postMessage(request);

    return () => {
      workerRef.current?.removeEventListener('message', handleMessage);
    };
  }, [circuit, resetToken]);

  function resetSimulationRuntime() {
    const request: SimulationRequest = { type: 'reset' };
    workerRef.current?.postMessage(request);
    setSimulationResult(EMPTY_RESULT);
    setResetToken((current) => current + 1);
  }

  return {
    simulationResult,
    evaluation: simulationResult.values,
    resetSimulationRuntime,
  };
}
