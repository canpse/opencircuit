import { KeyboardEvent as ReactKeyboardEvent, MouseEvent, WheelEvent, useEffect, useMemo, useRef, useState } from 'react';
import { COMPONENT_DEFINITIONS, getPinPosition } from '../../core/catalog';
import type { CircuitDocument, EvaluationResult, GateType, LogicComponent, PinRef, Point, Wire } from '../../core/types';
import andGateAsset from '../../assets/components/and_gate.png';
import inputSwitchOffAsset from '../../assets/components/input_switch_off.png';
import inputSwitchOnAsset from '../../assets/components/input_switch_on.png';
import ledOffAsset from '../../assets/components/led_off.png';
import ledOnAsset from '../../assets/components/led_green_on.png';
import nandGateAsset from '../../assets/components/nand_gate.png';
import norGateAsset from '../../assets/components/nor_gate.png';
import notGateAsset from '../../assets/components/not_gate.png';
import orGateAsset from '../../assets/components/or_gate.png';
import outputPortAsset from '../../assets/components/output_port.png';
import xnorGateAsset from '../../assets/components/xnor_gate.png';
import xorGateAsset from '../../assets/components/xor_gate.png';

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
type Camera = { x: number; y: number; width: number; height: number };
type Panning = { startClient: Point; startCamera: Camera } | null;
type WireRoute = { wireId: string; points: Point[]; jumps: Point[] };

