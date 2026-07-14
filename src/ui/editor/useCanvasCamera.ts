import { RefObject, useEffect, useState } from 'react';
import type { MouseEvent, WheelEvent } from 'react';
import type { Point } from '../../core/types';

export type Camera = { x: number; y: number; width: number; height: number };
type Panning = { startClient: Point; startCamera: Camera } | null;

const DEFAULT_CAMERA: Camera = { x: 0, y: 0, width: 1200, height: 720 };
const MIN_ZOOM = 0.25;
const MAX_ZOOM = 4;

export function useCanvasCamera(
  svgRef: RefObject<SVGSVGElement | null>,
  svgPoint: (event: { clientX: number; clientY: number }) => Point,
) {
  const [camera, setCamera] = useState<Camera>(DEFAULT_CAMERA);
  const [panning, setPanning] = useState<Panning>(null);
  const zoomPercent = Math.round((DEFAULT_CAMERA.width / camera.width) * 100);

  useEffect(() => {
    function isEditingText(target: EventTarget | null): boolean {
      const element = target as HTMLElement | null;
      return (
        element?.tagName === 'INPUT' ||
        element?.tagName === 'TEXTAREA' ||
        Boolean(element?.isContentEditable)
      );
    }

    function onKeyDown(event: KeyboardEvent) {
      if (isEditingText(event.target)) return;
      const command = event.ctrlKey || event.metaKey;
      if (!command) return;
      if (event.key === '+' || event.key === '=') {
        event.preventDefault();
        zoomAtCenter(1 / 1.2);
      } else if (event.key === '-') {
        event.preventDefault();
        zoomAtCenter(1.2);
      } else if (event.key === '0') {
        event.preventDefault();
        resetCamera();
      }
    }

    function onBlur() {
      setPanning(null);
    }

    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('blur', onBlur);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('blur', onBlur);
    };
  }, [camera]);

  function resetCamera() {
    setCamera(DEFAULT_CAMERA);
  }

  function zoomAtCenter(factor: number) {
    setCamera((current) =>
      zoomCamera(current, factor, {
        x: current.x + current.width / 2,
        y: current.y + current.height / 2,
      }),
    );
  }

  function onWheelZoom(event: WheelEvent<SVGSVGElement>) {
    event.preventDefault();
    const focus = svgPoint(event);
    const delta = Math.max(-80, Math.min(80, event.deltaY));
    const factor = Math.exp(delta * 0.0015);
    setCamera((current) => zoomCamera(current, factor, focus));
  }

  function startPan(event: MouseEvent<SVGSVGElement>) {
    event.preventDefault();
    setPanning({ startClient: { x: event.clientX, y: event.clientY }, startCamera: camera });
  }

  function updatePan(event: MouseEvent<SVGSVGElement>) {
    const svg = svgRef.current;
    if (!svg || !panning) return;
    const rect = svg.getBoundingClientRect();
    const dx = ((event.clientX - panning.startClient.x) * panning.startCamera.width) / rect.width;
    const dy = ((event.clientY - panning.startClient.y) * panning.startCamera.height) / rect.height;
    setCamera({
      ...panning.startCamera,
      x: panning.startCamera.x - dx,
      y: panning.startCamera.y - dy,
    });
  }

  return {
    camera,
    panning,
    zoomPercent,
    resetCamera,
    zoomAtCenter,
    onWheelZoom,
    startPan,
    updatePan,
    setPanning,
  };
}

function zoomCamera(camera: Camera, factor: number, focus: Point): Camera {
  const currentZoom = DEFAULT_CAMERA.width / camera.width;
  const nextZoom = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, currentZoom / factor));
  const nextWidth = DEFAULT_CAMERA.width / nextZoom;
  const nextHeight = DEFAULT_CAMERA.height / nextZoom;
  const focusRatioX = (focus.x - camera.x) / camera.width;
  const focusRatioY = (focus.y - camera.y) / camera.height;
  return {
    x: focus.x - nextWidth * focusRatioX,
    y: focus.y - nextHeight * focusRatioY,
    width: nextWidth,
    height: nextHeight,
  };
}
