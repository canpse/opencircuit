import { COMPONENT_REGISTRY } from '../componentRegistry';
import type {
  CircuitDocument,
  EvaluationResult,
  LogicComponent,
  LogicValue,
  PinDefinition,
} from '../types';

export const MAX_WAVEFORM_SAMPLES = 256;

export interface WaveformSignal {
  key: string;
  componentId: string;
  pinId: string;
  label: string;
}

// O que fica gravado por tick: o snapshot bruto da avaliação inteira, não
// só os sinais observados no momento — permite inspecionar qualquer fio no
// passado (cursor de tempo) e reconstruir corretamente o histórico de um
// sinal observado depois de já existirem amostras.
export interface WaveformSnapshot {
  tick: number;
  evaluation: EvaluationResult;
}

// Formato de exibição, derivado sob demanda (ver deriveWaveformSamples) a
// partir dos snapshots + dos sinais observados no momento da renderização.
export interface WaveformSample {
  tick: number;
  values: Record<string, LogicValue>;
}

export interface WaveformRecorder {
  samples: WaveformSnapshot[];
  lastRecordedTick: number;
}

// Ordem clássica de diagramas de tempo: clock no topo, depois entradas,
// memórias e por fim as saídas.
export function signalKey(componentId: string, pinId: string): string {
  return `${encodeURIComponent(componentId)}:${encodeURIComponent(pinId)}`;
}

export function parseSignalKey(key: string): { componentId: string; pinId: string } | null {
  const separatorIndex = key.indexOf(':');
  if (separatorIndex < 0) return null;
  try {
    return {
      componentId: decodeURIComponent(key.slice(0, separatorIndex)),
      pinId: decodeURIComponent(key.slice(separatorIndex + 1)),
    };
  } catch {
    return null;
  }
}

// O LED e o Display são observados pela entrada (o valor que eles exibem);
// os demais tipos pelas saídas que produzem.
function observedPins(component: LogicComponent): PinDefinition[] {
  const kind = component.type === 'led' || component.type === 'display-4' ? 'input' : 'output';
  return COMPONENT_REGISTRY[component.type].definition.pins.filter((pin) => pin.kind === kind);
}

// Desambigua com ".NomeDoPino" quando o componente tem mais de um pino do
// mesmo tipo (ex.: A/B de uma porta); senão usa só o rótulo do componente.
function pinLabel(component: LogicComponent, pinId: string): string {
  const definition = COMPONENT_REGISTRY[component.type].definition;
  const base = component.label?.trim() || definition.label;
  const pin = definition.pins.find((candidate) => candidate.id === pinId);
  if (!pin) return base;
  const sameKindPins = definition.pins.filter((candidate) => candidate.kind === pin.kind);
  return sameKindPins.length > 1 ? `${base}.${pin.label}` : base;
}

export function listObservableSignals(circuit: CircuitDocument): WaveformSignal[] {
  return circuit.components
    .filter((component) => COMPONENT_REGISTRY[component.type].observableRank !== null)
    .sort(
      (a, b) =>
        (COMPONENT_REGISTRY[a.type].observableRank ?? 0) -
        (COMPONENT_REGISTRY[b.type].observableRank ?? 0),
    )
    .flatMap((component) =>
      observedPins(component).map((pin) => ({
        key: signalKey(component.id, pin.id),
        componentId: component.id,
        pinId: pin.id,
        label: pinLabel(component, pin.id),
      })),
    );
}

