import { MouseEvent, useEffect, useMemo, useRef, useState } from 'react';
import { COMPONENT_DEFINITIONS, getPinPosition } from '../../core/catalog';
import { ComponentView } from './ComponentView';
import { useCanvasLayoutComponents } from './canvasMemo';
import { useEventCallback } from '../hooks/useEventCallback';
import {
  componentBounds,
  intersects,
  routeCircuitWires,
  textComponentWidth,
  waypointInsertionIndex,
  wireInRect,
  type RectBounds,
} from './wireRouting';
import { PendingWire, WireView } from './WireView';
import { useLabelEditing } from './useLabelEditing';
import { measureProfile } from '../../performance/profiling';
import { CanvasViewport } from './CanvasViewport';
import type {
  CircuitDocument,
  EvaluationResult,
  GateType,
  LogicComponent,
  PinRef,
  Point,
} from '../../core/types';

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
type WireWaypointDrag = {
  wireId: string;
  waypointIndex: number;
  isNew: boolean;
  startMouse: Point;
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
  onRenameWire: (wireId: string, label: string) => void;
  onAddWireWaypoint: (wireId: string, waypointIndex: number, point: Point) => void;
  onBeginMoveWireWaypoint: () => void;
  onMoveWireWaypoint: (wireId: string, waypointIndex: number, point: Point) => void;
  onRemoveWireWaypoint: (wireId: string, waypointIndex: number) => void;
  onRemoveComponent: (componentId: string) => void;
  onRenameComponent: (componentId: string, label: string) => void;
  onCancelPendingWire: () => void;
  onOpenCanvasMenu: (x: number, y: number, point: Point) => void;
  onOpenComponentMenu: (x: number, y: number, componentId: string) => void;
  onOpenWireMenu: (x: number, y: number, wireId: string) => void;
  onOpenWaypointMenu: (x: number, y: number, wireId: string, waypointIndex: number) => void;
  onSelectComponent: (componentId: string) => void;
  onSelectWire: (wireId: string) => void;
  onSelectItems: (selection: Selection) => void;
  onClearSelection: () => void;
  onSelectTool: (tool: Tool) => void;
}

