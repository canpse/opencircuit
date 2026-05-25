import { MouseEvent, useEffect, useMemo, useRef, useState } from 'react';
import { COMPONENT_DEFINITIONS } from '../../core/catalog';
import { ComponentView } from './ComponentView';
import {
  componentBounds,
  intersects,
  routeCircuitWires,
  textComponentWidth,
  wireInRect,
  wrapText,
  type RectBounds,
} from './wireRouting';
import { PendingWire, WireView } from './WireView';
import { useCanvasCamera } from './useCanvasCamera';
import { useLabelEditing } from './useLabelEditing';
import type { CircuitDocument, EvaluationResult, GateType, LogicComponent, PinRef, Point, Wire } from '../../core/types';

export type WireStyle = 'orthogonal' | 'bezier';

type Tool = GateType | 'select' | 'wire' | 'pan';
type Selection = { componentIds: string[]; wireIds: string[] };
type Marquee = { start: Point; end: Point } | null;
type Dragging = {
  componentIds: string[];
  startMouse: Point;
  origins: Record<string, Point>;
  recorded: boolean;
} | null;
type ResizingText = {
  componentId: string;
  startMouse: Point;
  startWidth: number;
  recorded: boolean;
} | null;

interface Props {
  circuit: CircuitDocument;
  evaluation: EvaluationResult;
  selectedTool: Tool;
  wireStyle: WireStyle;
  pendingWire: PinRef | null;
  selection: Selection;
  renameRequest: { componentId: string; nonce: number } | null;
  onRenameRequestHandled: () => void;
  onCanvasAdd: (type: GateType, point: Point) => void;
  onBeginMoveComponent: () => void;
  onMoveComponents: (moves: Array<{ componentId: string; point: Point }>) => void;
  onResizeTextComponent: (componentId: string, width: number) => void;
  onToggleInput: (componentId: string) => void;
  onSetButtonPressed: (componentId: string, pressed: boolean) => void;
  onPinClick: (pin: PinRef, kind: 'input' | 'output') => void;
  onRemoveWire: (wireId: string) => void;
  onRemoveComponent: (componentId: string) => void;
  onRenameComponent: (componentId: string, label: string) => void;
  onCancelPendingWire: () => void;
  onOpenCanvasMenu: (x: number, y: number, point: Point) => void;
  onOpenComponentMenu: (x: number, y: number, componentId: string) => void;
  onOpenWireMenu: (x: number, y: number, wireId: string) => void;
  onSelectComponent: (componentId: string) => void;
  onSelectWire: (wireId: string) => void;
  onSelectItems: (selection: Selection) => void;
  onClearSelection: () => void;
  onSelectTool: (tool: Tool) => void;
}

