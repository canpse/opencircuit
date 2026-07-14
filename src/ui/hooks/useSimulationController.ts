import { useCallback, useState } from 'react';
import type { CircuitDocument } from '../../core/types';
import { isSequentialType, stepCircuit } from '../../core/evaluateCircuit';
import { useSimulationRuntime } from './useSimulationRuntime';
import { useAutoClock } from './useAutoClock';
import type { SetStateAction } from 'react';

interface Options {
  circuit: CircuitDocument;
  setCircuit: (action: SetStateAction<CircuitDocument>) => void;
  rememberCircuit: () => void;
  onMessage: (message: string) => void;
}

export function useSimulationController({
  circuit,
  setCircuit,
  rememberCircuit,
  onMessage,
}: Options) {
  const [autoClockRunning, setAutoClockRunning] = useState(false);
  const [autoClockIntervalMs, setAutoClockIntervalMs] = useState(500);

  const { simulationResult, evaluation, resetSimulationRuntime } = useSimulationRuntime(circuit);

  const hasSequentialComponents = circuit.components.some((component) =>
    isSequentialType(component.type),
  );

  const autoClockTick = useCallback(() => {
    setCircuit((current) => stepCircuit(current));
  }, [setCircuit]);

  useAutoClock({
    running: autoClockRunning,
    intervalMs: autoClockIntervalMs,
    onTick: autoClockTick,
  });

  function circuitCanTick() {
    return circuit.components.some((component) => isSequentialType(component.type));
  }

  function tickSequentialCircuit() {
    if (!circuitCanTick()) {
      onMessage('Adicione Clock, Latch D ou Flip-Flop D para usar Tick.');
      return;
    }
    rememberCircuit();
    setCircuit((current) => stepCircuit(current));
    onMessage('Tick: tempo sequencial avançado.');
  }

  function toggleAutoClock() {
    if (!autoClockRunning && !circuitCanTick()) {
      onMessage('Adicione Clock, Latch D ou Flip-Flop D para rodar o clock automático.');
      return;
    }
    if (!autoClockRunning) {
      rememberCircuit();
    }
    setAutoClockRunning((running) => !running);
    onMessage(autoClockRunning ? 'Clock automático pausado.' : 'Clock automático rodando.');
  }

  function resetSimulation() {
    setAutoClockRunning(false);
    resetSimulationRuntime();
    onMessage('Estado da simulação resetado.');
  }

  return {
    autoClockRunning,
    setAutoClockRunning,
    autoClockIntervalMs,
    setAutoClockIntervalMs,
    simulationResult,
    evaluation,
    hasSequentialComponents,
    tickSequentialCircuit,
    toggleAutoClock,
    resetSimulation,
    resetSimulationRuntime,
  };
}
