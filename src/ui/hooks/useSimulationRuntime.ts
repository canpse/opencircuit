import { useEffect, useRef, useState } from 'react';
import type { CircuitDocument, SimulationState, SimulationResult } from '../../core/types';
import SimulationWorker from '../../core/simulation/worker?worker';

export function useSimulationRuntime(circuit: CircuitDocument) {
  const simulationStateRef = useRef<SimulationState | undefined>(undefined);
  const [resetToken, setResetToken] = useState(0);

  const [simulationResult, setSimulationResult] = useState<SimulationResult>({
    values: {},
    state: { values: {}, unstable: false, iterations: 0 },
    unstable: false,
    iterations: 0,
  });

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

    const handleMessage = (e: MessageEvent) => {
      if (e.data.id === id) {
        simulationStateRef.current = e.data.result.state;
        setSimulationResult(e.data.result);
      }
    };

    workerRef.current.addEventListener('message', handleMessage);
    workerRef.current.postMessage({
      id,
      circuit,
      previousState: simulationStateRef.current,
    });

    return () => {
      workerRef.current?.removeEventListener('message', handleMessage);
    };
  }, [circuit, resetToken]);

  function resetSimulationRuntime() {
    simulationStateRef.current = undefined;
    setSimulationResult({
      values: {},
      state: { values: {}, unstable: false, iterations: 0 },
      unstable: false,
      iterations: 0,
    });
    setResetToken((current) => current + 1);
  }

  return {
    simulationResult,
    evaluation: simulationResult.values,
    resetSimulationRuntime,
  };
}
