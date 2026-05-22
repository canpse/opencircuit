import { MouseEvent, WheelEvent, useEffect, useMemo, useRef, useState } from 'react';
import { COMPONENT_DEFINITIONS, getPinPosition } from '../../core/catalog';
import type { CircuitDocument, EvaluationResult, GateType, LogicComponent, PinRef, Point, Wire } from '../../core/types';

type Tool = GateType | 'select' | 'wire' | 'pan';
type Selection = { componentIds: string[]; wireIds: string[] };
type Marquee = { start: Point; end: Point } | null;
type Dragging = {
  componentIds: string[];
  startMouse: Point;
  origins: Record<string, Point>;
  recorded: boolean;
} | null;
type Camera = { x: number; y: number; width: number; height: number };
type Panning = { startClient: Point; startCamera: Camera } | null;

interface Props {
  circuit: CircuitDocument;
  evaluation: EvaluationResult;
  selectedTool: Tool;
  pendingWire: PinRef | null;
  selection: Selection;
  onCanvasAdd: (type: GateType, point: Point) => void;
  onBeginMoveComponent: () => void;
  onMoveComponents: (moves: Array<{ componentId: string; point: Point }>) => void;
  onToggleInput: (componentId: string) => void;
  onSetButtonPressed: (componentId: string, pressed: boolean) => void;
  onPinClick: (pin: PinRef, kind: 'input' | 'output') => void;
  onRemoveWire: (wireId: string) => void;
  onRemoveComponent: (componentId: string) => void;
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

const DEFAULT_CAMERA: Camera = { x: 0, y: 0, width: 1200, height: 720 };
const MIN_ZOOM = 0.25;
const MAX_ZOOM = 4;

export function CircuitCanvas(props: Props) {
  const svgRef = useRef<SVGSVGElement>(null);
  const [dragging, setDragging] = useState<Dragging>(null);
  const [mousePoint, setMousePoint] = useState<Point | null>(null);
  const [marquee, setMarquee] = useState<Marquee>(null);
  const [camera, setCamera] = useState<Camera>(DEFAULT_CAMERA);
  const [panning, setPanning] = useState<Panning>(null);
  const suppressNextClick = useRef(false);
  const componentById = useMemo(
    () => new Map(props.circuit.components.map((component) => [component.id, component])),
    [props.circuit.components],
  );
  const zoomPercent = Math.round((DEFAULT_CAMERA.width / camera.width) * 100);

  useEffect(() => {
    function isEditingText(target: EventTarget | null): boolean {
      const element = target as HTMLElement | null;
      return element?.tagName === 'INPUT' || element?.tagName === 'TEXTAREA' || Boolean(element?.isContentEditable);
    }

    function onKeyDown(event: KeyboardEvent) {
      if (isEditingText(event.target)) return;
      const command = event.ctrlKey || event.metaKey;
      if (!command) return;
      if (event.key === '+' || event.key === '=') {
        event.preventDefault();
        zoomAtCenter(1 / 1.2);
      } else if (event.key === '-') {
        event.preventDefault();
        zoomAtCenter(1.2);
      } else if (event.key === '0') {
        event.preventDefault();
        resetCamera();
      }
    }

    function onBlur() {
      setPanning(null);
    }

    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('blur', onBlur);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('blur', onBlur);
    };
  }, [camera]);

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

  function resetCamera() {
    setCamera(DEFAULT_CAMERA);
  }

  function zoomAtCenter(factor: number) {
    setCamera((current) => zoomCamera(current, factor, {
      x: current.x + current.width / 2,
      y: current.y + current.height / 2,
    }));
  }

  function onWheelZoom(event: WheelEvent<SVGSVGElement>) {
    event.preventDefault();
    const focus = svgPoint(event);
    const delta = Math.max(-80, Math.min(80, event.deltaY));
    const factor = Math.exp(delta * 0.0015);
    setCamera((current) => zoomCamera(current, factor, focus));
  }

  function startPan(event: MouseEvent<SVGSVGElement>) {
    event.preventDefault();
    setPanning({ startClient: { x: event.clientX, y: event.clientY }, startCamera: camera });
    setMarquee(null);
    setDragging(null);
  }

  function onPanMouseDownCapture(event: MouseEvent<SVGSVGElement>) {
    const wantsPan = event.button === 1 || (props.selectedTool === 'pan' && event.button === 0);
    if (!wantsPan) return;
    event.preventDefault();
    event.stopPropagation();
    startPan(event);
  }

