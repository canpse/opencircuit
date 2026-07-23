import { COMPONENT_DEFINITIONS, getPinPosition } from '../../core/catalog';
import type { LogicComponent, PinRef, Point, Wire } from '../../core/types';

export type WireRoute = { wireId: string; points: Point[]; jumps: Point[]; fixedPoints?: Point[] };

export interface WireTrunk {
  from: PinRef;
  stemPoints: Point[];
  branchWireIds: string[];
}

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
    return {
      x: component.x,
      y: component.y,
      width,
      height: Math.max(definition.height, lines.length * 18 + 24),
    };
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

export function routeCircuitWires(
  wires: Wire[],
  componentById: Map<string, LogicComponent>,
  components: LogicComponent[],
): { routes: WireRoute[]; trunks: WireTrunk[] } {
  const routes = wires
    .filter((wire) => wire.display !== 'tunnel')
    .map((wire, index) => {
      const from = componentById.get(wire.from.componentId);
      const to = componentById.get(wire.to.componentId);
      if (!from || !to) return { wireId: wire.id, points: [], jumps: [] };
      const start = getPinPosition(from, wire.from.pinId);
      const end = getPinPosition(to, wire.to.pinId);
      const ignore = new Set([from.id, to.id]);
      const fixedPoints = wire.waypoints?.map((point) => ({ ...point }));
      const points = fixedPoints?.length
        ? routeThroughWaypoints(start, end, fixedPoints, components, ignore, index)
        : from.id === to.id
          ? selfLoopRoute(from, start, end, index)
          : routeBetweenPoints(start, end, components, ignore, index);
      return {
        wireId: wire.id,
        points: fixedPoints?.length ? points : mergeCollinearPoints(points),
        jumps: [],
        fixedPoints,
      };
    });

  // Fios que compartilham o pino de origem formam um tronco visual (ver
  // computeWireTrunks); todos os pontos do tronco — incluindo a junção —
  // viram "pontos fixos" para o espaçamento de corredores não os mover. A
  // junção precisa ficar travada nos dois lados: se o segmento que começa
  // nela pudesse se espalhar, cada ramo acabaria com uma junção em um
  // lugar diferente, e o tronco desenhado (um único ponto) descolaria do
  // início de cada ramo renderizado.
  const routeByWireId = new Map(routes.map((route) => [route.wireId, route]));
  const trunks = computeWireTrunks(wires, routeByWireId);
  const stemPointsByWireId = new Map<string, Point[]>();
  for (const trunk of trunks) {
    for (const wireId of trunk.branchWireIds) stemPointsByWireId.set(wireId, trunk.stemPoints);
  }
  const withTrunkFixed = routes.map((route) => {
    const stem = stemPointsByWireId.get(route.wireId);
    if (!stem) return route;
    return { ...route, fixedPoints: [...(route.fixedPoints ?? []), ...stem] };
  });

  const spread = spreadWireCorridors(withTrunkFixed);

  return {
    routes: spread.map((route, index) => ({
      ...route,
      jumps: findWireJumps(
        route,
        spread.filter((_, otherIndex) => otherIndex !== index),
      ),
    })),
    trunks,
  };
}

// Agrupa fios que saem do mesmo pino em um tronco visual: o maior prefixo de
// pontos idênticos entre as rotas do grupo vira o "caule" comum, terminando
// no ponto de junção de onde cada ramo se separa. Puramente derivado da
// geometria já roteada — não persiste nada no documento.
export function computeWireTrunks(
  wires: Wire[],
  routeByWireId: ReadonlyMap<string, { points: Point[] }>,
): WireTrunk[] {
  const groups = new Map<string, Wire[]>();
  for (const wire of wires) {
    if (wire.display === 'tunnel') continue;
    if (wire.waypoints?.length) continue;
    if (wire.from.componentId === wire.to.componentId) continue;
    if (!routeByWireId.has(wire.id)) continue;
    const key = `${wire.from.componentId}:${wire.from.pinId}`;
    const list = groups.get(key) ?? [];
    list.push(wire);
    groups.set(key, list);
  }

  const trunks: WireTrunk[] = [];
  for (const groupWires of groups.values()) {
    if (groupWires.length < 2) continue;
    const pointLists = groupWires.map((wire) => routeByWireId.get(wire.id)!.points);
    if (pointLists.some((points) => points.length < 2)) continue;

    const maxLength = Math.min(...pointLists.map((points) => points.length)) - 1;
    let shared = 0;
    while (
      shared < maxLength &&
      pointLists.every((points) => samePoint(points[shared], pointLists[0][shared]))
    ) {
      shared += 1;
    }
    if (shared < 2) continue;

    trunks.push({
      from: groupWires[0].from,
      stemPoints: pointLists[0].slice(0, shared),
      branchWireIds: groupWires.map((wire) => wire.id),
    });
  }
  return trunks;
}

