import { RefObject, useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import type { MouseEvent, WheelEvent } from 'react';
import type { Point } from '../../core/types';
import { beginProfileInteraction } from '../../performance/profiling';
import { circuitContentBounds, type Bounds } from './exportCircuitImage';

export type Camera = { x: number; y: number; width: number; height: number };
type Panning = { startClient: Point; startCamera: Camera } | null;
type ViewportBounds = Pick<DOMRect, 'left' | 'top' | 'width' | 'height'>;
type ViewportSize = Pick<ViewportBounds, 'width' | 'height'>;

const DEFAULT_CAMERA: Camera = { x: 0, y: 0, width: 1200, height: 720 };
const DEFAULT_VIEWPORT: ViewportSize = {
  width: DEFAULT_CAMERA.width,
  height: DEFAULT_CAMERA.height,
};
const MIN_ZOOM = 0.25;
const MAX_ZOOM = 4;
const FIT_MARGIN = 40;

function cameraCenter(camera: Camera): Point {
  return {
    x: camera.x + camera.width / 2,
    y: camera.y + camera.height / 2,
  };
}

function cameraAtScale(center: Point, viewport: ViewportSize, unitsPerPixel: number): Camera {
  const width = viewport.width * unitsPerPixel;
  const height = viewport.height * unitsPerPixel;
  return {
    x: center.x - width / 2,
    y: center.y - height / 2,
    width,
    height,
  };
}

function validViewport(viewport: ViewportSize): boolean {
  return viewport.width > 0 && viewport.height > 0;
}

// Ajusta a área visível quando o espaço do editor muda sem alterar o tamanho
// aparente do circuito. Assim, painéis apenas revelam ou ocultam área do mundo.
export function resizeCameraToViewport(
  camera: Camera,
  previousViewport: ViewportSize,
  nextViewport: ViewportSize,
): Camera {
  if (!validViewport(previousViewport) || !validViewport(nextViewport)) return camera;
  const unitsPerPixel = camera.width / previousViewport.width;
  return cameraAtScale(cameraCenter(camera), nextViewport, unitsPerPixel);
}

// Câmera que enquadra os bounds com margem, centralizada e respeitando os
// limites de zoom. O viewport padrão preserva chamadas sem contexto de layout.
export function fitCameraToBounds(
  bounds: Bounds,
  viewport: ViewportSize = DEFAULT_VIEWPORT,
  baseUnitsPerPixel = 1,
): Camera {
  const safeViewport = validViewport(viewport) ? viewport : DEFAULT_VIEWPORT;
  const fitWidth = bounds.width + FIT_MARGIN * 2;
  const fitHeight = bounds.height + FIT_MARGIN * 2;
  // A folga microscópica evita que arredondamentos de ponto flutuante deixem
  // a margem final uma fração de unidade para fora da câmera.
  const idealUnitsPerPixel =
    Math.max(fitWidth / safeViewport.width, fitHeight / safeViewport.height) *
    (1 + Number.EPSILON * 8);
  const unitsPerPixel = clampUnitsPerPixel(idealUnitsPerPixel, baseUnitsPerPixel);
  return cameraAtScale(
    { x: bounds.x + bounds.width / 2, y: bounds.y + bounds.height / 2 },
    safeViewport,
    unitsPerPixel,
  );
}

export function useCanvasCamera(svgRef: RefObject<SVGSVGElement | null>) {
  const [camera, setCamera] = useState<Camera>(DEFAULT_CAMERA);
  const [panning, setPanning] = useState<Panning>(null);
  const [zoomPercent, setZoomPercent] = useState(100);
  const viewportRef = useRef<ViewportBounds | null>(null);
  const baseUnitsPerPixelRef = useRef<number | null>(null);
  const unitsPerPixelRef = useRef<number | null>(null);

  const resetCamera = useCallback(() => {
    beginProfileInteraction('canvas.reset');
    const viewport = viewportRef.current ?? DEFAULT_VIEWPORT;
    const baseScale = baseUnitsPerPixelRef.current ?? 1;
    unitsPerPixelRef.current = baseScale;
    setZoomPercent(100);
    setCamera(cameraAtScale(cameraCenter(DEFAULT_CAMERA), viewport, baseScale));
  }, []);

  // Enquadra o circuito; com o canvas vazio volta à câmera padrão.
  const zoomToFit = useCallback(() => {
    const svg = svgRef.current;
    const bounds = svg ? circuitContentBounds(svg) : null;
    if (!bounds) {
      resetCamera();
      return;
    }
    beginProfileInteraction('canvas.fit');
    const viewport = viewportRef.current ?? DEFAULT_VIEWPORT;
    const fittedCamera = fitCameraToBounds(bounds, viewport, baseUnitsPerPixelRef.current ?? 1);
    const fittedScale = fittedCamera.width / viewport.width;
    unitsPerPixelRef.current = fittedScale;
    setZoomPercent(Math.round(((baseUnitsPerPixelRef.current ?? 1) / fittedScale) * 100));
    setCamera(fittedCamera);
  }, [resetCamera, svgRef]);

  const zoomAtCenter = useCallback((factor: number) => {
    beginProfileInteraction('canvas.zoom');
    const viewport = viewportRef.current ?? DEFAULT_VIEWPORT;
    const baseScale = baseUnitsPerPixelRef.current ?? 1;
    const currentScale = unitsPerPixelRef.current ?? baseScale;
    const nextScale = clampUnitsPerPixel(currentScale * factor, baseScale);
    unitsPerPixelRef.current = nextScale;
    setZoomPercent(Math.round((baseScale / nextScale) * 100));
    setCamera((current) => cameraAtScale(cameraCenter(current), viewport, nextScale));
  }, []);

  useLayoutEffect(() => {
    const svg = svgRef.current;
    if (!svg) return;
    const updateViewport = () => {
      const nextViewport = svg.getBoundingClientRect();
      if (!validViewport(nextViewport)) return;
      const previousViewport = viewportRef.current;
      viewportRef.current = nextViewport;

      if (baseUnitsPerPixelRef.current === null) {
        const initialScale = DEFAULT_CAMERA.width / nextViewport.width;
        baseUnitsPerPixelRef.current = initialScale;
        unitsPerPixelRef.current = initialScale;
        setCamera(cameraAtScale(cameraCenter(DEFAULT_CAMERA), nextViewport, initialScale));
        return;
      }

      if (
        previousViewport &&
        previousViewport.width === nextViewport.width &&
        previousViewport.height === nextViewport.height
      ) {
        return;
      }

      const currentScale = unitsPerPixelRef.current ?? baseUnitsPerPixelRef.current;
      setPanning(null);
      setCamera((current) => cameraAtScale(cameraCenter(current), nextViewport, currentScale));
    };
    updateViewport();
    const observer = new ResizeObserver(updateViewport);
    observer.observe(svg);
    window.addEventListener('resize', updateViewport);
    return () => {
      observer.disconnect();
      window.removeEventListener('resize', updateViewport);
    };
  }, [svgRef]);

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
        zoomToFit();
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
  }, [zoomAtCenter, zoomToFit]);

  function onWheelZoom(event: WheelEvent<SVGSVGElement>) {
    event.preventDefault();
    const svg = svgRef.current;
    const viewport = viewportRef.current;
    if (!svg || !viewport) return;
    beginProfileInteraction('canvas.zoom');
    const focus = cameraPointFromClient(camera, viewport, event);
    const delta = Math.max(-80, Math.min(80, event.deltaY));
    const factor = Math.exp(delta * 0.0015);
    const baseScale = baseUnitsPerPixelRef.current ?? 1;
    const currentScale = unitsPerPixelRef.current ?? baseScale;
    const nextScale = clampUnitsPerPixel(currentScale * factor, baseScale);
    unitsPerPixelRef.current = nextScale;
    setZoomPercent(Math.round((baseScale / nextScale) * 100));
    setCamera((current) => zoomCamera(current, nextScale, focus, viewport));
  }

  function startPan(event: MouseEvent<SVGSVGElement>) {
    event.preventDefault();
    setPanning({ startClient: { x: event.clientX, y: event.clientY }, startCamera: camera });
  }

  function updatePan(event: MouseEvent<SVGSVGElement>) {
    const svg = svgRef.current;
    const viewport = viewportRef.current;
    if (!svg || !viewport || !panning) return;
    const scale = cameraScale(panning.startCamera, viewport);
    const dx = (event.clientX - panning.startClient.x) / scale;
    const dy = (event.clientY - panning.startClient.y) / scale;
    beginProfileInteraction('canvas.pan');
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
    zoomToFit,
    zoomAtCenter,
    onWheelZoom,
    startPan,
    updatePan,
    setPanning,
  };
}