  function updatePan(event: MouseEvent<SVGSVGElement>) {
    const svg = svgRef.current;
    if (!svg || !panning) return;
    const rect = svg.getBoundingClientRect();
    const dx = ((event.clientX - panning.startClient.x) * panning.startCamera.width) / rect.width;
    const dy = ((event.clientY - panning.startClient.y) * panning.startCamera.height) / rect.height;
    setCamera({
      ...panning.startCamera,
      x: panning.startCamera.x - dx,
      y: panning.startCamera.y - dy,
    });
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
        finishMarquee(marquee);
        setDragging(null);
        setPanning(null);
      }}
      onMouseLeave={() => {
        finishMarquee(marquee);
        setDragging(null);
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
        <PendingWire pendingWire={props.pendingWire} componentById={componentById} mousePoint={mousePoint} />
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
            onPinClick={props.onPinClick}
          />
        ))}
      </g>
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

function WireView({ wire, componentById, evaluation, selected, onSelect, onContextMenu, onRemove }: {
  wire: Wire;
  componentById: Map<string, LogicComponent>;
  evaluation: EvaluationResult;
  selected: boolean;
  onSelect: () => void;
  onContextMenu: (event: MouseEvent<SVGPathElement>) => void;
  onRemove: () => void;
}) {
  const from = componentById.get(wire.from.componentId);
  const to = componentById.get(wire.to.componentId);
  if (!from || !to) return null;
  const start = getPinPosition(from, wire.from.pinId);
  const end = getPinPosition(to, wire.to.pinId);
  const midX = Math.round((start.x + end.x) / 2);
  const active = Boolean(evaluation[wire.from.componentId]?.[wire.from.pinId]);

  return (
    <path
      d={`M ${start.x} ${start.y} C ${midX} ${start.y}, ${midX} ${end.y}, ${end.x} ${end.y}`}
      className={`wire ${active ? 'on' : ''} ${selected ? 'selected' : ''}`}
      onClick={(event) => {
        event.stopPropagation();
        onSelect();
      }}
      onContextMenu={(event) => {
        event.preventDefault();
        event.stopPropagation();
        onContextMenu(event);
      }}
      onDoubleClick={(event) => {
        event.stopPropagation();
        onRemove();
      }}
    />
  );
}

function PendingWire({ pendingWire, componentById, mousePoint }: {
  pendingWire: PinRef;
  componentById: Map<string, LogicComponent>;
  mousePoint: Point | null;
}) {
  const component = componentById.get(pendingWire.componentId);
  if (!component) return null;
  const start = getPinPosition(component, pendingWire.pinId);
  const end = mousePoint;
  const midX = end ? Math.round((start.x + end.x) / 2) : start.x;

  return (
    <g className="pending-wire-preview">
      {end && (
        <path
          className="wire pending"
          d={`M ${start.x} ${start.y} C ${midX} ${start.y}, ${midX} ${end.y}, ${end.x} ${end.y}`}
        />
      )}
      <circle className="pending-pulse" cx={start.x} cy={start.y} r="12" />
    </g>
  );
}

