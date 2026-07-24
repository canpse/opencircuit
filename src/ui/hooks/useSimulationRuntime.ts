import { useEffect, useRef, useState } from 'react';
import type { CircuitDocument, SimulationResult } from '../../core/types';
import type {
  SimulationRequest,
  SimulationResponse,
} from '../../core/simulation/simulationSession';
import SimulationWorker from '../../core/simulation/worker?worker';

export const EMPTY_SIMULATION_RESULT: SimulationResult = {
  values: {},
  state: { values: {}, unstable: false, iterations: 0 },
  unstable: false,
  iterations: 0,
};

interface SimulationState {
  result: SimulationResult;
  circuit: CircuitDocument;
  tick: number;
}

export function useSimulationRuntime(circuit: CircuitDocument, tick: number) {
  const [resetToken, setResetToken] = useState(0);
  const [simulationState, setSimulationState] = useState<SimulationState>({
    result: EMPTY_SIMULATION_RESULT,
    circuit,
    tick,
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

    // circuit/tick ficam presos ao closure desta requisição: mesmo que o
    // circuito ou a contagem de ticks já tenham avançado por fora (ex.: o
    // próximo tick do clock automático disparou antes deste render
    // comitar), o par gravado aqui continua sendo exatamente o que gerou
    // esta resposta — sem reler estado externo que pode já ter mudado.
    const handleMessage = (e: MessageEvent<SimulationResponse>) => {
      if (e.data.id === id) {
        setSimulationState({ result: e.data.result, circuit, tick });
      }
    };

    workerRef.current.addEventListener('message', handleMessage);
    const request: SimulationRequest = { type: 'simulate', id, circuit };
    workerRef.current.postMessage(request);

    return () => {
      workerRef.current?.removeEventListener('message', handleMessage);
    };
  }, [circuit, tick, resetToken]);

  function resetSimulationRuntime() {
    const request: SimulationRequest = { type: 'reset' };
    workerRef.current?.postMessage(request);
    setSimulationState({ result: EMPTY_SIMULATION_RESULT, circuit, tick });
    setResetToken((current) => current + 1);
  }

  return {
    simulationResult: simulationState.result,
    evaluation: simulationState.result.values,
    simulationCircuit: simulationState.circuit,
    simulationTick: simulationState.tick,
    resetSimulationRuntime,
  };
}
