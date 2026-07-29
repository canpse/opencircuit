import { MouseEvent, useEffect, useMemo, useRef } from 'react';
import type { RefObject } from 'react';
import { getPinPosition, resolveComponentDefinition } from '../../core/catalog';
import { ComponentView } from './ComponentView';
import { isPinActive } from './canvasMemo';
import { useEventCallback } from '../hooks/useEventCallback';
import {
  componentBounds,
  orthogonalPath,
  textComponentWidth,
  waypointInsertionIndex,
} from './wireRouting';
import { PendingWire, WireView } from './WireView';
import { useLabelEditing } from './useLabelEditing';
import { CanvasViewport, type CanvasCameraCommands } from './CanvasViewport';
import type { EditorTool, Selection, WireStyle } from './editorTypes';
import { useCanvasInteractionState, type Marquee } from './useCanvasInteractionState';
import { useCanvasDerivedState } from './useCanvasDerivedState';
import { normalizeRect, useCanvasPointerInteractions } from './useCanvasPointerInteractions';
import type {
  CircuitDefinition,
  CircuitDocument,
  EvaluationResult,
  GateType,
  LogicComponent,
  PinRef,
  Point,
} from '../../core/types';

export type { WireStyle } from './editorTypes';

interface Props {
  cameraCommandsRef?: RefObject<CanvasCameraCommands | null>;
  circuit: CircuitDocument;
  evaluation: EvaluationResult;
  changedSignals: ReadonlyMap<string, number>;
  selectedTool: EditorTool;
  wireStyle: WireStyle;
  pendingWire: PinRef | null;
  selection: Selection;
  renameRequest: { componentId: string; nonce: number } | null;
  onRenameRequestHandled: () => void;
  definitions?: CircuitDefinition[];
  pendingSubcircuitDefinitionId?: string | null;
  onCanvasAdd: (type: GateType, point: Point, definitionId?: string) => void;
  onBeginMoveComponent: () => void;
  onMoveComponents: (moves: Array<{ componentId: string; point: Point }>) => void;
  onResizeTextComponent: (componentId: string, width: number) => void;
  onToggleInput: (componentId: string) => void;
  onSetButtonPressed: (componentId: string, pressed: boolean) => void;
  onPinClick: (pin: PinRef, kind: 'input' | 'output') => void;
  onEnterInstance: (componentId: string) => void;
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
  onSelectTool: (tool: EditorTool) => void;
}

