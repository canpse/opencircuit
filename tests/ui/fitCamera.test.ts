import { test } from 'vitest';
import assert from 'node:assert/strict';
import { fitCameraToBounds, resizeCameraToViewport } from '../../src/ui/editor/useCanvasCamera';

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

test('CameraResponsivaAssumeAProporcaoDoViewport', () => {
  const camera = { x: 0, y: 0, width: 1200, height: 720 };
  const resized = resizeCameraToViewport(
    camera,
    { width: 1000, height: 600 },
    { width: 1000, height: 400 },
  );

  assert.equal(resized.width / resized.height, 1000 / 400);
  assert.deepEqual(centerOf(resized), centerOf(camera));
});

test('CameraResponsivaPreservaAEscalaVisual', () => {
  const camera = { x: 100, y: 50, width: 900, height: 600 };
  const previousViewport = { width: 900, height: 600 };
  const nextViewport = { width: 720, height: 360 };
  const resized = resizeCameraToViewport(camera, previousViewport, nextViewport);

  assert.equal(resized.width / nextViewport.width, camera.width / previousViewport.width);
  assert.equal(resized.height / nextViewport.height, camera.height / previousViewport.height);
  assert.deepEqual(centerOf(resized), centerOf(camera));
});

test('FitUsaAProporcaoAtualDoViewport', () => {
  const viewport = { width: 900, height: 400 };
  const camera = fitCameraToBounds({ x: 100, y: 100, width: 600, height: 240 }, viewport, 1);

  assert.ok(Math.abs(camera.width / camera.height - viewport.width / viewport.height) < 1e-12);
});