export function CircuitCanvas(props: Props) {
  const { renameRequest, onRenameRequestHandled } = props;
  const svgRef = useRef<SVGSVGElement>(null);
  const [dragging, setDragging] = useState<Dragging>(null);
  const [mousePoint, setMousePoint] = useState<Point | null>(null);
  const [marquee, setMarquee] = useState<Marquee>(null);
  const [resizingText, setResizingText] = useState<ResizingText>(null);
  const [dragConnecting, setDragConnecting] = useState<PinRef | null>(null);
  const [wireWaypointDrag, setWireWaypointDrag] = useState<WireWaypointDrag>(null);

  const suppressNextClick = useRef(false);
  const suppressNextPinClick = useRef(false);
  // Lista com identidade estável enquanto o layout não muda: um tick de
  // clock (que só altera state/memory) não invalida componentById nem as
  // rotas, mantendo o React.memo dos fios e componentes efetivo.
  const layoutComponents = useCanvasLayoutComponents(props.circuit.components);
  const componentById = useMemo(
    () => new Map(layoutComponents.map((component) => [component.id, component])),
    [layoutComponents],
  );
  const wireRoutes = useMemo(() => {
    const routedWires = props.wireStyle === 'orthogonal' ? props.circuit.wires : [];
    if (routedWires.length === 0) return [];
    return measureProfile(
      'routing.orthogonal',
      {
        components: layoutComponents.length,
        wires: routedWires.length,
      },
      () => routeCircuitWires(routedWires, componentById, layoutComponents),
    );
  }, [props.wireStyle, props.circuit.wires, componentById, layoutComponents]);
  const routeByWireId = useMemo(
    () => new Map(wireRoutes.map((route) => [route.wireId, route])),
    [wireRoutes],
  );
  const selectedComponentIds = useMemo(
    () => new Set(props.selection.componentIds),
    [props.selection.componentIds],
  );
  const selectedWireIds = useMemo(
    () => new Set(props.selection.wireIds),
    [props.selection.wireIds],
  );
  const {
    editingLabel,
    setEditingLabel,
    labelInputRef,
    startRename,
    commitRename,
    onLabelEditorKeyDown,
  } = useLabelEditing(componentById, props.onSelectComponent, props.onRenameComponent, () => {
    setDragging(null);
    setMarquee(null);
  });

  useEffect(() => {
    if (!renameRequest) return;
    const component = componentById.get(renameRequest.componentId);
    if (component) startRename(component);
    onRenameRequestHandled();
  }, [renameRequest, onRenameRequestHandled, componentById, startRename]);

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

    if (
      props.selectedTool !== 'select' &&
      props.selectedTool !== 'wire' &&
      props.selectedTool !== 'pan'
    ) {
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

  // O mousePoint só é acompanhado enquanto há fio pendente (ver
  // onMouseMove); ao iniciar um fio, semeia a posição com o próprio pino
  // para a prévia não partir de uma coordenada antiga.
  function seedPendingWireMousePoint(pin: PinRef) {
    const component = componentById.get(pin.componentId);
    if (component) setMousePoint(getPinPosition(component, pin.pinId));
  }

  // Handlers com identidade permanente (useEventCallback) e parametrizados
  // por ID: sem arrow functions novas a cada render dentro dos .map(), o
  // React.memo dos filhos passa a bloquear reconciliações de verdade.
  const handleWireSelect = useEventCallback((wireId: string) => props.onSelectWire(wireId));
  const handleWireContextMenu = useEventCallback((event: MouseEvent<SVGElement>, wireId: string) =>
    props.onOpenWireMenu(event.clientX, event.clientY, wireId),
  );
  const handleWireMouseDown = useEventCallback(
    (event: MouseEvent<SVGPathElement>, wireId: string) => {
      if (event.button !== 0 || props.selectedTool !== 'select') return;
      event.stopPropagation();
      const startMouse = svgPoint(event);
      const wire = props.circuit.wires.find((candidate) => candidate.id === wireId);
      const route = routeByWireId.get(wireId);
      const fromComponent = wire ? componentById.get(wire.from.componentId) : null;
      const toComponent = wire ? componentById.get(wire.to.componentId) : null;
      const curvePoints =
        wire && fromComponent && toComponent
          ? [
              getPinPosition(fromComponent, wire.from.pinId),
              ...(wire.waypoints ?? []),
              getPinPosition(toComponent, wire.to.pinId),
            ]
          : [];
      setWireWaypointDrag({
        wireId,
        waypointIndex: waypointInsertionIndex(
          props.wireStyle === 'orthogonal' ? (route?.points ?? []) : curvePoints,
          wire?.waypoints ?? [],
          startMouse,
        ),
        isNew: true,
        startMouse,
        recorded: false,
      });
    },
  );
  const handleWaypointMouseDown = useEventCallback(
    (event: MouseEvent<SVGCircleElement>, wireId: string, waypointIndex: number) => {
      if (props.selectedTool !== 'select') return;
      setWireWaypointDrag({
        wireId,
        waypointIndex,
        isNew: false,
        startMouse: svgPoint(event),
        recorded: false,
      });
    },
  );
  const handleWaypointContextMenu = useEventCallback(
    (event: MouseEvent<SVGCircleElement>, wireId: string, waypointIndex: number) =>
      props.onOpenWaypointMenu(event.clientX, event.clientY, wireId, waypointIndex),
  );

  const handleComponentMouseDown = useEventCallback(
    (event: MouseEvent<SVGGElement>, componentId: string) => {
      const point = svgPoint(event);
      const componentIds = props.selection.componentIds.includes(componentId)
        ? props.selection.componentIds
        : [componentId];
      if (!props.selection.componentIds.includes(componentId)) {
        props.onSelectComponent(componentId);
      }
      const origins = Object.fromEntries(
        componentIds
          .map((selectedId) => componentById.get(selectedId))
          .filter((selectedComponent): selectedComponent is LogicComponent =>
            Boolean(selectedComponent),
          )
          .map((selectedComponent) => [
            selectedComponent.id,
            { x: selectedComponent.x, y: selectedComponent.y },
          ]),
      );
      setDragging({
        componentIds: Object.keys(origins),
        startMouse: point,
        origins,
        recorded: false,
      });
    },
  );
  const handleComponentContextMenu = useEventCallback(
    (event: MouseEvent<SVGGElement>, componentId: string) =>
      props.onOpenComponentMenu(event.clientX, event.clientY, componentId),
  );
  const handleToggleInput = useEventCallback((componentId: string) =>
    props.onToggleInput(componentId),
  );
  const handleSetButtonPressed = useEventCallback((componentId: string, pressed: boolean) =>
    props.onSetButtonPressed(componentId, pressed),
  );
  const handleComponentRemove = useEventCallback((componentId: string) =>
    props.onRemoveComponent(componentId),
  );
  const handleRenameStart = useEventCallback((componentId: string) => {
    const component = componentById.get(componentId);
    if (component) startRename(component);
  });
  const handleResizeStart = useEventCallback(
    (event: MouseEvent<SVGRectElement>, componentId: string) => {
      const component = componentById.get(componentId);
      if (!component) return;
      event.stopPropagation();
      const point = svgPoint(event);
      props.onSelectComponent(componentId);
      setDragging(null);
      setResizingText({
        componentId,
        startMouse: point,
        startWidth: textComponentWidth(component),
        recorded: false,
      });
    },
  );
  const handlePinMouseDown = useEventCallback((pin: PinRef, kind: 'input' | 'output') => {
    if (kind !== 'output') return;
    seedPendingWireMousePoint(pin);
    props.onPinClick(pin, kind);
    setDragConnecting(pin);
  });
  const handlePinMouseUp = useEventCallback((pin: PinRef, kind: 'input' | 'output') => {
    if (!dragConnecting || kind !== 'input') return;
    props.onPinClick(pin, kind);
    setDragConnecting(null);
    suppressNextPinClick.current = true;
  });
  const handlePinClick = useEventCallback((pin: PinRef, kind: 'input' | 'output') => {
    if (suppressNextPinClick.current) {
      suppressNextPinClick.current = false;
      return;
    }
    if (kind === 'output') seedPendingWireMousePoint(pin);
    props.onPinClick(pin, kind);
  });

  return (
    <div className="canvas-wrap">
      <CanvasViewport
        svgRef={svgRef}
        panToolSelected={props.selectedTool === 'pan'}
        componentCount={props.circuit.components.length}
        wireCount={props.circuit.wires.length}
        wireStyle={props.wireStyle}
        onBeginPan={() => {
          setMarquee(null);
          setDragging(null);
        }}
        onClick={onCanvasClick}
        onContextMenu={(event) => {
          event.preventDefault();
          if (!isBackgroundEvent(event)) return;
          props.onOpenCanvasMenu(event.clientX, event.clientY, svgPoint(event));
        }}
        onMouseDown={onCanvasMouseDown}
        onMouseMove={(event) => {
          const point = svgPoint(event);
          // Só a prévia do fio pendente consome o mousePoint; acompanhar o
          // mouse fora desse caso re-renderizaria o canvas a cada pixel.
          if (props.pendingWire) setMousePoint(point);
          if (wireWaypointDrag) {
            const distance =
              Math.abs(point.x - wireWaypointDrag.startMouse.x) +
              Math.abs(point.y - wireWaypointDrag.startMouse.y);
            if (!wireWaypointDrag.recorded && distance <= 4) return;

            if (!wireWaypointDrag.recorded) {
              if (wireWaypointDrag.isNew) {
                props.onAddWireWaypoint(
                  wireWaypointDrag.wireId,
                  wireWaypointDrag.waypointIndex,
                  wireWaypointDrag.startMouse,
                );
              } else {
                props.onBeginMoveWireWaypoint();
              }
              setWireWaypointDrag({ ...wireWaypointDrag, recorded: true });
              props.onMoveWireWaypoint(
                wireWaypointDrag.wireId,
                wireWaypointDrag.waypointIndex,
                point,
              );
            } else {
              props.onMoveWireWaypoint(
                wireWaypointDrag.wireId,
                wireWaypointDrag.waypointIndex,
                point,
              );
            }
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
            props.onResizeTextComponent(
              resizingText.componentId,
              Math.max(90, resizingText.startWidth + point.x - resizingText.startMouse.x),
            );
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
          setWireWaypointDrag(null);
        }}
        onMouseLeave={() => {
          if (dragConnecting) {
            props.onCancelPendingWire();
            setDragConnecting(null);
          }
          finishMarquee(marquee);
          setDragging(null);
          setResizingText(null);
          setMousePoint(null);
          setWireWaypointDrag(null);
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
            <path
              d="M 20 0 L 0 0 0 20"
              fill="none"
              stroke="rgba(47, 79, 79, 0.12)"
              strokeWidth="1"
            />
          </pattern>
          <linearGradient id="gateFace" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0" stopColor="#ffffff" />
            <stop offset="1" stopColor="#e7edf2" />
          </linearGradient>
        </defs>
        <g className="wires">
          {props.circuit.wires.map((wire) => {
            const fromComponent = componentById.get(wire.from.componentId);
            const toComponent = componentById.get(wire.to.componentId);
            if (!fromComponent || !toComponent) return null;
            return (
              <WireView
                key={wire.id}
                wire={wire}
                route={routeByWireId.get(wire.id)}
                wireStyle={props.wireStyle}
                fromComponent={fromComponent}
                toComponent={toComponent}
                active={Boolean(props.evaluation[wire.from.componentId]?.[wire.from.pinId])}
                selected={selectedWireIds.has(wire.id)}
                onSelect={handleWireSelect}
                onContextMenu={handleWireContextMenu}
                onRename={props.onRenameWire}
                onWireMouseDown={handleWireMouseDown}
                onWaypointMouseDown={handleWaypointMouseDown}
                onWaypointContextMenu={handleWaypointContextMenu}
                onRemoveWaypoint={props.onRemoveWireWaypoint}
              />
            );
          })}
        </g>

        {props.pendingWire && !dragging && (
          <PendingWire
            pendingWire={props.pendingWire}
            componentById={componentById}
            components={layoutComponents}
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
              values={props.evaluation[component.id]}
              selected={selectedComponentIds.has(component.id)}
              onMouseDown={handleComponentMouseDown}
              onContextMenu={handleComponentContextMenu}
              onToggleInput={handleToggleInput}
              onSetButtonPressed={handleSetButtonPressed}
              onRemove={handleComponentRemove}
              onRenameStart={handleRenameStart}
              onResizeStart={handleResizeStart}
              onPinMouseDown={handlePinMouseDown}
              onPinMouseUp={handlePinMouseUp}
              onPinClick={handlePinClick}
            />
          ))}
        </g>

        {editingLabel &&
          (() => {
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
                  onChange={(event) =>
                    setEditingLabel({ ...editingLabel, value: event.target.value })
                  }
                  onKeyDown={onLabelEditorKeyDown}
                  onBlur={commitRename}
                  onMouseDown={(event) => event.stopPropagation()}
                  onClick={(event) => event.stopPropagation()}
                />
              </foreignObject>
            );
          })()}
      </CanvasViewport>
    </div>
  );
}

function MarqueeRect({ marquee }: { marquee: NonNullable<Marquee> }) {
  const rect = normalizeRect(marquee.start, marquee.end);
  return (
    <rect
      className="marquee-selection"
      x={rect.x}
      y={rect.y}
      width={rect.width}
      height={rect.height}
    />
  );
}

function normalizeRect(start: Point, end: Point): RectBounds {
  const x = Math.min(start.x, end.x);
  const y = Math.min(start.y, end.y);
  return { x, y, width: Math.abs(end.x - start.x), height: Math.abs(end.y - start.y) };
}
