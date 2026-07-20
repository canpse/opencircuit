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
      />
    </svg>,
  );

  assert.equal((markup.match(/tunnel-stub/g) ?? []).length, 2);
  assert.match(markup, /▸ CLK/);
  assert.match(markup, /CLK ▸/);
});
