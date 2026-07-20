import { test } from 'vitest';
import assert from 'node:assert/strict';
import { fitCameraToBounds } from '../../src/ui/editor/useCanvasCamera';

const DEFAULT_WIDTH = 1200;
const MIN_ZOOM = 0.25;
const MAX_ZOOM = 4;

function zoomOf(camera: { width: number }): number {
  return DEFAULT_WIDTH / camera.width;
}

function centerOf(rect: { x: number; y: number; width: number; height: number }) {
  return { x: rect.x + rect.width / 2, y: rect.y + rect.height / 2 };
}

test('FitContemOsBoundsComMargem', () => {
  const bounds = { x: 100, y: 200, width: 800, height: 300 };
  const camera = fitCameraToBounds(bounds);
  assert.ok(camera.x <= bounds.x - 40, 'esquerda com margem');
  assert.ok(camera.y <= bounds.y - 40, 'topo com margem');
  assert.ok(camera.x + camera.width >= bounds.x + bounds.width + 40, 'direita com margem');
  assert.ok(camera.y + camera.height >= bounds.y + bounds.height + 40, 'base com margem');
});

test('FitCentralizaOCircuito', () => {
  const bounds = { x: -500, y: 900, width: 600, height: 200 };
  const camera = fitCameraToBounds(bounds);
  const boundsCenter = centerOf(bounds);
  const cameraCenter = centerOf(camera);
  assert.ok(Math.abs(cameraCenter.x - boundsCenter.x) < 1e-6, 'centro X');
  assert.ok(Math.abs(cameraCenter.y - boundsCenter.y) < 1e-6, 'centro Y');
});

test('FitMantemProporcaoDaCameraPadrao', () => {
  const camera = fitCameraToBounds({ x: 0, y: 0, width: 3000, height: 100 });
  assert.ok(Math.abs(camera.width / camera.height - 1200 / 720) < 1e-6);
});

test('FitCircuitoMinusculoRespeitaZoomMaximo', () => {
  const camera = fitCameraToBounds({ x: 0, y: 0, width: 10, height: 10 });
  assert.ok(zoomOf(camera) <= MAX_ZOOM + 1e-6, 'não passa do zoom máximo');
});

test('FitCircuitoGiganteRespeitaZoomMinimo', () => {
  const bounds = { x: 0, y: 0, width: 50000, height: 50000 };
  const camera = fitCameraToBounds(bounds);
  assert.ok(zoomOf(camera) >= MIN_ZOOM - 1e-6, 'não passa do zoom mínimo');
  const boundsCenter = centerOf(bounds);
  const cameraCenter = centerOf(camera);
  assert.ok(Math.abs(cameraCenter.x - boundsCenter.x) < 1e-6, 'segue centralizado');
});