export function CircuitCanvas(props: Props) {
  const { renameRequest, onRenameRequestHandled } = props;
  const definitions = useMemo(() => props.definitions ?? [], [props.definitions]);
  const svgRef = useRef<SVGSVGElement>(null);
  const {
    dragging,
    setDragging,
    mousePoint,
    setMousePoint,
    marquee,
    setMarquee,
    resizingText,
    setResizingText,
    dragConnecting,
    setDragConnecting,
    wireWaypointDrag,
    setWireWaypointDrag,
    suppressNextClickRef,
    suppressNextPinClickRef,
  } = useCanvasInteractionState();
  const {
    layoutComponents,
    componentById,
    routeByWireId,
    wireTrunks,
    branchTrunkByWireId,
    tunnelFromOffsetByWireId,
    changedPinsByComponentId,
    selectedComponentIds,
    selectedWireIds,
  } = useCanvasDerivedState({
    circuit: props.circuit,
    definitions,
    wireStyle: props.wireStyle,
    changedSignals: props.changedSignals,
    selection: props.selection,
  });
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
    definitions,
  );

  useEffect(() => {
    if (!renameRequest) return;
    const component = componentById.get(renameRequest.componentId);
    if (component) startRename(component);
    onRenameRequestHandled();
  }, [renameRequest, onRenameRequestHandled, componentById, startRename]);

  const pointerInteractions = useCanvasPointerInteractions({
    svgRef,
    circuit: props.circuit,
    definitions,
    componentById,
    selectedTool: props.selectedTool,
    pendingWire: Boolean(props.pendingWire),
    pendingSubcircuitDefinitionId: props.pendingSubcircuitDefinitionId,
    dragging,
    setDragging,
    marquee,
    setMarquee,
    resizingText,
    setResizingText,
    dragConnecting: Boolean(dragConnecting),
    setDragConnecting,
    wireWaypointDrag,
    setWireWaypointDrag,
    setMousePoint,
    suppressNextClickRef,
    onCanvasAdd: props.onCanvasAdd,
    onBeginMoveComponent: props.onBeginMoveComponent,
    onMoveComponents: props.onMoveComponents,
    onResizeTextComponent: props.onResizeTextComponent,
    onAddWireWaypoint: props.onAddWireWaypoint,
    onBeginMoveWireWaypoint: props.onBeginMoveWireWaypoint,
    onMoveWireWaypoint: props.onMoveWireWaypoint,
    onCancelPendingWire: props.onCancelPendingWire,
    onOpenCanvasMenu: props.onOpenCanvasMenu,
    onSelectItems: props.onSelectItems,
    onClearSelection: props.onClearSelection,
    onSelectTool: props.onSelectTool,
  });
  const { svgPoint } = pointerInteractions;

  // O mousePoint só é acompanhado enquanto há fio pendente (ver
  // onMouseMove); ao iniciar um fio, semeia a posição com o próprio pino
  // para a prévia não partir de uma coordenada antiga.
  function seedPendingWireMousePoint(pin: PinRef) {
    const component = componentById.get(pin.componentId);
    if (component) setMousePoint(getPinPosition(component, pin.pinId, definitions));
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
              getPinPosition(fromComponent, wire.from.pinId, definitions),
              ...(wire.waypoints ?? []),
              getPinPosition(toComponent, wire.to.pinId, definitions),
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
  const handleEnterInstance = useEventCallback((componentId: string) =>
    props.onEnterInstance(componentId),
  );
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
    suppressNextPinClickRef.current = true;
  });
  const handlePinClick = useEventCallback((pin: PinRef, kind: 'input' | 'output') => {
    if (suppressNextPinClickRef.current) {
      suppressNextPinClickRef.current = false;
      return;
    }
    if (kind === 'output') seedPendingWireMousePoint(pin);
    props.onPinClick(pin, kind);
  });

  return (
    <div className="canvas-wrap">
      <CanvasViewport
        svgRef={svgRef}
        cameraCommandsRef={props.cameraCommandsRef}
        panToolSelected={props.selectedTool === 'pan'}
        componentCount={props.circuit.components.length}
        wireCount={props.circuit.wires.length}
        wireStyle={props.wireStyle}
        onBeginPan={() => {
          setMarquee(null);
          setDragging(null);
        }}
        onClick={pointerInteractions.onClick}
        onContextMenu={pointerInteractions.onContextMenu}
        onMouseDown={pointerInteractions.onMouseDown}
        onMouseMove={pointerInteractions.onMouseMove}
        onMouseUp={pointerInteractions.onMouseUp}
        onMouseLeave={pointerInteractions.onMouseLeave}
        onDragOver={(event) => event.preventDefault()}
        onDrop={pointerInteractions.onDrop}
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
          {wireTrunks.map((trunk) => {
            const junction = trunk.stemPoints[trunk.stemPoints.length - 1];
            const active = isPinActive(
              props.evaluation[trunk.from.componentId]?.[trunk.from.pinId],
            );
            const jumps = routeByWireId.get(trunk.branchWireIds[0])?.jumps ?? [];
            return (
              <g key={`trunk-${trunk.from.componentId}-${trunk.from.pinId}`}>
                <path
                  className={`wire orthogonal wire-trunk-stem ${active ? 'on' : ''}`}
                  d={orthogonalPath(trunk.stemPoints, jumps)}
                />
                <circle
                  className={`wire-trunk-junction ${active ? 'on' : ''}`}
                  cx={junction.x}
                  cy={junction.y}
                />
              </g>
            );
          })}
          {props.circuit.wires.map((wire) => {
            const fromComponent = componentById.get(wire.from.componentId);
            const toComponent = componentById.get(wire.to.componentId);
            if (!fromComponent || !toComponent) return null;
            const route = routeByWireId.get(wire.id);
            const trunk = branchTrunkByWireId.get(wire.id);
            const effectiveRoute =
              trunk && route
                ? { ...route, points: route.points.slice(trunk.stemPoints.length - 1) }
                : route;
            return (
              <WireView
                key={wire.id}
                wire={wire}
                route={effectiveRoute}
                wireStyle={props.wireStyle}
                fromComponent={fromComponent}
                toComponent={toComponent}
                active={isPinActive(props.evaluation[wire.from.componentId]?.[wire.from.pinId])}
                selected={selectedWireIds.has(wire.id)}
                tunnelFromOffset={tunnelFromOffsetByWireId.get(wire.id) ?? 0}
                definitions={definitions}
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
            definitions={definitions}
          />
        )}

        {marquee && <MarqueeRect marquee={marquee} />}

        <g className="components">
          {props.circuit.components.map((component) => (
            <ComponentView
              key={component.id}
              component={component}
              values={props.evaluation[component.id]}
              changedPins={changedPinsByComponentId.get(component.id)}
              selected={selectedComponentIds.has(component.id)}
              onMouseDown={handleComponentMouseDown}
              onContextMenu={handleComponentContextMenu}
              onToggleInput={handleToggleInput}
              onSetButtonPressed={handleSetButtonPressed}
              onRemove={handleComponentRemove}
              onRenameStart={handleRenameStart}
              onEnterInstance={handleEnterInstance}
              onResizeStart={handleResizeStart}
              onPinMouseDown={handlePinMouseDown}
              onPinMouseUp={handlePinMouseUp}
              onPinClick={handlePinClick}
              definitions={definitions}
            />
          ))}
        </g>

        {editingLabel &&
          (() => {
            const component = componentById.get(editingLabel.componentId);
            if (!component) return null;
            const definition = resolveComponentDefinition(component, definitions);
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
