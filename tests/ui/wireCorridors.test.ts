import { test } from 'vitest';
import assert from 'node:assert/strict';
import {
  mergeCollinearPoints,
  routeCircuitWires,
  spreadWireCorridors,
  type WireRoute,
} from '../../src/ui/editor/wireRouting';
import type { LogicComponent, Point, Wire } from '../../src/core/types';

function route(wireId: string, points: Point[]): WireRoute {
  return { wireId, points, jumps: [] };
}

test('EspalhaCorredorVerticalCompartilhado', () => {
  // Dois fios com o segmento interior vertical na mesma linha x=100.
  const a = route('a', [
    { x: 0, y: 0 },
    { x: 100, y: 0 },
    { x: 100, y: 200 },
    { x: 300, y: 200 },
  ]);
  const b = route('b', [
    { x: 0, y: 50 },
    { x: 100, y: 50 },
    { x: 100, y: 250 },
    { x: 300, y: 250 },
  ]);

  const [spreadA, spreadB] = spreadWireCorridors([a, b]);

  assert.equal(spreadA.points[1].x, 96, 'primeiro fio desloca para a esquerda');
  assert.equal(spreadA.points[2].x, 96);
  assert.equal(spreadB.points[1].x, 104, 'segundo fio desloca para a direita');
  assert.equal(spreadB.points[2].x, 104);
  assert.deepEqual(spreadA.points[0], { x: 0, y: 0 }, 'ponta no pino não se move');
  assert.deepEqual(spreadA.points[3], { x: 300, y: 200 }, 'ponta no pino não se move');
  assert.equal(spreadA.points[0].y, spreadA.points[1].y, 'segmento vizinho continua horizontal');
});

test('TresFiosFicamSimetricos', () => {
  const routes = ['a', 'b', 'c'].map((id, index) =>
    route(id, [
      { x: 0, y: index * 40 },
      { x: 100, y: index * 40 },
      { x: 100, y: 300 + index * 40 },
      { x: 300, y: 300 + index * 40 },
    ]),
  );
  const spread = spreadWireCorridors(routes);
  assert.deepEqual(
    spread.map((candidate) => candidate.points[1].x),
    [92, 100, 108],
  );
});

test('EspalhaCorredorHorizontal', () => {
  const a = route('a', [
    { x: 0, y: 100 },
    { x: 40, y: 100 },
    { x: 40, y: 300 },
    { x: 400, y: 300 },
    { x: 400, y: 100 },
    { x: 440, y: 100 },
  ]);
  const b = route('b', [
    { x: 0, y: 160 },
    { x: 60, y: 160 },
    { x: 60, y: 300 },
    { x: 380, y: 300 },
    { x: 380, y: 160 },
    { x: 420, y: 160 },
  ]);
  const [spreadA, spreadB] = spreadWireCorridors([a, b]);
  assert.equal(spreadA.points[2].y, 296);
  assert.equal(spreadA.points[3].y, 296);
  assert.equal(spreadB.points[2].y, 304);
  assert.equal(spreadB.points[3].y, 304);
});

test('SobreposicaoCurtaNaoEspalha', () => {
  const a = route('a', [
    { x: 0, y: 0 },
    { x: 100, y: 0 },
    { x: 100, y: 100 },
    { x: 300, y: 100 },
  ]);
  // Compartilha x=100 mas o trecho comum tem só 10px.
  const b = route('b', [
    { x: 0, y: 90 },
    { x: 100, y: 90 },
    { x: 100, y: 190 },
    { x: 300, y: 190 },
  ]);
  const [spreadA, spreadB] = spreadWireCorridors([a, b]);
  assert.equal(spreadA.points[1].x, 100);
  assert.equal(spreadB.points[1].x, 100);
});

test('SegmentosDisjuntosNaMesmaLinhaNaoEspalham', () => {
  const a = route('a', [
    { x: 0, y: 0 },
    { x: 100, y: 0 },
    { x: 100, y: 100 },
    { x: 300, y: 100 },
  ]);
  const b = route('b', [
    { x: 0, y: 300 },
    { x: 100, y: 300 },
    { x: 100, y: 400 },
    { x: 300, y: 400 },
  ]);
  const [spreadA, spreadB] = spreadWireCorridors([a, b]);
  assert.equal(spreadA.points[1].x, 100);
  assert.equal(spreadB.points[1].x, 100);
});

test('RotaRetaSemInteriorNaoMuda', () => {
  const a = route('a', [
    { x: 0, y: 0 },
    { x: 300, y: 0 },
  ]);
  const b = route('b', [
    { x: 0, y: 0 },
    { x: 300, y: 0 },
  ]);
  const [spreadA] = spreadWireCorridors([a, b]);
  assert.deepEqual(spreadA.points, a.points);
});

test('MergeCollinearRemovePontosRedundantes', () => {
  const merged = mergeCollinearPoints([
    { x: 0, y: 0 },
    { x: 50, y: 0 },
    { x: 100, y: 0 },
    { x: 100, y: 50 },
    { x: 100, y: 100 },
    { x: 200, y: 100 },
  ]);
  assert.deepEqual(merged, [
    { x: 0, y: 0 },
    { x: 100, y: 0 },
    { x: 100, y: 100 },
    { x: 200, y: 100 },
  ]);
});

// Integração: um fan-out real não pode deixar corredores interiores
// sobrepostos depois do roteamento completo.
test('RoteamentoCompletoNaoDeixaCorredoresSobrepostos', () => {
  const source: LogicComponent = { id: 'IN', type: 'input', x: 80, y: 300, state: true };
  const leds: LogicComponent[] = Array.from({ length: 8 }, (_, index) => ({
    id: `L${index}`,
    type: 'led',
    x: 560,
    y: 40 + index * 80,
  }));
  const components = [source, ...leds];
  const wires: Wire[] = leds.map((led, index) => ({
    id: `W${index}`,
    from: { componentId: 'IN', pinId: 'out' },
    to: { componentId: led.id, pinId: 'in' },
  }));
  const componentById = new Map(components.map((component) => [component.id, component]));

  const routes = routeCircuitWires(wires, componentById, components);

  type Segment = { vertical: boolean; coord: number; lo: number; hi: number };
  const interiorSegments: Segment[] = [];
  for (const candidate of routes) {
    for (let index = 1; index <= candidate.points.length - 3; index += 1) {
      const a = candidate.points[index];
      const b = candidate.points[index + 1];
      if (a.x === b.x && a.y !== b.y) {
        interiorSegments.push({
          vertical: true,
          coord: a.x,
          lo: Math.min(a.y, b.y),
          hi: Math.max(a.y, b.y),
        });
      } else if (a.y === b.y && a.x !== b.x) {
        interiorSegments.push({
          vertical: false,
          coord: a.y,
          lo: Math.min(a.x, b.x),
          hi: Math.max(a.x, b.x),
        });
      }
    }
  }

  for (let i = 0; i < interiorSegments.length; i += 1) {
    for (let j = i + 1; j < interiorSegments.length; j += 1) {
      const s = interiorSegments[i];
      const t = interiorSegments[j];
      if (s.vertical !== t.vertical || s.coord !== t.coord) continue;
      const overlap = Math.min(s.hi, t.hi) - Math.max(s.lo, t.lo);
      assert.ok(
        overlap < 20,
        `segmentos interiores sobrepostos em ${s.vertical ? 'x' : 'y'}=${s.coord} (${overlap}px)`,
      );
    }
  }
});
