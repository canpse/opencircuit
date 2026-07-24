import { useCallback, useEffect, useMemo, useState } from 'react';
import type { CircuitDocument, EvaluationResult, SimulationResult } from '../../core/types';
import {
  createWaveformRecorder,
  deriveWaveformSamples,
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
  // null = ao vivo; um número = mostrando o snapshot congelado daquele tick.
  const [historyTick, setHistoryTick] = useState<number | null>(null);

  useEffect(() => {
    if (simulationResult === EMPTY_SIMULATION_RESULT) return;
    // A gravação reage à chegada de um resultado do worker (evento externo
    // propagado via estado); recordTickSample ignora ticks repetidos, então
    // não há cascata de re-renderizações.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setRecorder((current) => recordTickSample(current, tickCount, simulationResult.values));
    // Qualquer avaliação nova ao vivo sai do modo histórico automaticamente
    // — evita editar ou avançar o circuito enquanto uma amostra congelada
    // do passado está sendo mostrada, sem precisar bloquear nada no canvas.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setHistoryTick(null);
    // circuit/tickCount já vêm emparelhados com simulationResult (ver
    // comentário na interface Options acima), então só o resultado
    // precisa disparar a gravação.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [simulationResult]);

  const waveformSignals = useMemo(
    () => resolveWaveformSignals(circuit, watchedSignals),
    [circuit, watchedSignals],
  );

  const waveformSamples = useMemo(
    () => deriveWaveformSamples(recorder.samples, circuit, watchedSignals),
    [recorder.samples, circuit, watchedSignals],
  );

  const evaluationByTick = useMemo(
    () => new Map(recorder.samples.map((snapshot) => [snapshot.tick, snapshot.evaluation])),
    [recorder.samples],
  );

  const historyEvaluation: EvaluationResult | null =
    historyTick !== null ? (evaluationByTick.get(historyTick) ?? null) : null;

  // Clicar no tick já selecionado volta para "ao vivo".
  const selectHistoryTick = useCallback((tick: number | null) => {
    setHistoryTick((current) => (tick !== null && current === tick ? null : tick));
  }, []);

  const clearWaveformHistory = useCallback(() => {
    setRecorder(createWaveformRecorder());
    setHistoryTick(null);
  }, []);

  return {
    waveformSamples,
    waveformSignals,
    clearWaveformHistory,
    historyTick,
    historyEvaluation,
    selectHistoryTick,
  };
}