export function cameraPointFromClient(
  camera: Camera,
  viewport: ViewportBounds,
  clientPoint: { clientX: number; clientY: number },
): Point {
  const scale = cameraScale(camera, viewport);
  const horizontalInset = (viewport.width - camera.width * scale) / 2;
  const verticalInset = (viewport.height - camera.height * scale) / 2;
  return {
    x: camera.x + (clientPoint.clientX - viewport.left - horizontalInset) / scale,
    y: camera.y + (clientPoint.clientY - viewport.top - verticalInset) / scale,
  };
}

function cameraScale(camera: Camera, viewport: ViewportBounds): number {
  return Math.max(
    Number.EPSILON,
    Math.min(viewport.width / camera.width, viewport.height / camera.height),
  );
}

function clampUnitsPerPixel(unitsPerPixel: number, baseUnitsPerPixel: number): number {
  return Math.min(
    baseUnitsPerPixel / MIN_ZOOM,
    Math.max(baseUnitsPerPixel / MAX_ZOOM, unitsPerPixel),
  );
}

function zoomCamera(
  camera: Camera,
  nextUnitsPerPixel: number,
  focus: Point,
  viewport: ViewportSize,
): Camera {
  const nextWidth = viewport.width * nextUnitsPerPixel;
  const nextHeight = viewport.height * nextUnitsPerPixel;
  const focusRatioX = (focus.x - camera.x) / camera.width;
  const focusRatioY = (focus.y - camera.y) / camera.height;
  return {
    x: focus.x - nextWidth * focusRatioX,
    y: focus.y - nextHeight * focusRatioY,
    width: nextWidth,
    height: nextHeight,
  };
}
