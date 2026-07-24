import { useEffect, useRef, useState } from 'react';
import type { CircuitDefinition, CircuitDocument, SimulationResult } from '../../core/types';
import type {
  SimulationRequest,
  SimulationResponse,
} from '../../core/simulation/simulationSession';
import SimulationWorker from '../../core/simulation/worker?worker';
import { flattenCircuit } from '../../core/hierarchy/flatten';
import { liftEvaluationForScope } from '../../core/hierarchy/simulate';

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

export function useSimulationRuntime(
  circuit: CircuitDocument,
  tick: number,
  definitions: CircuitDefinition[],
) {
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

    // A hierarquia é achatada aqui, no main thread, antes de postar pro worker —
    // o worker/simulationSession/motor de simulação continuam inalterados, sempre
    // vendo um CircuitDocument flat. `nodes` (de flattenCircuit) fica preso ao
    // mesmo closure que circuit/tick: mesmo que o circuito ou a contagem de ticks
    // já tenham avançado por fora (ex.: o próximo tick do clock automático
    // disparou antes deste render comitar), o trio gravado aqui continua sendo
    // exatamente o que gerou esta resposta — sem reler estado externo que pode
    // já ter mudado.
    const { flat, nodes } = flattenCircuit(circuit, definitions);

    const handleMessage = (e: MessageEvent<SimulationResponse>) => {
      if (e.data.id === id) {
        const liftedValues = liftEvaluationForScope(nodes, e.data.result.values);
        setSimulationState({ result: { ...e.data.result, values: liftedValues }, circuit, tick });
      }
    };

    workerRef.current.addEventListener('message', handleMessage);
    const request: SimulationRequest = { type: 'simulate', id, circuit: flat };
    workerRef.current.postMessage(request);

    return () => {
      workerRef.current?.removeEventListener('message', handleMessage);
    };
  }, [circuit, tick, resetToken, definitions]);

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
