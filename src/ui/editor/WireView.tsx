import { memo, type MouseEvent } from 'react';
import { getPinPosition } from '../../core/catalog';
import type { LogicComponent, PinRef, Point, Wire } from '../../core/types';
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
  fromComponent,
  toComponent,
  active,
  selected,
  onSelect,
  onContextMenu,
  onRemove,
}: {
  wire: Wire;
  route: WireRoute | undefined;
  wireStyle: WireStyle;
  fromComponent: LogicComponent;
  toComponent: LogicComponent;
  active: boolean;
  selected: boolean;
  onSelect: (wireId: string) => void;
  onContextMenu: (event: MouseEvent<SVGPathElement>, wireId: string) => void;
  onRemove: (wireId: string) => void;
}) {
  const start = getPinPosition(fromComponent, wire.from.pinId);
  const end = getPinPosition(toComponent, wire.to.pinId);
  const points =
    route?.points ??
    (fromComponent.id === toComponent.id
      ? selfLoopRoute(fromComponent, start, end, 0)
      : [start, end]);
  const d =
    wireStyle === 'orthogonal'
      ? orthogonalPath(points, route?.jumps ?? [])
      : fromComponent.id === toComponent.id
        ? bezierPathFromPoints(points)
        : bezierPathWithPinStubs(start, end);

  return (
    <path
      d={d}
      className={`wire ${wireStyle === 'orthogonal' ? 'orthogonal' : 'bezier'} ${active ? 'on' : ''} ${selected ? 'selected' : ''}`}
      onClick={(event) => {
        event.stopPropagation();
        onSelect(wire.id);
      }}
      onContextMenu={(event) => {
        event.preventDefault();
        event.stopPropagation();
        onContextMenu(event, wire.id);
      }}
      onDoubleClick={(event) => {
        event.stopPropagation();
        onRemove(wire.id);
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