function ComponentView({ component, evaluation, selected, onMouseDown, onContextMenu, onToggleInput, onSetButtonPressed, onRemove, onPinClick }: {
  component: LogicComponent;
  evaluation: EvaluationResult;
  selected: boolean;
  onMouseDown: (event: MouseEvent<SVGGElement>) => void;
  onContextMenu: (event: MouseEvent<SVGGElement>) => void;
  onToggleInput: () => void;
  onSetButtonPressed: (pressed: boolean) => void;
  onRemove: () => void;
  onPinClick: (pin: PinRef, kind: 'input' | 'output') => void;
}) {
  const definition = COMPONENT_DEFINITIONS[component.type];
  const outputValue = Boolean(evaluation[component.id]?.out);
  const ledValue = Boolean(evaluation[component.id]?.in);
  const buttonPressed = component.type === 'button' && Boolean(component.state);

  return (
    <g
      transform={`translate(${component.x}, ${component.y})`}
      className={`component ${selected ? 'selected' : ''}`}
      onMouseDown={onMouseDown}
      onContextMenu={(event) => {
        event.preventDefault();
        event.stopPropagation();
        onContextMenu(event);
      }}
    >
      <rect className="gate-body" width={definition.width} height={definition.height} rx="14" />
      <g
        className="remove-component"
        transform={`translate(${definition.width - 8}, 8)`}
        onMouseDown={(event) => event.stopPropagation()}
        onClick={(event) => {
          event.stopPropagation();
          onRemove();
        }}
      >
        <circle r="10" />
        <text y="4" textAnchor="middle">×</text>
      </g>
      {component.type === 'led' && <circle className={`led-lens ${ledValue ? 'on' : ''}`} cx={definition.width / 2} cy="26" r="14" />}
      {component.type === 'input' && (
        <g
          onMouseDown={(event) => event.stopPropagation()}
          onClick={(event) => { event.stopPropagation(); onToggleInput(); }}
          className="switch"
        >
          <rect className={`switch-track ${outputValue ? 'on' : ''}`} x="14" y="16" width="44" height="20" rx="10" />
          <circle className="switch-knob" cx={outputValue ? 48 : 24} cy="26" r="8" />
        </g>
      )}
      {component.type === 'button' && (
        <g
          className="pulse-button"
          onMouseDown={(event) => {
            event.stopPropagation();
            onSetButtonPressed(true);
          }}
          onMouseUp={(event) => {
            event.stopPropagation();
            onSetButtonPressed(false);
          }}
          onMouseLeave={() => onSetButtonPressed(false)}
        >
          <circle className={`pulse-button-base ${buttonPressed ? 'on' : ''}`} cx="36" cy="26" r="17" />
          <circle className="pulse-button-cap" cx="36" cy={buttonPressed ? 28 : 23} r="12" />
        </g>
      )}
      {component.type !== 'input' && component.type !== 'button' && component.type !== 'led' && <GateSymbol type={component.type} width={definition.width} height={definition.height} />}
      <text className="component-label" x={definition.width / 2} y={definition.height + 18} textAnchor="middle">
        {component.label ?? definition.label}
      </text>
      {definition.pins.map((pin) => {
        const value = Boolean(evaluation[component.id]?.[pin.id]);
        return (
          <g
            key={pin.id}
            className="pin-hitbox"
            onMouseDown={(event) => event.stopPropagation()}
            onClick={(event) => {
              event.stopPropagation();
              onPinClick({ componentId: component.id, pinId: pin.id }, pin.kind);
            }}
          >
            <circle className={`pin ${pin.kind} ${value ? 'on' : ''}`} cx={pin.offset.x} cy={pin.offset.y} r="7" />
            {pin.kind === 'input' && component.type !== 'led' && (
              <text className="pin-label" x={pin.offset.x + 12} y={pin.offset.y + 4} textAnchor="start">
                {pin.label}
              </text>
            )}
          </g>
        );
      })}
    </g>
  );
}

interface RectBounds {
  x: number;
  y: number;
  width: number;
  height: number;
}

function normalizeRect(start: Point, end: Point): RectBounds {
  const x = Math.min(start.x, end.x);
  const y = Math.min(start.y, end.y);
  return { x, y, width: Math.abs(end.x - start.x), height: Math.abs(end.y - start.y) };
}

function componentBounds(component: LogicComponent): RectBounds {
  const definition = COMPONENT_DEFINITIONS[component.type];
  return { x: component.x, y: component.y, width: definition.width, height: definition.height };
}

function intersects(a: RectBounds, b: RectBounds): boolean {
  return a.x <= b.x + b.width && a.x + a.width >= b.x && a.y <= b.y + b.height && a.y + a.height >= b.y;
}

function containsPoint(rect: RectBounds, point: Point): boolean {
  return point.x >= rect.x && point.x <= rect.x + rect.width && point.y >= rect.y && point.y <= rect.y + rect.height;
}

function wireInRect(wire: Wire, componentById: Map<string, LogicComponent>, rect: RectBounds): boolean {
  const from = componentById.get(wire.from.componentId);
  const to = componentById.get(wire.to.componentId);
  if (!from || !to) return false;
  const start = getPinPosition(from, wire.from.pinId);
  const end = getPinPosition(to, wire.to.pinId);
  return containsPoint(rect, start) && containsPoint(rect, end);
}

function zoomCamera(camera: Camera, factor: number, focus: Point): Camera {
  const currentZoom = DEFAULT_CAMERA.width / camera.width;
  const nextZoom = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, currentZoom / factor));
  const nextWidth = DEFAULT_CAMERA.width / nextZoom;
  const nextHeight = DEFAULT_CAMERA.height / nextZoom;
  const focusRatioX = (focus.x - camera.x) / camera.width;
  const focusRatioY = (focus.y - camera.y) / camera.height;
  return {
    x: focus.x - nextWidth * focusRatioX,
    y: focus.y - nextHeight * focusRatioY,
    width: nextWidth,
    height: nextHeight,
  };
}

function GateSymbol({ type, width, height }: { type: GateType; width: number; height: number }) {
  if (type === 'not') {
    return (
      <g className="gate-symbol">
        <path d={`M 24 14 L 24 ${height - 14} L ${width - 24} ${height / 2} Z`} />
        <circle cx={width - 16} cy={height / 2} r="5" />
      </g>
    );
  }
  return <text className="gate-text" x={width / 2} y={height / 2 + 7} textAnchor="middle">{type.toUpperCase()}</text>;
}
