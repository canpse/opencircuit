import { useMemo, useRef, useState } from 'react';
import { simulateCircuit } from '../../core/evaluateCircuit';
import type { CircuitDocument, SimulationState } from '../../core/types';

export function useSimulationRuntime(circuit: CircuitDocument) {
  const simulationStateRef = useRef<SimulationState | undefined>(undefined);
  const [resetToken, setResetToken] = useState(0);

  const simulationResult = useMemo(() => {
    // eslint-disable-next-line react-hooks/refs
    const result = simulateCircuit(circuit, simulationStateRef.current);
    // eslint-disable-next-line react-hooks/refs
    simulationStateRef.current = result.state;
    return result;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [circuit, resetToken]);

  function resetSimulationRuntime() {
    simulationStateRef.current = undefined;
    setResetToken((current) => current + 1);
  }

  return {
    simulationResult,
    evaluation: simulationResult.values,
    resetSimulationRuntime,
  };
}
