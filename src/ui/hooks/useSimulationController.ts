import { useCallback, useEffect, useState } from 'react';
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
  simulationBlocked?: boolean;
  /** Identifies which document (and, when editing a subcircuit definition directly,
   * which definition within it) the tick count and waveform history below belong to.
   * Switching to a different scopeKey restores that scope's own tick count/waveform
   * history instead of wiping it (see the effect below and its twin in
   * useWaveformHistory) -- everything else (auto-clock, the worker's simulation
   * session, change flashes) still resets on every scope switch, same as before. */
  scopeKey: string;
}

export function useSimulationController({
  circuit,
  setCircuit,
  definitions,
  watchedSignals,
  setWatchedSignals,
  rememberCircuit,
  onMessage,
  simulationBlocked = false,
  scopeKey,
}: Options) {
  const [autoClockRunning, setAutoClockRunning] = useState(false);
  const [autoClockIntervalMs, setAutoClockIntervalMs] = useState(500);
  const [tickCount, setTickCount] = useState(0);
  const [trackedSimulationBlocked, setTrackedSimulationBlocked] = useState(simulationBlocked);
  if (simulationBlocked !== trackedSimulationBlocked) {
    setTrackedSimulationBlocked(simulationBlocked);
    if (simulationBlocked) setAutoClockRunning(false);
  }

  // Cada aba de documento (ou definição de subcircuito sendo editada diretamente) guarda
  // seu próprio contador de tick, restaurado ao voltar pra ela em vez de sempre voltar
  // pra 0 -- achado de uma rodada de teste exploratório: trocar de aba resetava a forma
  // de onda e o tick mesmo sem editar nada, só de espiar outra aba e voltar.
  //
  // Isso PRECISA acontecer durante a renderização (o padrão oficial do React de
  // "ajustar estado quando uma prop muda"), não num useEffect: useSimulationRuntime,
  // logo abaixo, usa tickCount para montar o pedido de simulação. Se a restauração
  // rodasse depois, em effect, o primeiro pedido do escopo novo sairia pareado com o
  // CIRCUITO novo mas o tickCount ANTIGO (ainda não substituído) -- exatamente a
  // corrida que o comentário de useWaveformHistory logo abaixo já descreve para outro
  // caso, só que introduzida por este código em vez de evitada por ele. Esse
  // pareamento errado grava uma amostra de forma de onda com o tick errado, e como
  // recordTickSample descarta qualquer tick <= o último gravado, isso trava a
  // gravação de amostras novas para sempre nesse escopo (bug real, encontrado e
  // corrigido durante a implementação desta mesma funcionalidade). O restante (clock
  // automático, sessão de simulação do worker, flashes de mudança) continua resetando
  // a cada troca de escopo via useEffect normal, mais abaixo -- só tick/forma de onda
  // precisam ser síncronos à renderização.
  //
  // O mapa fica em estado (não numa ref): refs não podem ser lidas/escritas durante a
  // renderização (react-hooks/refs) -- só o padrão de ajuste de estado é seguro aqui.
  const [scopeTickCounts, setScopeTickCounts] = useState(() => new Map<string, number>());
  const [restoredScopeKey, setRestoredScopeKey] = useState(scopeKey);
  if (scopeKey !== restoredScopeKey) {
    const nextScopeTickCounts = new Map(scopeTickCounts).set(restoredScopeKey, tickCount);
    setScopeTickCounts(nextScopeTickCounts);
    setRestoredScopeKey(scopeKey);
    setTickCount(nextScopeTickCounts.get(scopeKey) ?? 0);
    setAutoClockRunning(false);
  }

  const {
    simulationResult,
    evaluation,
    simulationCircuit,
    simulationTick,
    resetSimulationRuntime,
  } = useSimulationRuntime(circuit, tickCount, definitions, !simulationBlocked);

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
    scopeKey,
    circuit: simulationCircuit,
    simulationResult,
    tickCount: simulationTick,
    watchedSignals,
  });

  const { changedSignals, resetChangeFlashes } = useEvaluationChangeFlashes(evaluation);

  // Efeitos colaterais de verdade (avisar o worker pra descartar a sessão de
  // simulação anterior, limpar os flashes de mudança) continuam num useEffect normal
  // -- só o AJUSTE DE ESTADO de tick/autoclock precisava ser síncrono à renderização
  // (ver comentário grande acima, junto da declaração de tickCount).
  useEffect(() => {
    resetSimulationRuntime();
    resetChangeFlashes();
    // Só reage à troca de escopo em si.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scopeKey]);

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

  const hasSequentialComponents =
    !simulationBlocked && circuitOrInstancesHaveSequential(circuit.components, definitions);

  const autoClockTick = useCallback(() => {
    if (simulationBlocked) return;
    setCircuit((current) => stepHierarchical(current, definitions));
    setTickCount((current) => current + 1);
  }, [setCircuit, definitions, simulationBlocked]);

  useAutoClock({
    running: autoClockRunning && !simulationBlocked,
    intervalMs: autoClockIntervalMs,
    onTick: autoClockTick,
  });

  function circuitCanTick() {
    return !simulationBlocked && circuitOrInstancesHaveSequential(circuit.components, definitions);
  }

  function tickSequentialCircuit() {
    if (simulationBlocked) {
      onMessage('Simulação bloqueada: reduza a hierarquia para ficar dentro dos limites.');
      return;
    }
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
    if (simulationBlocked) {
      setAutoClockRunning(false);
      onMessage('Clock bloqueado: reduza a hierarquia para ficar dentro dos limites.');
      return;
    }
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

  // Reset completo (zera tick e forma de onda de verdade, sem restaurar nada):
  // usado só pelo botão "Resetar simulação" -- é o único caso em que apagar o
  // histórico é literalmente o que foi pedido. Trocar de aba/definição não passa mais
  // por aqui -- ver o efeito de scopeKey acima, que restaura em vez de zerar.
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

  // Usado por undo/redo (restoreCircuit): pausa o clock automático e descarta a
  // sessão de simulação do worker (o circuito está prestes a mudar por baixo, mesmo
  // motivo de sempre) e limpa os flashes de mudança -- mas NÃO zera tick/forma de
  // onda. Achado de uma rodada de teste exploratório: desfazer uma edição qualquer
  // (até um simples mover de componente) apagava a forma de onda inteira, o que ficou
  // ainda mais estranho depois do fix de trocar de aba não resetar mais -- undo era a
  // única ação que continuava zerando tudo. tickCount não é ajustado aqui de
  // propósito: como ele nunca anda pra trás sozinho, um tick genuinamente novo depois
  // de um undo sempre grava um número de tick MAIOR que o último já gravado, então
  // recordTickSample (que descarta tick <= último gravado) nunca bloqueia essa
  // gravação nova -- só faz a forma de onda mostrar as amostras antigas seguidas das
  // novas, com uma descontinuidade visual no ponto onde o usuário desfez e re-tickou
  // por um caminho diferente. Isso é preferível a apagar o histórico inteiro toda vez.
  function pauseSimulationForHistoryRestore() {
    setAutoClockRunning(false);
    resetSimulationRuntime();
    resetChangeFlashes();
  }

  return {
    autoClockRunning: autoClockRunning && !simulationBlocked,
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
    pauseSimulationForHistoryRestore,
  };
}
