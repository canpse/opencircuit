import assert from 'node:assert/strict';
import { test } from 'vitest';
import type { CircuitDocument, LogicComponent, Wire } from '../../src/core/types';
import { moveComponentsWithWaypoints } from '../../src/ui/app/editorUtils';

const GRID = 20;

function component(id: string, x: number, y = 100): LogicComponent {
  return { id, type: 'and', x, y };
}

function wire(id: string, from: string, to: string, waypoints: Wire['waypoints']): Wire {
  return {
    id,
    from: { componentId: from, pinId: 'out' },
    to: { componentId: to, pinId: 'in1' },
    waypoints,
  };
}

function circuit(components: LogicComponent[], wires: Wire[]): CircuitDocument {
  return { version: 1, components, wires };
}

test('MoveWaypointsQuandoAsDuasPontasDoFioMovemJuntas', () => {
  const original = circuit(
    [component('A', 100), component('B', 300)],
    [
      wire('W1', 'A', 'B', [
        { x: 180, y: 80 },
        { x: 240, y: 160 },
      ]),
    ],
  );

  const moved = moveComponentsWithWaypoints(
    original,
    [
      { componentId: 'A', point: { x: 140, y: 120 } },
      { componentId: 'B', point: { x: 340, y: 120 } },
    ],
    GRID,
  );

  assert.deepEqual(moved.wires[0].waypoints, [
    { x: 220, y: 100 },
    { x: 280, y: 180 },
  ]);
});

test('MantemWaypointsFixosQuandoSoUmaPontaDoFioSeMove', () => {
  const waypoint = { x: 200, y: 80 };
  const original = circuit(
    [component('A', 100), component('B', 300)],
    [wire('W1', 'A', 'B', [waypoint])],
  );

  const moved = moveComponentsWithWaypoints(
    original,
    [{ componentId: 'A', point: { x: 140, y: 120 } }],
    GRID,
  );

  assert.equal(moved.wires[0], original.wires[0]);
  assert.deepEqual(moved.wires[0].waypoints, [waypoint]);
});

test('MoveApenasWaypointsDosFiosInternosAoGrupo', () => {
  const original = circuit(
    [component('A', 100), component('B', 300), component('C', 500)],
    [
      wire('internal', 'A', 'B', [{ x: 200, y: 80 }]),
      wire('boundary', 'B', 'C', [{ x: 400, y: 80 }]),
    ],
  );

  const moved = moveComponentsWithWaypoints(
    original,
    [
      { componentId: 'A', point: { x: 120, y: 140 } },
      { componentId: 'B', point: { x: 320, y: 140 } },
    ],
    GRID,
  );

  assert.deepEqual(moved.wires[0].waypoints, [{ x: 220, y: 120 }]);
  assert.equal(moved.wires[1], original.wires[1]);
});

test('MoveWaypointsDeSelfLoopComOComponente', () => {
  const original = circuit([component('A', 100)], [wire('loop', 'A', 'A', [{ x: 180, y: 40 }])]);

  const moved = moveComponentsWithWaypoints(
    original,
    [{ componentId: 'A', point: { x: 120, y: 140 } }],
    GRID,
  );

  assert.deepEqual(moved.wires[0].waypoints, [{ x: 200, y: 80 }]);
});

test('MovimentosContinuosNaoAcumulamODeslocamentoTotalMaisDeUmaVez', () => {
  const original = circuit(
    [component('A', 100), component('B', 300)],
    [wire('W1', 'A', 'B', [{ x: 200, y: 80 }])],
  );
  const firstFrame = moveComponentsWithWaypoints(
    original,
    [
      { componentId: 'A', point: { x: 120, y: 100 } },
      { componentId: 'B', point: { x: 320, y: 100 } },
    ],
    GRID,
  );
  const secondFrame = moveComponentsWithWaypoints(
    firstFrame,
    [
      { componentId: 'A', point: { x: 140, y: 100 } },
      { componentId: 'B', point: { x: 340, y: 100 } },
    ],
    GRID,
  );

  assert.deepEqual(secondFrame.wires[0].waypoints, [{ x: 240, y: 80 }]);
});

test('MantemWaypointQuandoAsPontasNaoRecebemAMesmaTranslacao', () => {
  const original = circuit(
    [component('A', 100), component('B', 300)],
    [wire('W1', 'A', 'B', [{ x: 200, y: 80 }])],
  );

  const moved = moveComponentsWithWaypoints(
    original,
    [
      { componentId: 'A', point: { x: 120, y: 100 } },
      { componentId: 'B', point: { x: 340, y: 100 } },
    ],
    GRID,
  );

  assert.equal(moved.wires[0], original.wires[0]);
});
