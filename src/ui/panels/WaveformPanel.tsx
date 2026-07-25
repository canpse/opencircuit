import { memo, useLayoutEffect, useMemo, useRef } from 'react';
import { formatBusHex } from '../../core/simulation/signals';
import type { WaveformSample, WaveformSignal } from '../../core/simulation/waveform';

export const WAVEFORM_ROW_HEIGHT = 44;
export const WAVEFORM_AXIS_HEIGHT = 30;
export const WAVEFORM_TICK_WIDTH = 42;
const WAVEFORM_INSET = 12;
const WAVEFORM_HIGH_OFFSET = 10;
const WAVEFORM_LOW_OFFSET = 30;
const WAVEFORM_BUS_OFFSET = (WAVEFORM_HIGH_OFFSET + WAVEFORM_LOW_OFFSET) / 2;
const WAVEFORM_FOLLOW_THRESHOLD = 12;

interface WaveformPanelProps {
  signals: WaveformSignal[];
  samples: WaveformSample[];
  autoClockRunning: boolean;
  onClear: () => void;
  onRemoveSignal: (componentId: string, pinId: string) => void;
  historyTick: number | null;
  onSelectTick: (tick: number | null) => void;
}

export function WaveformPanel({
  signals,
  samples,
  autoClockRunning,
  onClear,
  onRemoveSignal,
  historyTick,
  onSelectTick,
}: WaveformPanelProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const shouldFollowLatestRef = useRef(true);
  const firstTick = samples[0]?.tick ?? 0;
  const lastTick = samples[samples.length - 1]?.tick ?? firstTick;
  const plotWidth = waveformPlotWidth(firstTick, lastTick);
  const plotHeight = WAVEFORM_AXIS_HEIGHT + signals.length * WAVEFORM_ROW_HEIGHT;
  const traces = useMemo(
    () =>
      signals.map((signal, rowIndex) =>
        waveformRowIsBus(samples, signal.key)
          ? {
              key: signal.key,
              bus: true as const,
              rowIndex,
              path: buildBusFlatPath(samples, rowIndex, firstTick),
            }
          : {
              key: signal.key,
              bus: false as const,
              path: buildSquareWavePath(samples, signal.key, rowIndex, firstTick),
            },
      ),
    [firstTick, samples, signals],
  );

  useLayoutEffect(() => {
    if (samples.length === 0) {
      shouldFollowLatestRef.current = true;
      return;
    }
    const scroll = scrollRef.current;
    if (scroll && shouldFollowLatestRef.current) {
      scroll.scrollLeft = scroll.scrollWidth - scroll.clientWidth;
    }
  }, [lastTick, samples.length]);

  return (
    <div className="waveform-panel-content">
      <div className="waveform-toolbar">
        {historyTick !== null ? (
          <div className="waveform-status waveform-status-history" aria-live="polite">
            <span className="waveform-status-dot history" />
            Visualizando tick {historyTick}
            <button className="waveform-live-button" onClick={() => onSelectTick(null)}>
              Voltar ao vivo
            </button>
          </div>
        ) : (
          <div className="waveform-status" aria-live="polite">
            <span className={`waveform-status-dot ${autoClockRunning ? 'running' : ''}`} />
            {autoClockRunning ? 'Auto-clock rodando' : 'Auto-clock parado'}
          </div>
        )}
        <button className="waveform-clear-button" onClick={onClear} disabled={samples.length === 0}>
          Limpar
        </button>
      </div>

      {signals.length === 0 ? (
        <div className="properties-card muted-card">
          Adicione Clock, Input, Button, memória ou LED para observar sinais.
        </div>
      ) : samples.length === 0 ? (
        <div className="properties-card muted-card">
          Avance a simulação com Tick ou inicie o auto-clock para registrar formas de onda.
        </div>
      ) : (
        <div className="waveform-card">
          <div className="waveform-labels">
            <div className="waveform-label-axis" aria-hidden="true">
              Sinal
            </div>
            {signals.map((signal) => (
              <div className="waveform-signal-label" key={signal.key} title={signal.label}>
                <span>{signal.label}</span>
                <button
                  className="waveform-signal-remove"
                  onClick={() => onRemoveSignal(signal.componentId, signal.pinId)}
                  aria-label={`Remover ${signal.label} da forma de onda`}
                  title="Remover da forma de onda"
                >
                  ×
                </button>
              </div>
            ))}
          </div>
          <div
            ref={scrollRef}
            className="waveform-scroll"
            tabIndex={0}
            aria-label="Diagrama de formas de onda"
            onScroll={(event) => {
              const scroll = event.currentTarget;
              shouldFollowLatestRef.current = waveformIsAtEnd(
                scroll.scrollLeft,
                scroll.clientWidth,
                scroll.scrollWidth,
              );
            }}
          >
            <svg
              className="waveform-chart"
              width={plotWidth}
              height={plotHeight}
              role="img"
              aria-label={`${signals.length} sinais em ${samples.length} amostras, do tick ${firstTick} ao ${lastTick}`}
            >
              <WaveformGrid
                signals={signals}
                samples={samples}
                firstTick={firstTick}
                width={plotWidth}
                height={plotHeight}
                historyTick={historyTick}
                onSelectTick={onSelectTick}
              />
              {traces.map((trace) =>
                trace.bus ? (
                  <WaveformBusTrace
                    key={trace.key}
                    path={trace.path}
                    samples={samples}
                    signalKey={trace.key}
                    rowIndex={trace.rowIndex}
                    firstTick={firstTick}
                  />
                ) : (
                  <WaveformTrace key={trace.key} path={trace.path} />
                ),
              )}
            </svg>
          </div>
        </div>
      )}
    </div>
  );
}

