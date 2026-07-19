import { memo, useLayoutEffect, useMemo, useRef } from 'react';
import type { WaveformSample, WaveformSignal } from '../../core/simulation/waveform';

export const WAVEFORM_ROW_HEIGHT = 44;
export const WAVEFORM_AXIS_HEIGHT = 30;
export const WAVEFORM_TICK_WIDTH = 42;
const WAVEFORM_INSET = 12;
const WAVEFORM_HIGH_OFFSET = 10;
const WAVEFORM_LOW_OFFSET = 30;
const WAVEFORM_FOLLOW_THRESHOLD = 12;

interface WaveformPanelProps {
  signals: WaveformSignal[];
  samples: WaveformSample[];
  autoClockRunning: boolean;
  onClear: () => void;
}

export function WaveformPanel({ signals, samples, autoClockRunning, onClear }: WaveformPanelProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const shouldFollowLatestRef = useRef(true);
  const firstTick = samples[0]?.tick ?? 0;
  const lastTick = samples[samples.length - 1]?.tick ?? firstTick;
  const plotWidth = waveformPlotWidth(firstTick, lastTick);
  const plotHeight = WAVEFORM_AXIS_HEIGHT + signals.length * WAVEFORM_ROW_HEIGHT;
  const traces = useMemo(
    () =>
      signals.map((signal, rowIndex) => ({
        key: signal.key,
        path: buildSquareWavePath(samples, signal.key, rowIndex, firstTick),
      })),
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
        <div className="waveform-status" aria-live="polite">
          <span className={`waveform-status-dot ${autoClockRunning ? 'running' : ''}`} />
          {autoClockRunning ? 'Auto-clock rodando' : 'Auto-clock parado'}
        </div>
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
          <div className="waveform-labels" aria-hidden="true">
            <div className="waveform-label-axis">Sinal</div>
            {signals.map((signal) => (
              <div className="waveform-signal-label" key={signal.key} title={signal.label}>
                {signal.label}
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
              />
              {traces.map((trace) => (
                <WaveformTrace key={trace.key} path={trace.path} />
              ))}
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

function WaveformGrid({
  signals,
  samples,
  firstTick,
  width,
  height,
}: {
  signals: WaveformSignal[];
  samples: WaveformSample[];
  firstTick: number;
  width: number;
  height: number;
}) {
  return (
    <g className="waveform-grid">
      {signals.map((signal, index) => {
        const y = WAVEFORM_AXIS_HEIGHT + index * WAVEFORM_ROW_HEIGHT;
        return <line key={signal.key} x1={0} y1={y} x2={width} y2={y} />;
      })}
      {samples.map((sample) => {
        const x = WAVEFORM_INSET + (sample.tick - firstTick) * WAVEFORM_TICK_WIDTH;
        return (
          <g key={sample.tick}>
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
