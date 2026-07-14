import { useEffect, useState } from 'react';

export function useResizableSidePanel(initialWidth = 320, minWidth = 260, maxWidth = 620) {
  const [width, setWidth] = useState(initialWidth);
  const [resizing, setResizing] = useState(false);

  useEffect(() => {
    if (!resizing) return;

    function onMouseMove(event: globalThis.MouseEvent) {
      const nextWidth = Math.min(maxWidth, Math.max(minWidth, window.innerWidth - event.clientX));
      setWidth(nextWidth);
    }

    function onMouseUp() {
      setResizing(false);
    }

    document.body.classList.add('resizing-panel');
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
    return () => {
      document.body.classList.remove('resizing-panel');
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
    };
  }, [maxWidth, minWidth, resizing]);

  return {
    width,
    resizing,
    startResizing: () => setResizing(true),
    stopResizing: () => setResizing(false),
  };
}