export function CircuitCanvas(props: Props) {
  const svgRef = useRef<SVGSVGElement>(null);
  const [dragging, setDragging] = useState<Dragging>(null);
  const [mousePoint, setMousePoint] = useState<Point | null>(null);
  const [marquee, setMarquee] = useState<Marquee>(null);
  const { camera, panning, zoomPercent, resetCamera, zoomAtCenter, onWheelZoom, startPan, updatePan, setPanning } = useCanvasCamera(svgRef, svgPoint);
  const [resizingText, setResizingText] = useState<ResizingText>(null);
  const [dragConnecting, setDragConnecting] = useState<PinRef | null>(null);

  const suppressNextClick = useRef(false);
  const suppressNextPinClick = useRef(false);
  const componentById = useMemo(
    () => new Map(props.circuit.components.map((component) => [component.id, component])),
    [props.circuit.components],
  );
  const wireRoutes = useMemo(
    () => routeCircuitWires(props.circuit.wires, componentById, props.circuit.components),
    [props.circuit.wires, componentById, props.circuit.components],
  );
  const routeByWireId = useMemo(
    () => new Map(wireRoutes.map((route) => [route.wireId, route])),
    [wireRoutes],
  );
  const {
    editingLabel,
    setEditingLabel,
    labelInputRef,
    startRename,
    commitRename,
    onLabelEditorKeyDown,
  } = useLabelEditing(
    componentById,
    props.onSelectComponent,
    props.onRenameComponent,
    () => {
      setDragging(null);
      setMarquee(null);
    },
  );

  useEffect(() => {
    if (!props.renameRequest) return;
    const component = componentById.get(props.renameRequest.componentId);
    if (component) startRename(component);
    props.onRenameRequestHandled();
  }, [props.renameRequest?.nonce]);

  function svgPoint(event: { clientX: number; clientY: number }): Point {
    const svg = svgRef.current;
    if (!svg) return { x: 0, y: 0 };

    const ctm = svg.getScreenCTM();
    if (!ctm) return { x: 0, y: 0 };

    const point = svg.createSVGPoint();
    point.x = event.clientX;
    point.y = event.clientY;
    const transformed = point.matrixTransform(ctm.inverse());
    return { x: transformed.x, y: transformed.y };
  }

  function isBackgroundEvent(event: MouseEvent<SVGSVGElement>): boolean {
    const target = event.target as Element;
    return event.target === svgRef.current || target.classList.contains('canvas-bg');
  }

  function beginPan(event: MouseEvent<SVGSVGElement>) {
    startPan(event);
    setMarquee(null);
    setDragging(null);
  }

  function onPanMouseDownCapture(event: MouseEvent<SVGSVGElement>) {
    const wantsPan = event.button === 1 || (props.selectedTool === 'pan' && event.button === 0);
    if (!wantsPan) return;
    event.preventDefault();
    event.stopPropagation();
    beginPan(event);
  }

  function onCanvasClick(event: MouseEvent<SVGSVGElement>) {
    if (suppressNextClick.current) {
      suppressNextClick.current = false;
      return;
    }
    const clickedBackground = isBackgroundEvent(event);
    if (!clickedBackground) return;

    if (props.pendingWire) {
      props.onCancelPendingWire();
      return;
    }

    props.onClearSelection();

    if (props.selectedTool !== 'select' && props.selectedTool !== 'wire' && props.selectedTool !== 'pan') {
      props.onCanvasAdd(props.selectedTool, svgPoint(event));
    }
  }

  function onCanvasMouseDown(event: MouseEvent<SVGSVGElement>) {
    if (!isBackgroundEvent(event) || props.pendingWire || props.selectedTool !== 'select') return;
    const point = svgPoint(event);
    setMarquee({ start: point, end: point });
  }

  function finishMarquee(nextMarquee: Marquee) {
    if (!nextMarquee) return;
    const rect = normalizeRect(nextMarquee.start, nextMarquee.end);
    const dragged = rect.width > 4 || rect.height > 4;
    setMarquee(null);
    if (!dragged) return;

    suppressNextClick.current = true;
    const componentIds = props.circuit.components
      .filter((component) => intersects(rect, componentBounds(component)))
      .map((component) => component.id);
    const wireIds = props.circuit.wires
      .filter((wire) => wireInRect(wire, componentById, rect))
      .map((wire) => wire.id);
    props.onSelectItems({ componentIds, wireIds });
  }

  return (
    <div className="canvas-wrap">
      <svg
        ref={svgRef}
        className={`circuit-canvas ${props.selectedTool === 'pan' ? 'pan-tool' : ''} ${panning ? 'panning' : ''}`}
        viewBox={`${camera.x} ${camera.y} ${camera.width} ${camera.height}`}
        onWheel={onWheelZoom}
        onClick={onCanvasClick}
        onMouseDownCapture={onPanMouseDownCapture}
      onContextMenu={(event) => {
        event.preventDefault();
        if (!isBackgroundEvent(event)) return;
        props.onOpenCanvasMenu(event.clientX, event.clientY, svgPoint(event));
      }}
      onMouseDown={onCanvasMouseDown}
      onMouseMove={(event) => {
        const point = svgPoint(event);
        setMousePoint(point);
        if (panning) {
          updatePan(event);
          return;
        }
        if (marquee) {
          setMarquee({ ...marquee, end: point });
          return;
        }
        if (resizingText) {
          if (!resizingText.recorded) {
            props.onBeginMoveComponent();
            setResizingText({ ...resizingText, recorded: true });
          }
          props.onResizeTextComponent(resizingText.componentId, Math.max(90, resizingText.startWidth + point.x - resizingText.startMouse.x));
          return;
        }
        if (!dragging) return;
        if (!dragging.recorded) {
          props.onBeginMoveComponent();
          setDragging({ ...dragging, recorded: true });
        }
        props.onMoveComponents(
          dragging.componentIds.map((componentId) => ({
            componentId,
            point: {
              x: dragging.origins[componentId].x + point.x - dragging.startMouse.x,
              y: dragging.origins[componentId].y + point.y - dragging.startMouse.y,
            },
          })),
        );
      }}
      onMouseUp={() => {
        if (dragConnecting) {
          props.onCancelPendingWire();
          setDragConnecting(null);
        }
        finishMarquee(marquee);
        setDragging(null);
        setResizingText(null);
        setPanning(null);
      }}
      onMouseLeave={() => {
        if (dragConnecting) {
          props.onCancelPendingWire();
          setDragConnecting(null);
        }
        finishMarquee(marquee);
        setDragging(null);
        setResizingText(null);
        setPanning(null);
        setMousePoint(null);
      }}
      onDragOver={(event) => event.preventDefault()}
      onDrop={(event) => {
        event.preventDefault();
        const type = event.dataTransfer.getData('application/opencircuit-gate') as GateType;
        if (type && COMPONENT_DEFINITIONS[type]) {
          props.onCanvasAdd(type, svgPoint(event));
          props.onSelectTool('select');
        }
      }}
    >
      <defs>
        <pattern id="grid" width="20" height="20" patternUnits="userSpaceOnUse">
          <path d="M 20 0 L 0 0 0 20" fill="none" stroke="rgba(47, 79, 79, 0.12)" strokeWidth="1" />
        </pattern>
        <filter id="softShadow" x="-20%" y="-20%" width="140%" height="140%">
          <feDropShadow dx="0" dy="5" stdDeviation="5" floodColor="#51606b" floodOpacity="0.18" />
        </filter>
        <linearGradient id="gateFace" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0" stopColor="#ffffff" />
          <stop offset="1" stopColor="#e7edf2" />
        </linearGradient>
      </defs>
      <rect className="canvas-bg" x={camera.x} y={camera.y} width={camera.width} height={camera.height} fill="url(#grid)" />

      <g className="wires">
        {props.circuit.wires.map((wire) => (
          <WireView
            key={wire.id}
            wire={wire}
            route={routeByWireId.get(wire.id)}
            wireStyle={props.wireStyle}
            componentById={componentById}
            evaluation={props.evaluation}
            selected={props.selection.wireIds.includes(wire.id)}
            onSelect={() => props.onSelectWire(wire.id)}
            onContextMenu={(event) => props.onOpenWireMenu(event.clientX, event.clientY, wire.id)}
            onRemove={() => props.onRemoveWire(wire.id)}
          />
        ))}
      </g>

      {props.pendingWire && !dragging && (
        <PendingWire
          pendingWire={props.pendingWire}
          componentById={componentById}
          components={props.circuit.components}
          wireStyle={props.wireStyle}
          mousePoint={mousePoint}
        />
      )}

      {marquee && <MarqueeRect marquee={marquee} />}

      <g className="components">
        {props.circuit.components.map((component) => (
          <ComponentView
            key={component.id}
            component={component}
            evaluation={props.evaluation}
            selected={props.selection.componentIds.includes(component.id)}
            onMouseDown={(event) => {
              const point = svgPoint(event);
              const componentIds = props.selection.componentIds.includes(component.id)
                ? props.selection.componentIds
                : [component.id];
              if (!props.selection.componentIds.includes(component.id)) {
                props.onSelectComponent(component.id);
              }
              const origins = Object.fromEntries(
                componentIds
                  .map((componentId) => componentById.get(componentId))
                  .filter((selectedComponent): selectedComponent is LogicComponent => Boolean(selectedComponent))
                  .map((selectedComponent) => [selectedComponent.id, { x: selectedComponent.x, y: selectedComponent.y }]),
              );
              setDragging({ componentIds: Object.keys(origins), startMouse: point, origins, recorded: false });
            }}
            onContextMenu={(event) => props.onOpenComponentMenu(event.clientX, event.clientY, component.id)}
            onToggleInput={() => props.onToggleInput(component.id)}
            onSetButtonPressed={(pressed) => props.onSetButtonPressed(component.id, pressed)}
            onRemove={() => props.onRemoveComponent(component.id)}
            onRenameStart={() => startRename(component)}
            onResizeStart={(event) => {
              event.stopPropagation();
              const point = svgPoint(event);
              props.onSelectComponent(component.id);
              setDragging(null);
              setResizingText({ componentId: component.id, startMouse: point, startWidth: textComponentWidth(component), recorded: false });
            }}
            onPinMouseDown={(pin, kind) => {
              if (kind !== 'output') return;
              props.onPinClick(pin, kind);
              setDragConnecting(pin);
            }}
            onPinMouseUp={(pin, kind) => {
              if (!dragConnecting || kind !== 'input') return;
              props.onPinClick(pin, kind);
              setDragConnecting(null);
              suppressNextPinClick.current = true;
            }}
            onPinClick={(pin, kind) => {
              if (suppressNextPinClick.current) {
                suppressNextPinClick.current = false;
                return;
              }
              props.onPinClick(pin, kind);
            }}
          />
        ))}
      </g>

      {editingLabel && (() => {
        const component = componentById.get(editingLabel.componentId);
        if (!component) return null;
        const definition = COMPONENT_DEFINITIONS[component.type];
        return (
          <foreignObject
            className="label-editor-object"
            x={component.x}
            y={component.y + componentBounds(component).height + 4}
            width={component.type === 'text' ? textComponentWidth(component) : definition.width}
            height="38"
          >
            <input
              ref={labelInputRef}
              className="label-editor-input"
              value={editingLabel.value}
              onChange={(event) => setEditingLabel({ ...editingLabel, value: event.target.value })}
              onKeyDown={onLabelEditorKeyDown}
              onBlur={commitRename}
              onMouseDown={(event) => event.stopPropagation()}
              onClick={(event) => event.stopPropagation()}
            />
          </foreignObject>
        );
      })()}
      </svg>
      <div className="zoom-controls" onMouseDown={(event) => event.stopPropagation()}>
        <button onClick={() => zoomAtCenter(1 / 1.2)} title="Aproximar">+</button>
        <button onClick={() => zoomAtCenter(1.2)} title="Afastar">−</button>
        <button onClick={resetCamera} title="Resetar zoom">{zoomPercent}%</button>
      </div>
    </div>
  );
}

function MarqueeRect({ marquee }: { marquee: NonNullable<Marquee> }) {
  const rect = normalizeRect(marquee.start, marquee.end);
  return <rect className="marquee-selection" x={rect.x} y={rect.y} width={rect.width} height={rect.height} />;
}

function normalizeRect(start: Point, end: Point): RectBounds {
  const x = Math.min(start.x, end.x);
  const y = Math.min(start.y, end.y);
  return { x, y, width: Math.abs(end.x - start.x), height: Math.abs(end.y - start.y) };
}

