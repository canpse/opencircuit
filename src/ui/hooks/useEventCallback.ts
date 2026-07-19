import { useCallback, useLayoutEffect, useRef } from 'react';

// Devolve um callback com identidade permanente que sempre invoca a versão
// mais recente de `callback`. Permite passar handlers para filhos com
// React.memo sem que cada render do pai invalide a memoização.
export function useEventCallback<Args extends unknown[], Result>(
  callback: (...args: Args) => Result,
): (...args: Args) => Result {
  const callbackRef = useRef(callback);

  useLayoutEffect(() => {
    callbackRef.current = callback;
  });

  return useCallback((...args: Args) => callbackRef.current(...args), []);
}
