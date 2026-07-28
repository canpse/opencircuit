import assert from 'node:assert/strict';
import { test } from 'vitest';
import {
  componentMovesForDrag,
  normalizeRect,
  resizedTextWidth,
} from '../../src/ui/editor/useCanvasPointerInteractions';

test('normaliza marquee arrastado em qualquer direção', () => {
  assert.deepEqual(normalizeRect({ x: 30, y: 50 }, { x: 10, y: 20 }), {
    x: 10,
    y: 20,
    width: 20,
    height: 30,
  });
});

test('move todos os componentes selecionados pelo mesmo deslocamento', () => {
  assert.deepEqual(
    componentMovesForDrag(
      {
        componentIds: ['a', 'b'],
        startMouse: { x: 10, y: 20 },
        origins: {
          a: { x: 100, y: 200 },
          b: { x: 300, y: 400 },
        },
        recorded: false,
      },
      { x: 25, y: 5 },
    ),
    [
      { componentId: 'a', point: { x: 115, y: 185 } },
      { componentId: 'b', point: { x: 315, y: 385 } },
    ],
  );
});

test('resize respeita largura mínima do texto', () => {
  const resizing = {
    componentId: 'text',
    startMouse: { x: 100, y: 0 },
    startWidth: 120,
    recorded: false,
  };
  assert.equal(resizedTextWidth(resizing, { x: 150, y: 0 }), 170);
  assert.equal(resizedTextWidth(resizing, { x: 0, y: 0 }), 90);
});
