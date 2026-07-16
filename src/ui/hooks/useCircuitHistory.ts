import { useEffect, useState } from 'react';

export type HistoryState<T> = { past: T[]; future: T[] };

export function useCircuitHistory<T>(current: T, limit = 100, resetKey?: string) {
  const [history, setHistory] = useState<HistoryState<T>>({ past: [], future: [] });

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setHistory({ past: [], future: [] });
  }, [resetKey]);

  function remember(snapshot: T = current) {
    setHistory((state) => ({
      past: [...state.past, snapshot].slice(-limit),
      future: [],
    }));
  }

  function undo(): T | null {
    const previous = history.past[history.past.length - 1];
    if (!previous) return null;
    setHistory((state) => ({
      past: state.past.slice(0, -1),
      future: [current, ...state.future].slice(0, limit),
    }));
    return previous;
  }

  function redo(): T | null {
    const next = history.future[0];
    if (!next) return null;
    setHistory((state) => ({
      past: [...state.past, current].slice(-limit),
      future: state.future.slice(1),
    }));
    return next;
  }

  return {
    history,
    canUndo: history.past.length > 0,
    canRedo: history.future.length > 0,
    remember,
    undo,
    redo,
  };
}
