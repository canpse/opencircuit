import { useCallback, useEffect, useMemo, useState } from 'react';
import type { CircuitDocument, SimulationResult } from '../../core/types';
import {
  createWaveformRecorder,
  recordTickSample,
  resolveWaveformSignals,
} from '../../core/simulation/waveform';
import { EMPTY_SIMULATION_RESULT } from './useSimulationRuntime';

interface Options {
  // circuit/tickCount devem vir emparelhados com simulationResult (ver
  // useSimulationRuntime: simulationCircuit/simulationTick), nunca o
  // circuito/contador "atuais" do editor — sob carga pesada, o próximo
  // tick pode ser incorporado ao mesmo commit da resposta do tick
  // anterior, e ler estado externo nesse caso gravaria o par errado.
  circuit: CircuitDocument;
  simulationResult: SimulationResult;
  tickCount: number;
  // undefined = detecção automática de sinais (ver resolveWaveformSignals).
  watchedSignals: string[] | undefined;
}

export function useWaveformHistory({
  circuit,
  simulationResult,
  tickCount,
  watchedSignals,
}: Options) {
  const [recorder, setRecorder] = useState(createWaveformRecorder);

  useEffect(() => {
    if (simulationResult === EMPTY_SIMULATION_RESULT) return;
    // A gravação reage à chegada de um resultado do worker (evento externo
    // propagado via estado); recordTickSample ignora ticks repetidos, então
    // não há cascata de re-renderizações.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setRecorder((current) =>
      recordTickSample(current, tickCount, circuit, simulationResult.values, watchedSignals),
    );
    // circuit/tickCount já vêm emparelhados com simulationResult (ver
    // comentário na interface Options acima), então só o resultado
    // precisa disparar a gravação.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [simulationResult]);

  const waveformSignals = useMemo(
    () => resolveWaveformSignals(circuit, watchedSignals),
    [circuit, watchedSignals],
  );

  const clearWaveformHistory = useCallback(() => {
    setRecorder(createWaveformRecorder());
  }, []);

  return {
    waveformSamples: recorder.samples,
    waveformSignals,
    clearWaveformHistory,
  };
}
