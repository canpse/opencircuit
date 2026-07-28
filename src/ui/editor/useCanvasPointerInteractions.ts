import type { Dispatch, DragEvent, MouseEvent, RefObject, SetStateAction } from 'react';
import type {
  CircuitDefinition,
  CircuitDocument,
  GateType,
  LogicComponent,
  PinRef,
  Point,
} from '../../core/types';
import { COMPONENT_DEFINITIONS } from '../../core/catalog';
import type { EditorTool, Selection } from './editorTypes';
import { componentBounds, intersects, wireInRect, type RectBounds } from './wireRouting';
import type {
  ComponentDrag,
  Marquee,
  TextResize,
  WireWaypointDrag,
} from './useCanvasInteractionState';

interface Options {
  svgRef: RefObject<SVGSVGElement | null>;
  circuit: CircuitDocument;
  definitions: CircuitDefinition[];
  componentById: Map<string, LogicComponent>;
  selectedTool: EditorTool;
  pendingWire: boolean;
  pendingSubcircuitDefinitionId?: string | null;
  dragging: ComponentDrag;
  setDragging: Dispatch<SetStateAction<ComponentDrag>>;
  marquee: Marquee;
  setMarquee: Dispatch<SetStateAction<Marquee>>;
  resizingText: TextResize;
  setResizingText: Dispatch<SetStateAction<TextResize>>;
  dragConnecting: boolean;
  setDragConnecting: Dispatch<SetStateAction<PinRef | null>>;
  wireWaypointDrag: WireWaypointDrag;
  setWireWaypointDrag: Dispatch<SetStateAction<WireWaypointDrag>>;
  setMousePoint: Dispatch<SetStateAction<Point | null>>;
  suppressNextClickRef: RefObject<boolean>;
  onCanvasAdd: (type: GateType, point: Point, definitionId?: string) => void;
  onBeginMoveComponent: () => void;
  onMoveComponents: (moves: Array<{ componentId: string; point: Point }>) => void;
  onResizeTextComponent: (componentId: string, width: number) => void;
  onAddWireWaypoint: (wireId: string, waypointIndex: number, point: Point) => void;
  onBeginMoveWireWaypoint: () => void;
  onMoveWireWaypoint: (wireId: string, waypointIndex: number, point: Point) => void;
  onCancelPendingWire: () => void;
  onOpenCanvasMenu: (x: number, y: number, point: Point) => void;
  onSelectItems: (selection: Selection) => void;
  onClearSelection: () => void;
  onSelectTool: (tool: EditorTool) => void;
}

