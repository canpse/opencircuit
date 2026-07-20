import { MouseEvent, useLayoutEffect } from 'react';
import type { DragEventHandler, MouseEventHandler, ReactNode, RefObject } from 'react';
import { commitProfileInteractions } from '../../performance/profiling';
import { useCanvasCamera } from './useCanvasCamera';
import type { WireStyle } from './CircuitCanvas';

interface Props {
  svgRef: RefObject<SVGSVGElement | null>;
  panToolSelected: boolean;
  componentCount: number;
  wireCount: number;
  wireStyle: WireStyle;
  onBeginPan: () => void;
  onClick: MouseEventHandler<SVGSVGElement>;
  onContextMenu: MouseEventHandler<SVGSVGElement>;
  onMouseDown: MouseEventHandler<SVGSVGElement>;
  onMouseMove: MouseEventHandler<SVGSVGElement>;
  onMouseUp: MouseEventHandler<SVGSVGElement>;
  onMouseLeave: MouseEventHandler<SVGSVGElement>;
  onDragOver: DragEventHandler<SVGSVGElement>;
  onDrop: DragEventHandler<SVGSVGElement>;
  children: ReactNode;
}

export function CanvasViewport({
  svgRef,
  panToolSelected,
  componentCount,
  wireCount,
  wireStyle,
  onBeginPan,
  onMouseMove,
  onMouseUp,
  onMouseLeave,
  children,
  ...svgHandlers
}: Props) {
  const {
    camera,
    panning,
    zoomPercent,
    resetCamera,
    zoomToFit,
    zoomAtCenter,
    onWheelZoom,
    startPan,
    updatePan,
    setPanning,
  } = useCanvasCamera(svgRef);

  useLayoutEffect(() => {
    commitProfileInteractions({
      components: componentCount,
      wires: wireCount,
      wireStyle,
    });
  });

  function finishPan(event: MouseEvent<SVGSVGElement>) {
    setPanning(null);
    onMouseUp(event);
  }

  function leaveCanvas(event: MouseEvent<SVGSVGElement>) {
    setPanning(null);
    onMouseLeave(event);
  }

  return (
    <>
      <svg
        {...svgHandlers}
        ref={svgRef}
        className={`circuit-canvas ${panToolSelected ? 'pan-tool' : ''} ${panning ? 'panning' : ''}`}
        viewBox={`${camera.x} ${camera.y} ${camera.width} ${camera.height}`}
        onWheel={onWheelZoom}
        onMouseDownCapture={(event) => {
          const wantsPan = event.button === 1 || (panToolSelected && event.button === 0);
          if (!wantsPan) return;
          event.preventDefault();
          event.stopPropagation();
          startPan(event);
          onBeginPan();
        }}
        onMouseMove={(event) => {
          if (panning) {
            updatePan(event);
            return;
          }
          onMouseMove(event);
        }}
        onMouseUp={finishPan}
        onMouseLeave={leaveCanvas}
      >
        <rect
          className="canvas-bg"
          x={camera.x}
          y={camera.y}
          width={camera.width}
          height={camera.height}
          fill="url(#grid)"
        />
        {children}
      </svg>
      <div className="zoom-controls" onMouseDown={(event) => event.stopPropagation()}>
        <button onClick={() => zoomAtCenter(1 / 1.2)} title="Aproximar">
          +
        </button>
        <button onClick={() => zoomAtCenter(1.2)} title="Afastar">
          −
        </button>
        <button onClick={resetCamera} title="Resetar zoom">
          {zoomPercent}%
        </button>
        <button onClick={zoomToFit} title="Enquadrar circuito (Ctrl+0)">
          Fit
        </button>
      </div>
    </>
  );
}
