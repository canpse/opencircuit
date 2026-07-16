import { useEffect, useState } from 'react';
import type { WireStyle } from '../editor/CircuitCanvas';
import { loadWireStyle } from '../app/editorUtils';

export function useWireStylePreference(storageKey: string) {
  const [wireStyle, setWireStyle] = useState<WireStyle>(() => loadWireStyle(storageKey));

  useEffect(() => {
    try {
      localStorage.setItem(storageKey, wireStyle);
    } catch {
      // Keep the preference in memory when browser storage is unavailable.
    }
  }, [storageKey, wireStyle]);

  return [wireStyle, setWireStyle] as const;
}