export function useCanvasPointerInteractions(options: Options) {
  function svgPoint(event: { clientX: number; clientY: number }): Point {
    const svg = options.svgRef.current;
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
    return event.target === options.svgRef.current || target.classList.contains('canvas-bg');
  }

  function finishMarquee(nextMarquee: Marquee) {
    if (!nextMarquee) return;
    const rect = normalizeRect(nextMarquee.start, nextMarquee.end);
    const dragged = rect.width > 4 || rect.height > 4;
    options.setMarquee(null);
    if (!dragged) return;

    options.suppressNextClickRef.current = true;
    const componentIds = options.circuit.components
      .filter((component) => intersects(rect, componentBounds(component, options.definitions)))
      .map((component) => component.id);
    const wireIds = options.circuit.wires
      .filter((wire) => wireInRect(wire, options.componentById, rect, options.definitions))
      .map((wire) => wire.id);
    options.onSelectItems({ componentIds, wireIds });
  }

  function finishPointerInteraction() {
    if (options.dragConnecting) {
      options.onCancelPendingWire();
      options.setDragConnecting(null);
    }
    finishMarquee(options.marquee);
    options.setDragging(null);
    options.setResizingText(null);
    options.setWireWaypointDrag(null);
  }

  return {
    svgPoint,

    onClick(event: MouseEvent<SVGSVGElement>) {
      if (options.suppressNextClickRef.current) {
        options.suppressNextClickRef.current = false;
        return;
      }
      if (!isBackgroundEvent(event)) return;

      if (options.pendingWire) {
        options.onCancelPendingWire();
        return;
      }

      options.onClearSelection();
      if (
        options.selectedTool === 'select' ||
        options.selectedTool === 'wire' ||
        options.selectedTool === 'pan'
      )
        return;
      if (options.selectedTool === 'subcircuit' && !options.pendingSubcircuitDefinitionId) return;
      options.onCanvasAdd(
        options.selectedTool,
        svgPoint(event),
        options.selectedTool === 'subcircuit'
          ? (options.pendingSubcircuitDefinitionId ?? undefined)
          : undefined,
      );
    },

    onMouseDown(event: MouseEvent<SVGSVGElement>) {
      if (!isBackgroundEvent(event) || options.pendingWire || options.selectedTool !== 'select')
        return;
      const point = svgPoint(event);
      options.setMarquee({ start: point, end: point });
    },

    onContextMenu(event: MouseEvent<SVGSVGElement>) {
      event.preventDefault();
      if (
        options.selectedTool !== 'select' &&
        options.selectedTool !== 'wire' &&
        options.selectedTool !== 'pan'
      ) {
        options.onSelectTool('select');
        return;
      }
      if (!isBackgroundEvent(event)) return;
      options.onOpenCanvasMenu(event.clientX, event.clientY, svgPoint(event));
    },

    onMouseMove(event: MouseEvent<SVGSVGElement>) {
      const point = svgPoint(event);
      if (options.pendingWire) options.setMousePoint(point);

      if (options.wireWaypointDrag) {
        const distance =
          Math.abs(point.x - options.wireWaypointDrag.startMouse.x) +
          Math.abs(point.y - options.wireWaypointDrag.startMouse.y);
        if (!options.wireWaypointDrag.recorded && distance <= 4) return;

        if (!options.wireWaypointDrag.recorded) {
          if (options.wireWaypointDrag.isNew) {
            options.onAddWireWaypoint(
              options.wireWaypointDrag.wireId,
              options.wireWaypointDrag.waypointIndex,
              options.wireWaypointDrag.startMouse,
            );
          } else {
            options.onBeginMoveWireWaypoint();
          }
          options.setWireWaypointDrag({ ...options.wireWaypointDrag, recorded: true });
        }
        options.onMoveWireWaypoint(
          options.wireWaypointDrag.wireId,
          options.wireWaypointDrag.waypointIndex,
          point,
        );
        return;
      }

      if (options.marquee) {
        options.setMarquee({ ...options.marquee, end: point });
        return;
      }

      if (options.resizingText) {
        if (!options.resizingText.recorded) {
          options.onBeginMoveComponent();
          options.setResizingText({ ...options.resizingText, recorded: true });
        }
        options.onResizeTextComponent(
          options.resizingText.componentId,
          resizedTextWidth(options.resizingText, point),
        );
        return;
      }

      if (!options.dragging) return;
      if (!options.dragging.recorded) {
        options.onBeginMoveComponent();
        options.setDragging({ ...options.dragging, recorded: true });
      }
      options.onMoveComponents(componentMovesForDrag(options.dragging, point));
    },

    onMouseUp() {
      finishPointerInteraction();
    },

    onMouseLeave() {
      finishPointerInteraction();
      options.setMousePoint(null);
    },

    onDrop(event: DragEvent<SVGSVGElement>) {
      event.preventDefault();
      const type = event.dataTransfer.getData('application/opencircuit-gate') as GateType;
      if (!type || !COMPONENT_DEFINITIONS[type]) return;
      const definitionId =
        type === 'subcircuit'
          ? event.dataTransfer.getData('application/opencircuit-subcircuit-definition') || undefined
          : undefined;
      if (type === 'subcircuit' && !definitionId) return;
      options.onCanvasAdd(type, svgPoint(event), definitionId);
      options.onSelectTool('select');
    },
  };
}

export function normalizeRect(start: Point, end: Point): RectBounds {
  const x = Math.min(start.x, end.x);
  const y = Math.min(start.y, end.y);
  return { x, y, width: Math.abs(end.x - start.x), height: Math.abs(end.y - start.y) };
}

export function componentMovesForDrag(
  dragging: NonNullable<ComponentDrag>,
  point: Point,
): Array<{ componentId: string; point: Point }> {
  return dragging.componentIds.map((componentId) => ({
    componentId,
    point: {
      x: dragging.origins[componentId].x + point.x - dragging.startMouse.x,
      y: dragging.origins[componentId].y + point.y - dragging.startMouse.y,
    },
  }));
}

export function resizedTextWidth(resizing: NonNullable<TextResize>, point: Point): number {
  return Math.max(90, resizing.startWidth + point.x - resizing.startMouse.x);
}
