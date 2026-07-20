import { memo, useState, type KeyboardEvent, type MouseEvent } from 'react';
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
  onRename,
}: {
  wire: Wire;
  route: WireRoute | undefined;
  wireStyle: WireStyle;
  fromComponent: LogicComponent;
  toComponent: LogicComponent;
  active: boolean;
  selected: boolean;
  onSelect: (wireId: string) => void;
  onContextMenu: (event: MouseEvent<SVGElement>, wireId: string) => void;
  onRemove: (wireId: string) => void;
  onRename: (wireId: string, label: string) => void;
}) {
  const [editingEnd, setEditingEnd] = useState<'from' | 'to' | null>(null);
  const [draftLabel, setDraftLabel] = useState('');
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

  if (wire.display === 'tunnel') {
    const label = wire.label || 'Túnel';
    const wireClass = `wire tunnel-stub ${active ? 'on' : ''} ${selected ? 'selected' : ''}`;

    const startEditing = (event: MouseEvent<SVGGElement>, endpoint: 'from' | 'to') => {
      event.preventDefault();
      event.stopPropagation();
      setDraftLabel(label);
      setEditingEnd(endpoint);
    };

    const commitEditing = () => {
      if (!editingEnd) return;
      const nextLabel = draftLabel.trim();
      if (nextLabel) onRename(wire.id, nextLabel);
      setEditingEnd(null);
    };

    const onEditorKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
      if (event.key === 'Enter') {
        event.preventDefault();
        event.currentTarget.blur();
      } else if (event.key === 'Escape') {
        event.preventDefault();
        setEditingEnd(null);
      }
    };

    return (
      <g
        className="wire-tunnel"
        onClick={(event) => {
          event.stopPropagation();
          onSelect(wire.id);
        }}
        onContextMenu={(event) => {
          event.preventDefault();
          event.stopPropagation();
          onContextMenu(event, wire.id);
        }}
      >
        <g onDoubleClick={(event) => startEditing(event, 'from')}>
          <path className={wireClass} d={`M ${start.x} ${start.y} L ${start.x + 32} ${start.y}`} />
          <text className="tunnel-label" x={start.x + 38} y={start.y + 4} textAnchor="start">
            ▸ {label}
          </text>
        </g>
        <g onDoubleClick={(event) => startEditing(event, 'to')}>
          <path className={wireClass} d={`M ${end.x - 32} ${end.y} L ${end.x} ${end.y}`} />
          <text className="tunnel-label" x={end.x - 38} y={end.y + 4} textAnchor="end">
            {label} ▸
          </text>
        </g>
        {editingEnd && (
          <foreignObject
            className="tunnel-label-editor-object"
            x={editingEnd === 'from' ? start.x + 34 : end.x - 154}
            y={(editingEnd === 'from' ? start.y : end.y) - 17}
            width="120"
            height="34"
          >
            <input
              className="tunnel-label-editor"
              value={draftLabel}
              autoFocus
              onFocus={(event) => event.currentTarget.select()}
              onChange={(event) => setDraftLabel(event.target.value)}
              onKeyDown={onEditorKeyDown}
              onBlur={commitEditing}
              onMouseDown={(event) => event.stopPropagation()}
              onClick={(event) => event.stopPropagation()}
            />
          </foreignObject>
        )}
      </g>
    );
  }

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
