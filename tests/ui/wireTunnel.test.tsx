import { renderToStaticMarkup } from 'react-dom/server';
import { test } from 'vitest';
import assert from 'node:assert/strict';
import { WireView } from '../../src/ui/editor/WireView';
import type { LogicComponent, Wire } from '../../src/core/types';

test('TunelRenderizaTocosRotuladosNasDuasPontas', () => {
  const source: LogicComponent = { id: 'IN', type: 'input', x: 20, y: 40 };
  const target: LogicComponent = { id: 'LED', type: 'led', x: 320, y: 40 };
  const tunnel: Wire = {
    id: 'W1',
    from: { componentId: 'IN', pinId: 'out' },
    to: { componentId: 'LED', pinId: 'in' },
    display: 'tunnel',
    label: 'CLK',
  };

  const markup = renderToStaticMarkup(
    <svg>
      <WireView
        wire={tunnel}
        route={undefined}
        wireStyle="orthogonal"
        fromComponent={source}
        toComponent={target}
        active={false}
        selected={false}
        onSelect={() => undefined}
        onContextMenu={() => undefined}
        onRemove={() => undefined}
        onRename={() => undefined}
        onWireMouseDown={() => undefined}
        onWaypointMouseDown={() => undefined}
        onRemoveWaypoint={() => undefined}
      />
    </svg>,
  );

  assert.equal((markup.match(/tunnel-stub/g) ?? []).length, 2);
  assert.match(markup, /▸ CLK/);
  assert.match(markup, /CLK ▸/);
});

test('FioSelecionadoRenderizaGuiasFocaveis', () => {
  const source: LogicComponent = { id: 'IN', type: 'input', x: 20, y: 40 };
  const target: LogicComponent = { id: 'LED', type: 'led', x: 320, y: 40 };
  const wire: Wire = {
    id: 'W1',
    from: { componentId: 'IN', pinId: 'out' },
    to: { componentId: 'LED', pinId: 'in' },
    waypoints: [{ x: 200, y: 120 }],
  };

  const markup = renderToStaticMarkup(
    <svg>
      <WireView
        wire={wire}
        route={{
          wireId: 'W1',
          points: [{ x: 100, y: 66 }, ...wire.waypoints, { x: 320, y: 66 }],
          jumps: [],
        }}
        wireStyle="orthogonal"
        fromComponent={source}
        toComponent={target}
        active={false}
        selected
        onSelect={() => undefined}
        onContextMenu={() => undefined}
        onRemove={() => undefined}
        onRename={() => undefined}
        onWireMouseDown={() => undefined}
        onWaypointMouseDown={() => undefined}
        onRemoveWaypoint={() => undefined}
      />
    </svg>,
  );

  assert.match(markup, /class="wire-waypoint"/);
  assert.match(markup, /tabindex="0"/);
  assert.match(markup, /aria-label="Guia de rota 1"/);
});