// undefined = usa a detecção automática (listObservableSignals, o
// comportamento de sempre); uma lista explícita substitui totalmente —
// materializada sob demanda por effectiveWatchedSignalKeys na primeira
// vez que o usuário adiciona/remove um sinal pelo canvas. Chaves que
// apontam para componente/pino que não existe mais são ignoradas.
export function resolveWaveformSignals(
  circuit: CircuitDocument,
  watchedKeys: string[] | undefined,
): WaveformSignal[] {
  if (!watchedKeys) return listObservableSignals(circuit);
  const componentById = new Map(circuit.components.map((component) => [component.id, component]));
  const signals: WaveformSignal[] = [];
  for (const key of watchedKeys) {
    const parsed = parseSignalKey(key);
    if (!parsed) continue;
    const { componentId, pinId } = parsed;
    const component = componentById.get(componentId);
    if (!component) continue;
    const pinExists = COMPONENT_REGISTRY[component.type].definition.pins.some(
      (pin) => pin.id === pinId,
    );
    if (!pinExists) continue;
    signals.push({
      key: signalKey(componentId, pinId),
      componentId,
      pinId,
      label: pinLabel(component, pinId),
    });
  }
  return signals;
}

export function effectiveWatchedSignalKeys(
  circuit: CircuitDocument,
  watchedKeys: string[] | undefined,
): string[] {
  return watchedKeys
    ? watchedKeys.flatMap((key) => {
        const parsed = parseSignalKey(key);
        return parsed ? [signalKey(parsed.componentId, parsed.pinId)] : [];
      })
    : listObservableSignals(circuit).map((signal) => signal.key);
}

export function toggleWatchedSignal(
  circuit: CircuitDocument,
  watchedKeys: string[] | undefined,
  componentId: string,
  pinId: string,
): string[] {
  const base = effectiveWatchedSignalKeys(circuit, watchedKeys);
  const key = signalKey(componentId, pinId);
  return base.includes(key) ? base.filter((existing) => existing !== key) : [...base, key];
}

export function sampleSignals(
  circuit: CircuitDocument,
  evaluation: EvaluationResult,
  watchedKeys: string[] | undefined,
): Record<string, LogicValue> {
  const values: Record<string, LogicValue> = {};
  for (const signal of resolveWaveformSignals(circuit, watchedKeys)) {
    values[signal.key] = evaluation[signal.componentId]?.[signal.pinId] ?? false;
  }
  return values;
}

export function createWaveformRecorder(): WaveformRecorder {
  return { samples: [], lastRecordedTick: -1 };
}

// Grava no máximo uma amostra por tick, sempre a partir de uma avaliação que
// já reflete o circuito pós-tick: o worker processa em FIFO e o runtime só
// aceita a resposta da última requisição, então um resultado que chega após
// o tick N nunca corresponde a um circuito anterior a ele. Guarda o
// snapshot bruto — quais sinais exibir é decidido na hora de renderizar
// (ver deriveWaveformSamples), não aqui.
export function recordTickSample(
  recorder: WaveformRecorder,
  tick: number,
  evaluation: EvaluationResult,
  capacity = MAX_WAVEFORM_SAMPLES,
): WaveformRecorder {
  if (tick <= recorder.lastRecordedTick) return recorder;
  return {
    samples: [...recorder.samples, { tick, evaluation }].slice(-capacity),
    lastRecordedTick: tick,
  };
}

// Formato de exibição (o gráfico e o cursor de tempo consultam isto):
// deriva os valores dos sinais atualmente observados a partir dos
// snapshots brutos — assim um sinal observado depois de já existirem
// amostras reconstrói corretamente o histórico anterior.
export function deriveWaveformSamples(
  snapshots: WaveformSnapshot[],
  circuit: CircuitDocument,
  watchedKeys: string[] | undefined,
): WaveformSample[] {
  return snapshots.map((snapshot) => ({
    tick: snapshot.tick,
    values: sampleSignals(circuit, snapshot.evaluation, watchedKeys),
  }));
}

// Usado pelos testes; o hook (useWaveformHistory) mantém um Map próprio
// para essa busca ser O(1) em vez de repetir isto a cada render.
export function evaluationAtTick(
  snapshots: WaveformSnapshot[],
  tick: number,
): EvaluationResult | undefined {
  return snapshots.find((snapshot) => snapshot.tick === tick)?.evaluation;
}
