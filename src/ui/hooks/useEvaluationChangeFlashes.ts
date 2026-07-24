import { useEffect, useRef, useState } from 'react';
import type { EvaluationResult } from '../../core/types';
import { signalKey } from '../../core/simulation/waveform';

// Compara duas avaliações e devolve os pinos cujo valor mudou, todos
// marcados com a mesma `generation` (parâmetro, não gerado aqui — quem
// chama decide o número, o que mantém a função livre de estado/side
// effects e fácil de testar).
export function diffChangedSignals(
  previous: EvaluationResult | undefined,
  next: EvaluationResult,
  generation: number,
): Map<string, number> {
  const changed = new Map<string, number>();
  if (!previous) return changed; // primeira avaliação: nada para comparar
  for (const componentId of Object.keys(next)) {
    const previousValues = previous[componentId];
    if (!previousValues) continue; // componente novo, não "mudou"
    const nextValues = next[componentId];
    for (const pinId of Object.keys(nextValues)) {
      if (previousValues[pinId] === undefined) continue; // pino novo
      if (previousValues[pinId] === nextValues[pinId]) continue;
      changed.set(signalKey(componentId, pinId), generation);
    }
  }
  return changed;
}

const EMPTY_CHANGED_SIGNALS: ReadonlyMap<string, number> = new Map();

// Dá um pulso visual nos pinos que acabaram de mudar de valor (ver
// ComponentView), para ajudar a enxergar causa e efeito em lógica
// sequencial sem precisar abrir a forma de onda.
export function useEvaluationChangeFlashes(evaluation: EvaluationResult) {
  const previousRef = useRef<EvaluationResult | undefined>(undefined);
  const generationRef = useRef(0);
  const [changedSignals, setChangedSignals] =
    useState<ReadonlyMap<string, number>>(EMPTY_CHANGED_SIGNALS);

  useEffect(() => {
    const previous = previousRef.current;
    previousRef.current = evaluation;
    const changed = diffChangedSignals(previous, evaluation, generationRef.current + 1);
    if (changed.size > 0) {
      generationRef.current += 1;
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setChangedSignals(changed);
    }
  }, [evaluation]);

  function resetChangeFlashes() {
    previousRef.current = undefined;
    setChangedSignals(EMPTY_CHANGED_SIGNALS);
  }

  return { changedSignals, resetChangeFlashes };
}
