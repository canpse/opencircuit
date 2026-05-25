import { COMPONENT_DEFINITIONS, getPinPosition } from '../../core/catalog';
import type { LogicComponent, Point, Wire } from '../../core/types';

export type WireRoute = { wireId: string; points: Point[]; jumps: Point[] };

export interface RectBounds {
  x: number;
  y: number;
  width: number;
  height: number;
}

export function componentBounds(component: LogicComponent): RectBounds {
  const definition = COMPONENT_DEFINITIONS[component.type];
  if (component.type === 'text') {
    const width = textComponentWidth(component);
    const lines = wrapText(component.label ?? definition.label, width - 42);
    return { x: component.x, y: component.y, width, height: Math.max(definition.height, lines.length * 18 + 24) };
  }
  return { x: component.x, y: component.y, width: definition.width, height: definition.height };
}

export function textComponentWidth(component: LogicComponent): number {
  return Math.max(90, component.width ?? COMPONENT_DEFINITIONS.text.width);
}

export function wrapText(text: string, maxWidth: number): string[] {
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

export function routeCircuitWires(wires: Wire[], componentById: Map<string, LogicComponent>, components: LogicComponent[]): WireRoute[] {
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

export function selfLoopRoute(component: LogicComponent, start: Point, end: Point, index: number): Point[] {
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

export function routeBetweenPoints(start: Point, end: Point, components: LogicComponent[], ignoreComponentIds: Set<string>, index: number): Point[] {
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

export function bezierPathFromPoints(points: Point[]): string {
  if (points.length <= 2) return bezierPath(points[0], points[1]);
  return roundedPolylinePath(points, 18);
}

export function bezierPathAvoidingComponents(
  start: Point,
  end: Point,
  components: LogicComponent[],
  ignoreComponentIds: Set<string>,
  index: number,
): string {
  const obstacles = components
    .filter((component) => !ignoreComponentIds.has(component.id) && component.type !== 'text')
    .map((component) => inflateRect(componentBounds(component), 18));

  if (countSmoothPathCollisions([start, end], obstacles) === 0) return bezierPath(start, end);

  const blockingBounds = unionRects(obstacles.filter((rect) => smoothPathIntersectsRect([start, end], rect)));
  if (!blockingBounds) return bezierPath(start, end);

  const offset = ((index % 5) - 2) * 12;
  const margin = 42 + Math.abs(offset);
  const direction = end.x >= start.x ? 1 : -1;
  const lead = Math.max(42, Math.min(90, Math.abs(end.x - start.x) / 3));
  const topLane = blockingBounds.y - margin;
  const bottomLane = blockingBounds.y + blockingBounds.height + margin;
  const leftLane = blockingBounds.x - margin;
  const rightLane = blockingBounds.x + blockingBounds.width + margin;

  const candidates: Point[][] = [
    compactRoute([start, { x: start.x + direction * lead, y: start.y }, { x: start.x + direction * lead, y: topLane + offset }, { x: end.x - direction * lead, y: topLane + offset }, { x: end.x - direction * lead, y: end.y }, end]),
    compactRoute([start, { x: start.x + direction * lead, y: start.y }, { x: start.x + direction * lead, y: bottomLane + offset }, { x: end.x - direction * lead, y: bottomLane + offset }, { x: end.x - direction * lead, y: end.y }, end]),
    compactRoute([start, { x: leftLane + offset, y: start.y }, { x: leftLane + offset, y: end.y }, end]),
    compactRoute([start, { x: rightLane + offset, y: start.y }, { x: rightLane + offset, y: end.y }, end]),
  ];

  const best = candidates
    .map((points) => ({ points, collisions: countSmoothPathCollisions(points, obstacles), length: routeLength(points) }))
    .sort((a, b) => a.collisions - b.collisions || a.length - b.length)[0].points;
  return smoothPathFromPoints(best);
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

function smoothPathFromPoints(points: Point[]): string {
  if (points.length <= 2) return bezierPath(points[0], points[1]);
  const commands = [`M ${points[0].x} ${points[0].y}`];
  for (let index = 0; index < points.length - 1; index += 1) {
    const previous = points[index - 1] ?? points[index];
    const current = points[index];
    const next = points[index + 1];
    const afterNext = points[index + 2] ?? next;
    const cp1 = { x: current.x + (next.x - previous.x) / 6, y: current.y + (next.y - previous.y) / 6 };
    const cp2 = { x: next.x - (afterNext.x - current.x) / 6, y: next.y - (afterNext.y - current.y) / 6 };
    commands.push(`C ${cp1.x} ${cp1.y}, ${cp2.x} ${cp2.y}, ${next.x} ${next.y}`);
  }
  return commands.join(' ');
}

function countSmoothPathCollisions(points: Point[], obstacles: RectBounds[]): number {
  return obstacles.filter((rect) => smoothPathIntersectsRect(points, rect)).length;
}

function smoothPathIntersectsRect(points: Point[], rect: RectBounds): boolean {
  return sampleSmoothPath(points, 18).some((point) => containsPoint(rect, point));
}

function sampleSmoothPath(points: Point[], samplesPerSegment: number): Point[] {
  if (points.length <= 2) return sampleCubic(points[0], bezierControls(points[0], points[1]).c1, bezierControls(points[0], points[1]).c2, points[1], samplesPerSegment);
  const samples: Point[] = [];
  for (let index = 0; index < points.length - 1; index += 1) {
    const previous = points[index - 1] ?? points[index];
    const current = points[index];
    const next = points[index + 1];
    const afterNext = points[index + 2] ?? next;
    const cp1 = { x: current.x + (next.x - previous.x) / 6, y: current.y + (next.y - previous.y) / 6 };
    const cp2 = { x: next.x - (afterNext.x - current.x) / 6, y: next.y - (afterNext.y - current.y) / 6 };
    samples.push(...sampleCubic(current, cp1, cp2, next, samplesPerSegment));
  }
  return samples;
}

function bezierControls(start: Point, end: Point): { c1: Point; c2: Point } {
  const midX = Math.round((start.x + end.x) / 2);
  return { c1: { x: midX, y: start.y }, c2: { x: midX, y: end.y } };
}

function sampleCubic(start: Point, c1: Point, c2: Point, end: Point, count: number): Point[] {
  return Array.from({ length: count + 1 }, (_, index) => {
    const t = index / count;
    const mt = 1 - t;
    return {
      x: mt ** 3 * start.x + 3 * mt ** 2 * t * c1.x + 3 * mt * t ** 2 * c2.x + t ** 3 * end.x,
      y: mt ** 3 * start.y + 3 * mt ** 2 * t * c1.y + 3 * mt * t ** 2 * c2.y + t ** 3 * end.y,
    };
  });
}

function unionRects(rects: RectBounds[]): RectBounds | null {
  if (rects.length === 0) return null;
  const minX = Math.min(...rects.map((rect) => rect.x));
  const minY = Math.min(...rects.map((rect) => rect.y));
  const maxX = Math.max(...rects.map((rect) => rect.x + rect.width));
  const maxY = Math.max(...rects.map((rect) => rect.y + rect.height));
  return { x: minX, y: minY, width: maxX - minX, height: maxY - minY };
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

export function bezierPath(start: Point, end: Point): string {
  const midX = Math.round((start.x + end.x) / 2);
  return `M ${start.x} ${start.y} C ${midX} ${start.y}, ${midX} ${end.y}, ${end.x} ${end.y}`;
}

export function orthogonalPath(points: Point[], jumps: Point[]): string {
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

export function intersects(a: RectBounds, b: RectBounds): boolean {
  return a.x <= b.x + b.width && a.x + a.width >= b.x && a.y <= b.y + b.height && a.y + a.height >= b.y;
}

export function containsPoint(rect: RectBounds, point: Point): boolean {
  return point.x >= rect.x && point.x <= rect.x + rect.width && point.y >= rect.y && point.y <= rect.y + rect.height;
}

export function wireInRect(wire: Wire, componentById: Map<string, LogicComponent>, rect: RectBounds): boolean {
  const from = componentById.get(wire.from.componentId);
  const to = componentById.get(wire.to.componentId);
  if (!from || !to) return false;
  const start = getPinPosition(from, wire.from.pinId);
  const end = getPinPosition(to, wire.to.pinId);
  return containsPoint(rect, start) && containsPoint(rect, end);
}