interface Props {
  circuit: CircuitDocument;
  evaluation: EvaluationResult;
  selectedTool: Tool;
  wireStyle: WireStyle;
  pendingWire: PinRef | null;
  selection: Selection;
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

const DEFAULT_CAMERA: Camera = { x: 0, y: 0, width: 1200, height: 720 };
const MIN_ZOOM = 0.25;
const MAX_ZOOM = 4;
const GATE_ASSETS: Partial<Record<GateType, string>> = {
  and: andGateAsset,
  nand: nandGateAsset,
  or: orGateAsset,
  nor: norGateAsset,
  xor: xorGateAsset,
  xnor: xnorGateAsset,
  not: notGateAsset,
};

export function CircuitCanvas(props: Props) {
  const svgRef = useRef<SVGSVGElement>(null);
  const [dragging, setDragging] = useState<Dragging>(null);
  const [mousePoint, setMousePoint] = useState<Point | null>(null);
  const [marquee, setMarquee] = useState<Marquee>(null);
  const [camera, setCamera] = useState<Camera>(DEFAULT_CAMERA);
  const [panning, setPanning] = useState<Panning>(null);
  const [resizingText, setResizingText] = useState<ResizingText>(null);
  const [dragConnecting, setDragConnecting] = useState<PinRef | null>(null);
  const [editingLabel, setEditingLabel] = useState<{ componentId: string; value: string } | null>(null);
  const labelInputRef = useRef<HTMLInputElement>(null);
  const suppressNextClick = useRef(false);
  const suppressNextPinClick = useRef(false);
  const componentById = useMemo(
    () => new Map(props.circuit.components.map((component) => [component.id, component])),
    [props.circuit.components],
  );
  const wireRoutes = useMemo(
    () => props.wireStyle === 'orthogonal' ? routeCircuitWires(props.circuit.wires, componentById, props.circuit.components) : [],
    [props.wireStyle, props.circuit.wires, componentById, props.circuit.components],
  );
  const routeByWireId = useMemo(
    () => new Map(wireRoutes.map((route) => [route.wireId, route])),
    [wireRoutes],
  );
  const zoomPercent = Math.round((DEFAULT_CAMERA.width / camera.width) * 100);

  useEffect(() => {
    if (!editingLabel) return;
    labelInputRef.current?.focus();
    labelInputRef.current?.select();
  }, [editingLabel?.componentId]);

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

  function startRename(component: LogicComponent) {
    const definition = COMPONENT_DEFINITIONS[component.type];
    props.onSelectComponent(component.id);
    setDragging(null);
    setMarquee(null);
    setEditingLabel({ componentId: component.id, value: component.label ?? definition.label });
  }

  function commitRename() {
    if (!editingLabel) return;
    const component = componentById.get(editingLabel.componentId);
    if (!component) {
      setEditingLabel(null);
      return;
    }
    const label = editingLabel.value.trim();
    if (label) {
      props.onRenameComponent(component.id, label);
    }
    setEditingLabel(null);
  }

  function onLabelEditorKeyDown(event: ReactKeyboardEvent<HTMLInputElement>) {
    if (event.key === 'Enter') {
      event.preventDefault();
      commitRename();
    } else if (event.key === 'Escape') {
      event.preventDefault();
      setEditingLabel(null);
    }
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

function WireView({ wire, route, wireStyle, componentById, evaluation, selected, onSelect, onContextMenu, onRemove }: {
  wire: Wire;
  route: WireRoute | undefined;
  wireStyle: WireStyle;
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
  const points = route?.points ?? (from.id === to.id ? selfLoopRoute(from, start, end, 0) : [start, end]);
  const active = Boolean(evaluation[wire.from.componentId]?.[wire.from.pinId]);
  const d = wireStyle === 'orthogonal' ? orthogonalPath(points, route?.jumps ?? []) : bezierPathFromPoints(points);

  return (
    <path
      d={d}
      className={`wire ${wireStyle === 'orthogonal' ? 'orthogonal' : 'bezier'} ${active ? 'on' : ''} ${selected ? 'selected' : ''}`}
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

function PendingWire({ pendingWire, componentById, components, wireStyle, mousePoint }: {
  pendingWire: PinRef;
  componentById: Map<string, LogicComponent>;
  components: LogicComponent[];
  wireStyle: WireStyle;
  mousePoint: Point | null;
}) {
  const component = componentById.get(pendingWire.componentId);
  if (!component) return null;
  const start = getPinPosition(component, pendingWire.pinId);
  const end = mousePoint;
  const route = end && wireStyle === 'orthogonal' ? routeBetweenPoints(start, end, components, new Set([component.id]), 0) : null;
  const d = end ? (wireStyle === 'orthogonal' && route ? orthogonalPath(route, []) : bezierPath(start, end)) : '';

  return (
    <g className="pending-wire-preview">
      {end && <path className={`wire pending ${wireStyle}`} d={d} />}
      <circle className="pending-pulse" cx={start.x} cy={start.y} r="12" />
    </g>
  );
}

function ComponentView({ component, evaluation, selected, onMouseDown, onContextMenu, onToggleInput, onSetButtonPressed, onRemove, onRenameStart, onResizeStart, onPinMouseDown, onPinMouseUp, onPinClick }: {
  component: LogicComponent;
  evaluation: EvaluationResult;
  selected: boolean;
  onMouseDown: (event: MouseEvent<SVGGElement>) => void;
  onContextMenu: (event: MouseEvent<SVGGElement>) => void;
  onToggleInput: () => void;
  onSetButtonPressed: (pressed: boolean) => void;
  onRemove: () => void;
  onRenameStart: () => void;
  onResizeStart: (event: MouseEvent<SVGRectElement>) => void;
  onPinMouseDown: (pin: PinRef, kind: 'input' | 'output') => void;
  onPinMouseUp: (pin: PinRef, kind: 'input' | 'output') => void;
  onPinClick: (pin: PinRef, kind: 'input' | 'output') => void;
}) {
  const definition = COMPONENT_DEFINITIONS[component.type];
  const bodyWidth = component.type === 'text' ? textComponentWidth(component) : definition.width;
  const labelLines = component.type === 'text' ? wrapText(component.label ?? definition.label, bodyWidth - 42) : [];
  const textBodyHeight = Math.max(definition.height, labelLines.length * 18 + 24);
  const bodyHeight = component.type === 'text' ? textBodyHeight : definition.height;
  const outputValue = Boolean(evaluation[component.id]?.out);
  const ledValue = Boolean(evaluation[component.id]?.in);
  const buttonPressed = component.type === 'button' && Boolean(component.state);
  const gateAsset = GATE_ASSETS[component.type];
  const isCombinationalBlock = !gateAsset && !['input', 'button', 'led', 'text'].includes(component.type);

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
      onDoubleClick={(event) => {
        event.preventDefault();
        event.stopPropagation();
        onRenameStart();
      }}
    >
      <rect className={component.type === 'text' ? 'text-note-body' : 'gate-body'} width={bodyWidth} height={bodyHeight} rx="14" />
      <g
        className="remove-component"
        transform={`translate(${bodyWidth - 8}, 8)`}
        onMouseDown={(event) => event.stopPropagation()}
        onClick={(event) => {
          event.stopPropagation();
          onRemove();
        }}
      >
        <circle r="10" />
        <text y="4" textAnchor="middle">×</text>
      </g>
      {component.type === 'led' && (
        <image
          className="component-asset led-asset"
          href={ledValue ? ledOnAsset : ledOffAsset}
          x={definition.width / 2 - 23}
          y="3"
          width="46"
          height="46"
          preserveAspectRatio="xMidYMid meet"
        />
      )}
      {component.type === 'input' && (
        <image
          className="component-asset input-asset"
          href={outputValue ? inputSwitchOnAsset : inputSwitchOffAsset}
          x="12"
          y="5"
          width="54"
          height="42"
          preserveAspectRatio="xMidYMid meet"
          onClick={(event) => { event.stopPropagation(); onToggleInput(); }}
        />
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
          <rect className="component-hitbox" x="12" y="4" width="62" height="46" rx="10" />
          <image
            className={`component-asset button-asset ${buttonPressed ? 'pressed' : ''}`}
            href={outputPortAsset}
            x="17"
            y={buttonPressed ? 8 : 5}
            width="52"
            height="42"
            preserveAspectRatio="xMidYMid meet"
          />
        </g>
      )}
      {component.type === 'text' && (
        <>
          <text
            className="text-note-label editable-label"
            x="14"
            y="22"
            textAnchor="start"
            onMouseDown={(event) => event.stopPropagation()}
            onClick={(event) => {
              event.preventDefault();
              event.stopPropagation();
              onRenameStart();
            }}
            onDoubleClick={(event) => {
              event.preventDefault();
              event.stopPropagation();
              onRenameStart();
            }}
          >
            {labelLines.map((line, index) => (
              <tspan key={`${line}-${index}`} x="14" dy={index === 0 ? 0 : 18}>{line}</tspan>
            ))}
          </text>
          <rect
            className="text-resize-handle"
            x={bodyWidth - 12}
            y={bodyHeight - 12}
            width="12"
            height="12"
            rx="3"
            onMouseDown={onResizeStart}
          />
        </>
      )}
      {isCombinationalBlock && (
        <text
          className="block-component-title editable-label"
          x={definition.width / 2}
          y="18"
          textAnchor="middle"
          onMouseDown={(event) => event.stopPropagation()}
          onClick={(event) => {
            event.preventDefault();
            event.stopPropagation();
            onRenameStart();
          }}
          onDoubleClick={(event) => {
            event.preventDefault();
            event.stopPropagation();
            onRenameStart();
          }}
        >
          {component.label ?? definition.label}
        </text>
      )}
      {gateAsset && (
        <image
          className="component-asset gate-asset"
          href={gateAsset}
          x="8"
          y="6"
          width={definition.width - 16}
          height={definition.height - 12}
          preserveAspectRatio="xMidYMid meet"
        />
      )}
      {component.type !== 'text' && component.type !== 'input' && component.type !== 'led' && !isCombinationalBlock && (
        <text
          className="component-label editable-label"
          x={definition.width / 2}
          y={definition.height + 18}
          textAnchor="middle"
          onMouseDown={(event) => event.stopPropagation()}
          onClick={(event) => {
            event.preventDefault();
            event.stopPropagation();
            onRenameStart();
          }}
          onDoubleClick={(event) => {
            event.preventDefault();
            event.stopPropagation();
            onRenameStart();
          }}
        >
          {component.label ?? definition.label}
        </text>
      )}
      {definition.pins.map((pin) => {
        const value = Boolean(evaluation[component.id]?.[pin.id]);
        return (
          <g
            key={pin.id}
            className="pin-hitbox"
            onMouseDown={(event) => {
              event.stopPropagation();
              if (event.button !== 0) return;
              onPinMouseDown({ componentId: component.id, pinId: pin.id }, pin.kind);
            }}
            onMouseUp={(event) => {
              if (event.button !== 0) return;
              event.stopPropagation();
              onPinMouseUp({ componentId: component.id, pinId: pin.id }, pin.kind);
            }}
            onClick={(event) => {
              event.stopPropagation();
              onPinClick({ componentId: component.id, pinId: pin.id }, pin.kind);
            }}
          >
            <circle className={`pin ${pin.kind} ${value ? 'on' : ''}`} cx={pin.offset.x} cy={pin.offset.y} r="7" />
            {pin.kind === 'input' && component.type !== 'led' && component.type !== 'not' && (
              <text className="pin-label" x={pin.offset.x + 12} y={pin.offset.y + 4} textAnchor="start">
                {pin.label}
              </text>
            )}
            {pin.kind === 'output' && definition.pins.filter((candidate) => candidate.kind === 'output').length > 1 && (
              <text className="pin-label" x={pin.offset.x - 12} y={pin.offset.y + 4} textAnchor="end">
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
  if (component.type === 'text') {
    const width = textComponentWidth(component);
    const lines = wrapText(component.label ?? definition.label, width - 42);
    return { x: component.x, y: component.y, width, height: Math.max(definition.height, lines.length * 18 + 24) };
  }
  return { x: component.x, y: component.y, width: definition.width, height: definition.height };
}

function textComponentWidth(component: LogicComponent): number {
  return Math.max(90, component.width ?? COMPONENT_DEFINITIONS.text.width);
}

function wrapText(text: string, maxWidth: number): string[] {
  const maxChars = Math.max(5, Math.floor(maxWidth / 10));
  const words = text.split(/\s+/).filter(Boolean);
  if (words.length === 0) return ['Texto'];
  const lines: string[] = [];
  let current = '';
  for (const word of words) {
    if (word.length > maxChars) {
      if (current) {
        lines.push(current);
        current = '';
      }
      for (let index = 0; index < word.length; index += maxChars) {
        lines.push(word.slice(index, index + maxChars));
      }
      continue;
    }
    const next = current ? `${current} ${word}` : word;
    if (next.length > maxChars && current) {
      lines.push(current);
      current = word;
    } else {
      current = next;
    }
  }
  if (current) lines.push(current);
  return lines;
}

function routeCircuitWires(wires: Wire[], componentById: Map<string, LogicComponent>, components: LogicComponent[]): WireRoute[] {
  const routes = wires.map((wire, index) => {
    const from = componentById.get(wire.from.componentId);
    const to = componentById.get(wire.to.componentId);
    if (!from || !to) return { wireId: wire.id, points: [], jumps: [] };
    const start = getPinPosition(from, wire.from.pinId);
    const end = getPinPosition(to, wire.to.pinId);
    const ignore = new Set([from.id, to.id]);
    const points = from.id === to.id ? selfLoopRoute(from, start, end, index) : routeBetweenPoints(start, end, components, ignore, index);
    return { wireId: wire.id, points, jumps: [] };
  });

  return routes.map((route, index) => ({
    ...route,
    jumps: findWireJumps(route, routes.filter((_, otherIndex) => otherIndex !== index)),
  }));
}

function selfLoopRoute(component: LogicComponent, start: Point, end: Point, index: number): Point[] {
  const bounds = componentBounds(component);
  const lane = 34 + (index % 4) * 14;
  const firstX = Math.max(start.x, bounds.x + bounds.width) + lane;
  const topY = bounds.y - lane;
  const leftX = bounds.x - lane;

  return compactRoute([
    start,
    { x: firstX, y: start.y },
    { x: firstX, y: topY },
    { x: leftX, y: topY },
    { x: leftX, y: end.y },
    end,
  ]);
}

function routeBetweenPoints(start: Point, end: Point, components: LogicComponent[], ignoreComponentIds: Set<string>, index: number): Point[] {
  const offset = ((index % 5) - 2) * 10;
  const midX = Math.round((start.x + end.x) / 2) + offset;
  const margin = 34 + Math.abs(offset);
  const obstacles = components
    .filter((component) => !ignoreComponentIds.has(component.id))
    .map((component) => inflateRect(componentBounds(component), 14));
  const allBounds = components.map(componentBounds);
  const minY = Math.min(start.y, end.y, ...allBounds.map((rect) => rect.y)) - margin;
  const maxY = Math.max(start.y, end.y, ...allBounds.map((rect) => rect.y + rect.height)) + margin;
  const candidates: Point[][] = [
    compactRoute([start, { x: midX, y: start.y }, { x: midX, y: end.y }, end]),
    compactRoute([start, { x: start.x + margin, y: start.y }, { x: start.x + margin, y: end.y }, end]),
    compactRoute([start, { x: end.x - margin, y: start.y }, { x: end.x - margin, y: end.y }, end]),
    compactRoute([start, { x: start.x + margin, y: start.y }, { x: start.x + margin, y: minY }, { x: end.x - margin, y: minY }, { x: end.x - margin, y: end.y }, end]),
    compactRoute([start, { x: start.x + margin, y: start.y }, { x: start.x + margin, y: maxY }, { x: end.x - margin, y: maxY }, { x: end.x - margin, y: end.y }, end]),
  ];
  return candidates
    .map((points) => ({ points, collisions: countRouteCollisions(points, obstacles), length: routeLength(points) }))
    .sort((a, b) => a.collisions - b.collisions || a.length - b.length)[0].points;
}

function compactRoute(points: Point[]): Point[] {
  return points.filter((point, index) => {
    const previous = points[index - 1];
    return !previous || previous.x !== point.x || previous.y !== point.y;
  });
}

function inflateRect(rect: RectBounds, amount: number): RectBounds {
  return { x: rect.x - amount, y: rect.y - amount, width: rect.width + amount * 2, height: rect.height + amount * 2 };
}

function countRouteCollisions(points: Point[], obstacles: RectBounds[]): number {
  return routeSegments(points).reduce(
    (count, segment) => count + obstacles.filter((rect) => segmentIntersectsRect(segment.a, segment.b, rect)).length,
    0,
  );
}

function routeLength(points: Point[]): number {
  return routeSegments(points).reduce((sum, segment) => sum + Math.abs(segment.a.x - segment.b.x) + Math.abs(segment.a.y - segment.b.y), 0);
}

function routeSegments(points: Point[]): Array<{ a: Point; b: Point }> {
  return points.slice(0, -1).map((point, index) => ({ a: point, b: points[index + 1] }));
}

function segmentIntersectsRect(a: Point, b: Point, rect: RectBounds): boolean {
  if (a.x === b.x) {
    const y1 = Math.min(a.y, b.y);
    const y2 = Math.max(a.y, b.y);
    return a.x >= rect.x && a.x <= rect.x + rect.width && y2 >= rect.y && y1 <= rect.y + rect.height;
  }
  if (a.y === b.y) {
    const x1 = Math.min(a.x, b.x);
    const x2 = Math.max(a.x, b.x);
    return a.y >= rect.y && a.y <= rect.y + rect.height && x2 >= rect.x && x1 <= rect.x + rect.width;
  }
  return false;
}

function findWireJumps(route: WireRoute, otherRoutes: WireRoute[]): Point[] {
  const jumps: Point[] = [];
  for (const segment of routeSegments(route.points)) {
    if (segment.a.y !== segment.b.y) continue;
    const minX = Math.min(segment.a.x, segment.b.x) + 12;
    const maxX = Math.max(segment.a.x, segment.b.x) - 12;
    for (const other of otherRoutes) {
      for (const otherSegment of routeSegments(other.points)) {
        if (otherSegment.a.x !== otherSegment.b.x) continue;
        const x = otherSegment.a.x;
        const y = segment.a.y;
        const otherMinY = Math.min(otherSegment.a.y, otherSegment.b.y) + 8;
        const otherMaxY = Math.max(otherSegment.a.y, otherSegment.b.y) - 8;
        if (x > minX && x < maxX && y > otherMinY && y < otherMaxY) jumps.push({ x, y });
      }
    }
  }
  return jumps;
}

function bezierPathFromPoints(points: Point[]): string {
  if (points.length <= 2) return bezierPath(points[0], points[1]);
  return roundedPolylinePath(points, 18);
}

function roundedPolylinePath(points: Point[], radius: number): string {
  if (points.length === 0) return '';
  if (points.length === 1) return `M ${points[0].x} ${points[0].y}`;

  const commands = [`M ${points[0].x} ${points[0].y}`];
  for (let index = 1; index < points.length - 1; index += 1) {
    const previous = points[index - 1];
    const current = points[index];
    const next = points[index + 1];
    const before = pointToward(current, previous, radius);
    const after = pointToward(current, next, radius);
    commands.push(`L ${before.x} ${before.y}`);
    commands.push(`Q ${current.x} ${current.y} ${after.x} ${after.y}`);
  }
  const last = points[points.length - 1];
  commands.push(`L ${last.x} ${last.y}`);
  return commands.join(' ');
}

function pointToward(from: Point, to: Point, distance: number): Point {
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  const length = Math.max(1, Math.abs(dx) + Math.abs(dy));
  const amount = Math.min(distance, length / 2);
  return {
    x: from.x + Math.sign(dx) * amount,
    y: from.y + Math.sign(dy) * amount,
  };
}

function bezierPath(start: Point, end: Point): string {
  const midX = Math.round((start.x + end.x) / 2);
  return `M ${start.x} ${start.y} C ${midX} ${start.y}, ${midX} ${end.y}, ${end.x} ${end.y}`;
}

function orthogonalPath(points: Point[], jumps: Point[]): string {
  if (points.length === 0) return '';
  const commands = [`M ${points[0].x} ${points[0].y}`];
  for (const segment of routeSegments(points)) {
    const segmentJumps = jumps
      .filter((jump) => pointOnSegment(jump, segment.a, segment.b))
      .sort((left, right) => distanceAlongSegment(segment.a, left) - distanceAlongSegment(segment.a, right));
    if (segment.a.y === segment.b.y && segmentJumps.length > 0) {
      const direction = segment.b.x >= segment.a.x ? 1 : -1;
      for (const jump of segmentJumps) {
        commands.push(`L ${jump.x - direction * 8} ${jump.y}`);
        commands.push(`Q ${jump.x} ${jump.y - 10} ${jump.x + direction * 8} ${jump.y}`);
      }
    }
    commands.push(`L ${segment.b.x} ${segment.b.y}`);
  }
  return commands.join(' ');
}

function pointOnSegment(point: Point, a: Point, b: Point): boolean {
  if (a.y === b.y && point.y === a.y) return point.x > Math.min(a.x, b.x) && point.x < Math.max(a.x, b.x);
  if (a.x === b.x && point.x === a.x) return point.y > Math.min(a.y, b.y) && point.y < Math.max(a.y, b.y);
  return false;
}

function distanceAlongSegment(start: Point, point: Point): number {
  return Math.abs(point.x - start.x) + Math.abs(point.y - start.y);
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