const TUNNEL_STUB_LANE_HEIGHT = 18;

// Quando vários túneis saem do mesmo pino de origem, seus tocos e rótulos
// ficariam exatamente empilhados uns sobre os outros (o pino é o mesmo
// ponto para todos). Escalona cada um verticalmente em faixas, como uma
// pequena escada, mantendo o ponto de conexão exato no pino.
export function computeTunnelFromOffsets(wires: Wire[]): Map<string, number> {
  const groups = new Map<string, Wire[]>();
  for (const wire of wires) {
    if (wire.display !== 'tunnel') continue;
    const key = `${wire.from.componentId}:${wire.from.pinId}`;
    const list = groups.get(key) ?? [];
    list.push(wire);
    groups.set(key, list);
  }

  const offsets = new Map<string, number>();
  for (const group of groups.values()) {
    if (group.length < 2) continue;
    group.forEach((wire, index) => {
      offsets.set(wire.id, (index - (group.length - 1) / 2) * TUNNEL_STUB_LANE_HEIGHT);
    });
  }
  return offsets;
}

const CORRIDOR_SPACING = 8;
const MIN_CORRIDOR_OVERLAP = 20;

// Fios que compartilham o mesmo corredor (segmentos colineares sobrepostos)
// são afastados simetricamente alguns pixels, como trilhas paralelas. Só
// segmentos interiores se movem: as pontas nos pinos ficam intactas, e os
// segmentos vizinhos (perpendiculares) apenas esticam ou encolhem.
export function spreadWireCorridors(routes: WireRoute[]): WireRoute[] {
  const points = routes.map((route) => route.points.map((point) => ({ ...point })));

  type SegmentRef = { routeIndex: number; segmentIndex: number; lo: number; hi: number };
  const lines = new Map<string, SegmentRef[]>();

  points.forEach((routePoints, routeIndex) => {
    for (let segmentIndex = 1; segmentIndex <= routePoints.length - 3; segmentIndex += 1) {
      const a = routePoints[segmentIndex];
      const b = routePoints[segmentIndex + 1];
      const fixedPoints = routes[routeIndex].fixedPoints ?? [];
      if (fixedPoints.some((point) => samePoint(point, a) || samePoint(point, b))) continue;
      const vertical = a.x === b.x && a.y !== b.y;
      const horizontal = a.y === b.y && a.x !== b.x;
      if (!vertical && !horizontal) continue;
      const key = vertical ? `v:${a.x}` : `h:${a.y}`;
      const lo = vertical ? Math.min(a.y, b.y) : Math.min(a.x, b.x);
      const hi = vertical ? Math.max(a.y, b.y) : Math.max(a.x, b.x);
      const refs = lines.get(key) ?? [];
      refs.push({ routeIndex, segmentIndex, lo, hi });
      lines.set(key, refs);
    }
  });

  for (const [key, refs] of lines) {
    if (refs.length < 2) continue;
    const vertical = key.startsWith('v:');
    refs.sort((left, right) => left.lo - right.lo || left.routeIndex - right.routeIndex);

    // Agrupa por sobreposição encadeada ao longo da linha.
    const clusters: SegmentRef[][] = [];
    let cluster: SegmentRef[] = [];
    let clusterHi = -Infinity;
    for (const ref of refs) {
      if (cluster.length > 0 && clusterHi - ref.lo >= MIN_CORRIDOR_OVERLAP) {
        cluster.push(ref);
        clusterHi = Math.max(clusterHi, ref.hi);
      } else {
        if (cluster.length >= 2) clusters.push(cluster);
        cluster = [ref];
        clusterHi = ref.hi;
      }
    }
    if (cluster.length >= 2) clusters.push(cluster);

    for (const members of clusters) {
      members.sort((left, right) => left.routeIndex - right.routeIndex);
      members.forEach((member, order) => {
        const offset = (order - (members.length - 1) / 2) * CORRIDOR_SPACING;
        if (offset === 0) return;
        const a = points[member.routeIndex][member.segmentIndex];
        const b = points[member.routeIndex][member.segmentIndex + 1];
        if (vertical) {
          a.x += offset;
          b.x += offset;
        } else {
          a.y += offset;
          b.y += offset;
        }
      });
    }
  }

  return routes.map((route, index) => ({ ...route, points: points[index] }));
}

