import { useCallback, useState } from 'react';
import type { CircuitDocument } from '../../core/types';
import { isSequentialType, stepCircuit } from '../../core/evaluateCircuit';
import { useSimulationRuntime } from './useSimulationRuntime';
import { useWaveformHistory } from './useWaveformHistory';
import { useAutoClock } from './useAutoClock';
import { useEvaluationChangeFlashes } from './useEvaluationChangeFlashes';
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
  const [tickCount, setTickCount] = useState(0);

  const {
    simulationResult,
    evaluation,
    simulationCircuit,
    simulationTick,
    resetSimulationRuntime,
  } = useSimulationRuntime(circuit, tickCount);

  // waveformHistory usa o circuito/tick emparelhados com simulationResult
  // (não circuit/tickCount direto): sob carga pesada, o React pode juntar
  // o avanço do próximo tick no mesmo commit da resposta do tick anterior,
  // e ler circuit/tickCount "atuais" nesse caso gravaria a amostra errada.
  const { waveformSamples, waveformSignals, clearWaveformHistory } = useWaveformHistory({
    circuit: simulationCircuit,
    simulationResult,
    tickCount: simulationTick,
  });

  const { changedSignals, resetChangeFlashes } = useEvaluationChangeFlashes(evaluation);

  const hasSequentialComponents = circuit.components.some((component) =>
    isSequentialType(component.type),
  );

  const autoClockTick = useCallback(() => {
    setCircuit((current) => stepCircuit(current));
    setTickCount((current) => current + 1);
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
    setTickCount((current) => current + 1);
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

  // Reset sem mensagem de status: usado na troca de documento, cujo handler
  // já emite a própria mensagem.
  function resetSimulationState() {
    setAutoClockRunning(false);
    resetSimulationRuntime();
    setTickCount(0);
    clearWaveformHistory();
    resetChangeFlashes();
  }

  function resetSimulation() {
    resetSimulationState();
    onMessage('Estado da simulação resetado.');
  }

  return {
    autoClockRunning,
    autoClockIntervalMs,
    setAutoClockIntervalMs,
    simulationResult,
    evaluation,
    changedSignals,
    hasSequentialComponents,
    tickCount,
    waveformSamples,
    waveformSignals,
    clearWaveformHistory,
    tickSequentialCircuit,
    toggleAutoClock,
    resetSimulation,
    resetSimulationState,
  };
}
