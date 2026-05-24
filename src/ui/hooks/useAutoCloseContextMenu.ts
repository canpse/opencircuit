import { useEffect } from 'react';

export function useAutoCloseContextMenu(onClose: () => void) {
  useEffect(() => {
    window.addEventListener('click', onClose);
    window.addEventListener('resize', onClose);
    return () => {
      window.removeEventListener('click', onClose);
      window.removeEventListener('resize', onClose);
    };
  }, [onClose]);
}
