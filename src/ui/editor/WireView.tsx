import { memo, type MouseEvent } from 'react';
import { getPinPosition } from '../../core/catalog';
import type { EvaluationResult, LogicComponent, PinRef, Point, Wire } from '../../core/types';
import {
  bezierPath,
  bezierPathFromPoints,
  bezierPathWithPinStubs,
  orthogonalPath,
  routeBetweenPoints,
  selfLoopRoute,
  type WireRoute,
} from './wireRouting';
import type { WireStyle } from './CircuitCanvas';

export const WireView = memo(function WireView({
  wire,
  route,
  wireStyle,
  componentById,
  evaluation,
  selected,
  onSelect,
  onContextMenu,
  onRemove,
}: {
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
  const points =
    route?.points ?? (from.id === to.id ? selfLoopRoute(from, start, end, 0) : [start, end]);
  const active = Boolean(evaluation[wire.from.componentId]?.[wire.from.pinId]);
  const d =
    wireStyle === 'orthogonal'
      ? orthogonalPath(points, route?.jumps ?? [])
      : from.id === to.id
        ? bezierPathFromPoints(points)
        : bezierPathWithPinStubs(start, end);

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
});

export function PendingWire({
  pendingWire,
  componentById,
  components,
  wireStyle,
  mousePoint,
}: {
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
  const route =
    end && wireStyle === 'orthogonal'
      ? routeBetweenPoints(start, end, components, new Set([component.id]), 0)
      : null;
  const d = end
    ? wireStyle === 'orthogonal' && route
      ? orthogonalPath(route, [])
      : bezierPath(start, end)
    : '';

  return (
    <g className="pending-wire-preview">
      {end && <path className={`wire pending ${wireStyle}`} d={d} />}
      <circle className="pending-pulse" cx={start.x} cy={start.y} r="12" />
    </g>
  );
}
