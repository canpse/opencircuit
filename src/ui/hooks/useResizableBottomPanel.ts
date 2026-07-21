import { useEffect, useRef, useState } from 'react';

type DragStart = { clientY: number; height: number };

export function useResizableBottomPanel(initialHeight = 260, minHeight = 150, maxHeight = 520) {
  const [height, setHeight] = useState(initialHeight);
  const [resizing, setResizing] = useState(false);
  const dragStartRef = useRef<DragStart | null>(null);

  useEffect(() => {
    if (!resizing) return;

    function onMouseMove(event: globalThis.MouseEvent) {
      const start = dragStartRef.current;
      if (!start) return;
      const nextHeight = start.height + start.clientY - event.clientY;
      setHeight(clampBottomPanelHeight(nextHeight, minHeight, maxHeight, window.innerHeight));
    }

    function onMouseUp() {
      dragStartRef.current = null;
      setResizing(false);
    }

    document.body.classList.add('resizing-bottom-panel');
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
    return () => {
      document.body.classList.remove('resizing-bottom-panel');
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
    };
  }, [maxHeight, minHeight, resizing]);

  function resizeBy(delta: number) {
    setHeight((current) =>
      clampBottomPanelHeight(current + delta, minHeight, maxHeight, window.innerHeight),
    );
  }

  return {
    height,
    resizing,
    startResizing: (clientY: number) => {
      dragStartRef.current = { clientY, height };
      setResizing(true);
    },
    resizeBy,
  };
}

export function clampBottomPanelHeight(
  height: number,
  minHeight: number,
  maxHeight: number,
  viewportHeight: number,
): number {
  const viewportMax = Math.max(minHeight, viewportHeight - 300);
  return Math.min(Math.min(maxHeight, viewportMax), Math.max(minHeight, height));
}
