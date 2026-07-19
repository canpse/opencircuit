import { useCallback, useEffect, useMemo, useState } from 'react';
import type { CircuitDocument, SimulationResult } from '../../core/types';
import {
  createWaveformRecorder,
  listObservableSignals,
  recordTickSample,
} from '../../core/simulation/waveform';
import { EMPTY_SIMULATION_RESULT } from './useSimulationRuntime';

interface Options {
  circuit: CircuitDocument;
  simulationResult: SimulationResult;
  tickCount: number;
}

export function useWaveformHistory({ circuit, simulationResult, tickCount }: Options) {
  const [recorder, setRecorder] = useState(createWaveformRecorder);

  useEffect(() => {
    if (simulationResult === EMPTY_SIMULATION_RESULT) return;
    // A gravação reage à chegada de um resultado do worker (evento externo
    // propagado via estado); recordTickSample ignora ticks repetidos, então
    // não há cascata de re-renderizações.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setRecorder((current) =>
      recordTickSample(current, tickCount, circuit, simulationResult.values),
    );
    // Amostras só são gravadas quando chega um resultado novo do worker:
    // circuit e tickCount mudam antes da resposta correspondente, então
    // reagir a eles gravaria valores do tick anterior.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [simulationResult]);

  const waveformSignals = useMemo(() => listObservableSignals(circuit), [circuit]);

  const clearWaveformHistory = useCallback(() => {
    setRecorder(createWaveformRecorder());
  }, []);

  return {
    waveformSamples: recorder.samples,
    waveformSignals,
    clearWaveformHistory,
  };
}
