import { MouseEvent, useImperativeHandle, useLayoutEffect, useRef } from 'react';
import type { DragEventHandler, MouseEventHandler, ReactNode, RefObject } from 'react';
import { commitProfileInteractions } from '../../performance/profiling';
import { commandDefinition, commandShortcutLabel } from '../commands/editorCommands';
import { useOptionalEditorCommands } from '../commands/EditorCommandContext';
import { useCanvasCamera } from './useCanvasCamera';
import type { WireStyle } from './editorTypes';

export interface CanvasCameraCommands {
  zoomIn: () => void;
  zoomOut: () => void;
  resetZoom: () => void;
  zoomToFit: () => void;
}

interface Props {
  svgRef: RefObject<SVGSVGElement | null>;
  cameraCommandsRef?: RefObject<CanvasCameraCommands | null>;
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
  cameraCommandsRef,
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
  const commands = useOptionalEditorCommands();
  const fallbackCameraCommandsRef = useRef<CanvasCameraCommands>(null);
  const effectiveCameraCommandsRef = cameraCommandsRef ?? fallbackCameraCommandsRef;
  const zoomInCommand = commands?.['view.zoomIn'];
  const zoomOutCommand = commands?.['view.zoomOut'];
  const zoomResetCommand = commands?.['view.zoomReset'];
  const zoomFitCommand = commands?.['view.zoomFit'];
  const zoomInDefinition = zoomInCommand ?? commandDefinition('view.zoomIn');
  const zoomOutDefinition = zoomOutCommand ?? commandDefinition('view.zoomOut');
  const zoomResetDefinition = zoomResetCommand ?? commandDefinition('view.zoomReset');
  const zoomFitDefinition = zoomFitCommand ?? commandDefinition('view.zoomFit');

  useImperativeHandle(
    effectiveCameraCommandsRef,
    () => ({
      zoomIn: () => zoomAtCenter(1 / 1.2),
      zoomOut: () => zoomAtCenter(1.2),
      resetZoom: resetCamera,
      zoomToFit,
    }),
    [resetCamera, zoomAtCenter, zoomToFit],
  );

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
        <button
          onClick={zoomInCommand?.run ?? (() => zoomAtCenter(1 / 1.2))}
          title={`${zoomInDefinition.label} (${commandShortcutLabel(zoomInDefinition)})`}
          aria-label={zoomInDefinition.label}
        >
          +
        </button>
        <button
          onClick={zoomOutCommand?.run ?? (() => zoomAtCenter(1.2))}
          title={`${zoomOutDefinition.label} (${commandShortcutLabel(zoomOutDefinition)})`}
          aria-label={zoomOutDefinition.label}
        >
          −
        </button>
        <button
          onClick={zoomResetCommand?.run ?? resetCamera}
          title={zoomResetDefinition.description}
          aria-label={zoomResetDefinition.label}
        >
          {zoomPercent}%
        </button>
        <button
          onClick={zoomFitCommand?.run ?? zoomToFit}
          title={`${zoomFitDefinition.label} (${commandShortcutLabel(zoomFitDefinition)})`}
          aria-label={zoomFitDefinition.label}
        >
          Fit
        </button>
      </div>
    </>
  );
}
