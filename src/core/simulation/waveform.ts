import { COMPONENT_DEFINITIONS } from '../catalog';
import type {
  CircuitDocument,
  EvaluationResult,
  GateType,
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

export interface WaveformSample {
  tick: number;
  values: Record<string, LogicValue>;
}

export interface WaveformRecorder {
  samples: WaveformSample[];
  lastRecordedTick: number;
}

// Ordem clássica de diagramas de tempo: clock no topo, depois entradas,
// memórias e por fim as saídas.
const SIGNAL_RANK: Partial<Record<GateType, number>> = {
  clock: 0,
  input: 1,
  button: 1,
  'd-latch': 2,
  'd-flip-flop': 2,
  'register-4': 2,
  led: 3,
};

export function signalKey(componentId: string, pinId: string): string {
  return `${componentId}:${pinId}`;
}

// O LED é observado pela entrada (o valor que ele exibe); os demais tipos
// pelas saídas que produzem.
function observedPins(component: LogicComponent): PinDefinition[] {
  const kind = component.type === 'led' ? 'input' : 'output';
  return COMPONENT_DEFINITIONS[component.type].pins.filter((pin) => pin.kind === kind);
}

export function listObservableSignals(circuit: CircuitDocument): WaveformSignal[] {
  return circuit.components
    .filter((component) => SIGNAL_RANK[component.type] !== undefined)
    .sort((a, b) => (SIGNAL_RANK[a.type] ?? 0) - (SIGNAL_RANK[b.type] ?? 0))
    .flatMap((component) => {
      const pins = observedPins(component);
      const base = component.label?.trim() || COMPONENT_DEFINITIONS[component.type].label;
      return pins.map((pin) => ({
        key: signalKey(component.id, pin.id),
        componentId: component.id,
        pinId: pin.id,
        label: pins.length > 1 ? `${base}.${pin.label}` : base,
      }));
    });
}

export function sampleSignals(
  circuit: CircuitDocument,
  evaluation: EvaluationResult,
): Record<string, LogicValue> {
  const values: Record<string, LogicValue> = {};
  for (const signal of listObservableSignals(circuit)) {
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
// o tick N nunca corresponde a um circuito anterior a ele.
export function recordTickSample(
  recorder: WaveformRecorder,
  tick: number,
  circuit: CircuitDocument,
  evaluation: EvaluationResult,
  capacity = MAX_WAVEFORM_SAMPLES,
): WaveformRecorder {
  if (tick <= recorder.lastRecordedTick) return recorder;
  const sample: WaveformSample = { tick, values: sampleSignals(circuit, evaluation) };
  return {
    samples: [...recorder.samples, sample].slice(-capacity),
    lastRecordedTick: tick,
  };
}
