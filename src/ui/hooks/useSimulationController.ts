import { useCallback, useState } from 'react';
import type { CircuitDefinition, CircuitDocument } from '../../core/types';
import { toggleWatchedSignal as toggleWatchedSignalKey } from '../../core/simulation/waveform';
import { stepHierarchical } from '../../core/hierarchy/simulate';
import { circuitOrInstancesHaveSequential } from '../../core/hierarchy/scope';
import { useSimulationRuntime } from './useSimulationRuntime';
import { useWaveformHistory } from './useWaveformHistory';
import { useAutoClock } from './useAutoClock';
import { EMPTY_CHANGED_SIGNALS, useEvaluationChangeFlashes } from './useEvaluationChangeFlashes';
import type { SetStateAction } from 'react';

interface Options {
  circuit: CircuitDocument;
  setCircuit: (action: SetStateAction<CircuitDocument>) => void;
  definitions: CircuitDefinition[];
  watchedSignals: string[] | undefined;
  setWatchedSignals: (signals: string[]) => void;
  rememberCircuit: () => void;
  onMessage: (message: string) => void;
}

export function useSimulationController({
  circuit,
  setCircuit,
  definitions,
  watchedSignals,
  setWatchedSignals,
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
  } = useSimulationRuntime(circuit, tickCount, definitions);

  // waveformHistory usa o circuito/tick emparelhados com simulationResult
  // (não circuit/tickCount direto): sob carga pesada, o React pode juntar
  // o avanço do próximo tick no mesmo commit da resposta do tick anterior,
  // e ler circuit/tickCount "atuais" nesse caso gravaria a amostra errada.
  const {
    waveformSamples,
    waveformSignals,
    clearWaveformHistory,
    historyTick,
    historyEvaluation,
    selectHistoryTick: selectHistoryTickRaw,
  } = useWaveformHistory({
    circuit: simulationCircuit,
    simulationResult,
    tickCount: simulationTick,
    watchedSignals,
  });

  const { changedSignals, resetChangeFlashes } = useEvaluationChangeFlashes(evaluation);

  // Ver um tick do passado pausa o clock automático — senão o próprio
  // auto-clock devolveria pro "ao vivo" a cada tick (useWaveformHistory
  // sai do modo histórico assim que uma avaliação nova ao vivo chega).
  function selectHistoryTick(tick: number | null) {
    if (tick !== null && autoClockRunning) setAutoClockRunning(false);
    selectHistoryTickRaw(tick);
  }

  const canvasEvaluation = historyEvaluation ?? evaluation;
  const canvasChangedSignals = historyTick !== null ? EMPTY_CHANGED_SIGNALS : changedSignals;

  function toggleWatchedSignal(componentId: string, pinId: string) {
    setWatchedSignals(toggleWatchedSignalKey(circuit, watchedSignals, componentId, pinId));
  }

  function toggleWatchedSignalForWire(wireId: string) {
    const wire = circuit.wires.find((candidate) => candidate.id === wireId);
    if (!wire) return;
    toggleWatchedSignal(wire.from.componentId, wire.from.pinId);
  }

  const hasSequentialComponents = circuitOrInstancesHaveSequential(circuit.components, definitions);

  const autoClockTick = useCallback(() => {
    setCircuit((current) => stepHierarchical(current, definitions));
    setTickCount((current) => current + 1);
  }, [setCircuit, definitions]);

  useAutoClock({
    running: autoClockRunning,
    intervalMs: autoClockIntervalMs,
    onTick: autoClockTick,
  });

  function circuitCanTick() {
    return circuitOrInstancesHaveSequential(circuit.components, definitions);
  }

  function tickSequentialCircuit() {
    if (!circuitCanTick()) {
      onMessage('Adicione Clock, Latch D ou Flip-Flop D para usar Tick.');
      return;
    }
    rememberCircuit();
    setCircuit((current) => stepHierarchical(current, definitions));
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
    canvasEvaluation,
    canvasChangedSignals,
    historyTick,
    selectHistoryTick,
    hasSequentialComponents,
    tickCount,
    waveformSamples,
    waveformSignals,
    clearWaveformHistory,
    toggleWatchedSignal,
    toggleWatchedSignalForWire,
    tickSequentialCircuit,
    toggleAutoClock,
    resetSimulation,
    resetSimulationState,
  };
}
