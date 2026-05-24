import { useEffect, useState } from 'react';
import type { WireStyle } from '../editor/CircuitCanvas';
import { loadWireStyle } from '../app/editorUtils';

export function useWireStylePreference(storageKey: string) {
  const [wireStyle, setWireStyle] = useState<WireStyle>(() => loadWireStyle(storageKey));

  useEffect(() => {
    localStorage.setItem(storageKey, wireStyle);
  }, [storageKey, wireStyle]);

  return [wireStyle, setWireStyle] as const;
}