export function waveformIsAtEnd(
  scrollLeft: number,
  clientWidth: number,
  scrollWidth: number,
): boolean {
  return scrollWidth - clientWidth - scrollLeft <= WAVEFORM_FOLLOW_THRESHOLD;
}

function waveformPlotWidth(firstTick: number, lastTick: number): number {
  return Math.max(260, (lastTick - firstTick + 1) * WAVEFORM_TICK_WIDTH + WAVEFORM_INSET * 2);
}

export function buildSquareWavePath(
  samples: WaveformSample[],
  signalKey: string,
  rowIndex: number,
  firstTick = samples[0]?.tick ?? 0,
): string {
  if (samples.length === 0) return '';
  const y = (value: boolean) =>
    WAVEFORM_AXIS_HEIGHT +
    rowIndex * WAVEFORM_ROW_HEIGHT +
    (value ? WAVEFORM_HIGH_OFFSET : WAVEFORM_LOW_OFFSET);
  const x = (tick: number) => WAVEFORM_INSET + (tick - firstTick) * WAVEFORM_TICK_WIDTH;
  const first = samples[0];
  let path = `M ${x(first.tick)} ${y(Boolean(first.values[signalKey]))}`;
  for (const sample of samples.slice(1)) {
    path += ` H ${x(sample.tick)} V ${y(Boolean(sample.values[signalKey]))}`;
  }
  return `${path} H ${x(samples[samples.length - 1]?.tick ?? first.tick) + WAVEFORM_TICK_WIDTH}`;
}

// Um pino de barramento pode começar desconectado (amostra escalar `false`, via
// sampleSignals) e só virar array depois de ligado no meio da gravação -- olhar só
// samples[0] erraria nesse caso, então checa a linha inteira.
export function waveformRowIsBus(samples: WaveformSample[], signalKey: string): boolean {
  return samples.some((sample) => Array.isArray(sample.values[signalKey]));
}

export function buildBusFlatPath(
  samples: WaveformSample[],
  rowIndex: number,
  firstTick = samples[0]?.tick ?? 0,
): string {
  if (samples.length === 0) return '';
  const y = WAVEFORM_AXIS_HEIGHT + rowIndex * WAVEFORM_ROW_HEIGHT + WAVEFORM_BUS_OFFSET;
  const x = (tick: number) => WAVEFORM_INSET + (tick - firstTick) * WAVEFORM_TICK_WIDTH;
  const first = samples[0];
  const last = samples[samples.length - 1];
  return `M ${x(first.tick)} ${y} H ${x(last.tick) + WAVEFORM_TICK_WIDTH}`;
}

function WaveformBusTrace({
  path,
  samples,
  signalKey,
  rowIndex,
  firstTick,
}: {
  path: string;
  samples: WaveformSample[];
  signalKey: string;
  rowIndex: number;
  firstTick: number;
}) {
  const y = WAVEFORM_AXIS_HEIGHT + rowIndex * WAVEFORM_ROW_HEIGHT + WAVEFORM_BUS_OFFSET - 8;
  return (
    <g className="waveform-bus-row">
      <path className="waveform-trace bus" d={path} />
      {samples.map((sample) => (
        <text
          key={sample.tick}
          className="waveform-bus-label"
          x={WAVEFORM_INSET + (sample.tick - firstTick) * WAVEFORM_TICK_WIDTH}
          y={y}
          textAnchor="middle"
        >
          {formatBusHex(sample.values[signalKey])}
        </text>
      ))}
    </g>
  );
}

function WaveformGrid({
  signals,
  samples,
  firstTick,
  width,
  height,
  historyTick,
  onSelectTick,
}: {
  signals: WaveformSignal[];
  samples: WaveformSample[];
  firstTick: number;
  width: number;
  height: number;
  historyTick: number | null;
  onSelectTick: (tick: number | null) => void;
}) {
  return (
    <g className="waveform-grid">
      {signals.map((signal, index) => {
        const y = WAVEFORM_AXIS_HEIGHT + index * WAVEFORM_ROW_HEIGHT;
        return <line key={signal.key} x1={0} y1={y} x2={width} y2={y} />;
      })}
      {samples.map((sample) => {
        const x = WAVEFORM_INSET + (sample.tick - firstTick) * WAVEFORM_TICK_WIDTH;
        const selected = sample.tick === historyTick;
        return (
          <g key={sample.tick} className={`waveform-tick ${selected ? 'selected' : ''}`}>
            <rect
              className="waveform-tick-hit"
              x={x - WAVEFORM_TICK_WIDTH / 2}
              y={0}
              width={WAVEFORM_TICK_WIDTH}
              height={height}
              role="button"
              tabIndex={0}
              aria-pressed={selected}
              aria-label={`Ver estado do circuito no tick ${sample.tick}`}
              onClick={() => onSelectTick(sample.tick)}
              onKeyDown={(event) => {
                if (event.key !== 'Enter' && event.key !== ' ') return;
                event.preventDefault();
                onSelectTick(sample.tick);
              }}
            />
            <line x1={x} y1={WAVEFORM_AXIS_HEIGHT - 5} x2={x} y2={height} />
            <text x={x} y={18} textAnchor="middle">
              {sample.tick}
            </text>
          </g>
        );
      })}
    </g>
  );
}

const WaveformTrace = memo(function WaveformTrace({ path }: { path: string }) {
  return <path className="waveform-trace" d={path} />;
});