function samePoint(left: Point, right: Point): boolean {
  return left.x === right.x && left.y === right.y;
}

// Remove pontos intermediários colineares para que segmentos consecutivos
// sejam sempre perpendiculares — pré-condição do espaçamento de corredores.
export function mergeCollinearPoints(points: Point[]): Point[] {
  return points.filter((point, index) => {
    const previous = points[index - 1];
    const next = points[index + 1];
    if (!previous || !next) return true;
    const collinear =
      (previous.x === point.x && point.x === next.x) ||
      (previous.y === point.y && point.y === next.y);
    return !collinear;
  });
}

export function selfLoopRoute(
  component: LogicComponent,
  start: Point,
  end: Point,
  index: number,
): Point[] {
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

export function routeBetweenPoints(
  start: Point,
  end: Point,
  components: LogicComponent[],
  ignoreComponentIds: Set<string>,
  index: number,
  pinStubs: { start: boolean; end: boolean } = { start: true, end: true },
): Point[] {
  const offset = ((index % 5) - 2) * 10;
  const distance = Math.abs(end.x - start.x) + Math.abs(end.y - start.y);
  const needsPinStub = end.x <= start.x;
  const stub = needsPinStub ? Math.max(28, Math.min(48, distance / 4)) : 14;
  const routeStart = { x: start.x + (pinStubs.start ? stub : 0), y: start.y };
  const routeEnd = { x: end.x - (pinStubs.end ? stub : 0), y: end.y };
  const midX = Math.round((routeStart.x + routeEnd.x) / 2) + offset;
  const margin = 34 + Math.abs(offset);
  const obstacles = components
    .filter((component) => !ignoreComponentIds.has(component.id))
    .map((component) => inflateRect(componentBounds(component), 14));
  const allBounds = components.map(componentBounds);
  const minY = Math.min(start.y, end.y, ...allBounds.map((rect) => rect.y)) - margin;
  const maxY = Math.max(start.y, end.y, ...allBounds.map((rect) => rect.y + rect.height)) + margin;
  const candidates: Point[][] = [
    compactRoute([start, routeStart, { x: routeStart.x, y: routeEnd.y }, routeEnd, end]),
    compactRoute([
      start,
      routeStart,
      { x: routeStart.x + margin, y: routeStart.y },
      { x: routeStart.x + margin, y: routeEnd.y },
      routeEnd,
      end,
    ]),
    compactRoute([
      start,
      routeStart,
      { x: routeStart.x, y: minY },
      { x: routeEnd.x, y: minY },
      routeEnd,
      end,
    ]),
    compactRoute([
      start,
      routeStart,
      { x: routeStart.x, y: maxY },
      { x: routeEnd.x, y: maxY },
      routeEnd,
      end,
    ]),
    compactRoute([
      start,
      routeStart,
      { x: midX, y: routeStart.y },
      { x: midX, y: routeEnd.y },
      routeEnd,
      end,
    ]),
    compactRoute([
      start,
      routeStart,
      { x: routeEnd.x - margin, y: routeStart.y },
      { x: routeEnd.x - margin, y: routeEnd.y },
      routeEnd,
      end,
    ]),
  ];
  return candidates
    .map((points) => ({
      points,
      collisions: countRouteCollisionsBetweenStubs(points, obstacles, pinStubs),
      length: routeLength(points),
    }))
    .sort((a, b) => a.collisions - b.collisions || a.length - b.length)[0].points;
}

export function waypointInsertionIndex(
  routePoints: Point[],
  waypoints: Point[],
  point: Point,
): number {
  if (waypoints.length === 0 || routePoints.length < 2) return 0;
  const segments = routeSegments(routePoints);
  let nearestSegmentIndex = 0;
  let nearestDistance = Infinity;
  segments.forEach((segment, segmentIndex) => {
    const distance = distanceToSegmentSquared(point, segment.a, segment.b);
    if (distance < nearestDistance) {
      nearestDistance = distance;
      nearestSegmentIndex = segmentIndex;
    }
  });
  const waypointRouteIndexes = waypoints.map((waypoint) =>
    routePoints.findIndex((routePoint) => samePoint(routePoint, waypoint)),
  );
  return waypointRouteIndexes.filter(
    (routeIndex) => routeIndex >= 0 && routeIndex <= nearestSegmentIndex,
  ).length;
}

export function routeThroughWaypoints(
  start: Point,
  end: Point,
  waypoints: Point[],
  components: LogicComponent[],
  ignoreComponentIds: Set<string>,
  index: number,
): Point[] {
  const anchors = [start, ...waypoints, end];
  const points: Point[] = [];

  for (let sectionIndex = 0; sectionIndex < anchors.length - 1; sectionIndex += 1) {
    const section = mergeCollinearPoints(
      routeBetweenPoints(
        anchors[sectionIndex],
        anchors[sectionIndex + 1],
        components,
        ignoreComponentIds,
        index + sectionIndex,
        { start: sectionIndex === 0, end: sectionIndex === anchors.length - 2 },
      ),
    );
    points.push(...(sectionIndex === 0 ? section : section.slice(1)));
  }

  return points;
}

function compactRoute(points: Point[]): Point[] {
  return points.filter((point, index) => {
    const previous = points[index - 1];
    return !previous || previous.x !== point.x || previous.y !== point.y;
  });
}

function inflateRect(rect: RectBounds, amount: number): RectBounds {
  return {
    x: rect.x - amount,
    y: rect.y - amount,
    width: rect.width + amount * 2,
    height: rect.height + amount * 2,
  };
}

function countRouteCollisionsBetweenStubs(
  points: Point[],
  obstacles: RectBounds[],
  pinStubs: { start: boolean; end: boolean },
): number {
  const segments = routeSegments(points);
  const middleSegments = segments.slice(
    pinStubs.start ? 1 : 0,
    segments.length - (pinStubs.end ? 1 : 0),
  );
  return middleSegments.reduce(
    (count, segment) =>
      count + obstacles.filter((rect) => segmentIntersectsRect(segment.a, segment.b, rect)).length,
    0,
  );
}

function distanceToSegmentSquared(point: Point, a: Point, b: Point): number {
  if (a.x === b.x) {
    const closestY = Math.max(Math.min(point.y, Math.max(a.y, b.y)), Math.min(a.y, b.y));
    return (point.x - a.x) ** 2 + (point.y - closestY) ** 2;
  }
  const closestX = Math.max(Math.min(point.x, Math.max(a.x, b.x)), Math.min(a.x, b.x));
  return (point.x - closestX) ** 2 + (point.y - a.y) ** 2;
}

function routeLength(points: Point[]): number {
  return routeSegments(points).reduce(
    (sum, segment) =>
      sum + Math.abs(segment.a.x - segment.b.x) + Math.abs(segment.a.y - segment.b.y),
    0,
  );
}

function routeSegments(points: Point[]): Array<{ a: Point; b: Point }> {
  return points.slice(0, -1).map((point, index) => ({ a: point, b: points[index + 1] }));
}

function segmentIntersectsRect(a: Point, b: Point, rect: RectBounds): boolean {
  if (a.x === b.x) {
    const y1 = Math.min(a.y, b.y);
    const y2 = Math.max(a.y, b.y);
    return (
      a.x >= rect.x && a.x <= rect.x + rect.width && y2 >= rect.y && y1 <= rect.y + rect.height
    );
  }
  if (a.y === b.y) {
    const x1 = Math.min(a.x, b.x);
    const x2 = Math.max(a.x, b.x);
    return (
      a.y >= rect.y && a.y <= rect.y + rect.height && x2 >= rect.x && x1 <= rect.x + rect.width
    );
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

// Curva Catmull–Rom convertida em segmentos Bézier cúbicos. Diferentemente
// de bezierPathFromPoints, esta função não arredonda uma rota ortogonal: ela
// atravessa diretamente cada ponto de controle informado pelo usuário.
export function smoothBezierPathThroughPoints(points: Point[]): string {
  if (points.length === 0) return '';
  if (points.length === 1) return `M ${points[0].x} ${points[0].y}`;
  if (points.length === 2) return bezierPathWithPinStubs(points[0], points[1]);

  const commands = [`M ${points[0].x} ${points[0].y}`];
  for (let index = 0; index < points.length - 1; index += 1) {
    const previous = points[Math.max(0, index - 1)];
    const start = points[index];
    const end = points[index + 1];
    const next = points[Math.min(points.length - 1, index + 2)];
    const firstControl =
      index === 0
        ? { x: start.x + (end.x - start.x) / 3, y: start.y }
        : { x: start.x + (end.x - previous.x) / 6, y: start.y + (end.y - previous.y) / 6 };
    const secondControl =
      index === points.length - 2
        ? { x: end.x - (end.x - start.x) / 3, y: end.y }
        : { x: end.x - (next.x - start.x) / 6, y: end.y - (next.y - start.y) / 6 };
    commands.push(
      `C ${firstControl.x} ${firstControl.y}, ${secondControl.x} ${secondControl.y}, ${end.x} ${end.y}`,
    );
  }
  return commands.join(' ');
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

export function bezierPath(start: Point, end: Point): string {
  const midX = Math.round((start.x + end.x) / 2);
  return `M ${start.x} ${start.y} C ${midX} ${start.y}, ${midX} ${end.y}, ${end.x} ${end.y}`;
}

export function bezierPathWithPinStubs(start: Point, end: Point): string {
  const distance = Math.abs(end.x - start.x) + Math.abs(end.y - start.y);
  const needsPinStub = end.x <= start.x;
  const stub = needsPinStub ? Math.max(28, Math.min(48, distance / 4)) : 14;
  const startStub = { x: start.x + stub, y: start.y };
  const endStub = { x: end.x - stub, y: end.y };
  const middleX = Math.round((startStub.x + endStub.x) / 2);
  return [
    `M ${start.x} ${start.y}`,
    `C ${start.x + stub * 0.55} ${start.y}, ${startStub.x - stub * 0.25} ${startStub.y}, ${startStub.x} ${startStub.y}`,
    `C ${middleX} ${startStub.y}, ${middleX} ${endStub.y}, ${endStub.x} ${endStub.y}`,
    `C ${endStub.x + stub * 0.25} ${endStub.y}, ${end.x - stub * 0.55} ${end.y}, ${end.x} ${end.y}`,
  ].join(' ');
}

export function orthogonalPath(points: Point[], jumps: Point[]): string {
  if (points.length === 0) return '';
  const commands = [`M ${points[0].x} ${points[0].y}`];
  for (const segment of routeSegments(points)) {
    const segmentJumps = jumps
      .filter((jump) => pointOnSegment(jump, segment.a, segment.b))
      .sort(
        (left, right) =>
          distanceAlongSegment(segment.a, left) - distanceAlongSegment(segment.a, right),
      );
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
  if (a.y === b.y && point.y === a.y)
    return point.x > Math.min(a.x, b.x) && point.x < Math.max(a.x, b.x);
  if (a.x === b.x && point.x === a.x)
    return point.y > Math.min(a.y, b.y) && point.y < Math.max(a.y, b.y);
  return false;
}

function distanceAlongSegment(start: Point, point: Point): number {
  return Math.abs(point.x - start.x) + Math.abs(point.y - start.y);
}

export function intersects(a: RectBounds, b: RectBounds): boolean {
  return (
    a.x <= b.x + b.width && a.x + a.width >= b.x && a.y <= b.y + b.height && a.y + a.height >= b.y
  );
}

export function containsPoint(rect: RectBounds, point: Point): boolean {
  return (
    point.x >= rect.x &&
    point.x <= rect.x + rect.width &&
    point.y >= rect.y &&
    point.y <= rect.y + rect.height
  );
}

export function wireInRect(
  wire: Wire,
  componentById: Map<string, LogicComponent>,
  rect: RectBounds,
): boolean {
  const from = componentById.get(wire.from.componentId);
  const to = componentById.get(wire.to.componentId);
  if (!from || !to) return false;
  const start = getPinPosition(from, wire.from.pinId);
  const end = getPinPosition(to, wire.to.pinId);
  return containsPoint(rect, start) && containsPoint(rect, end);
}
