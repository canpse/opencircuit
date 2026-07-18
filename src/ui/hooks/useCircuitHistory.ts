import { useEffect } from 'react';
import type { Draft } from 'immer';
import { useImmer } from 'use-immer';

export type HistoryState<T> = { past: T[]; future: T[] };

export function useCircuitHistory<T>(current: T, limit = 100, resetKey?: string) {
  const [history, updateHistory] = useImmer<HistoryState<T>>({ past: [], future: [] });

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    updateHistory(() => ({ past: [], future: [] }));
  }, [resetKey, updateHistory]);

  function remember(snapshot: T = current) {
    updateHistory((draft) => {
      draft.past.push(snapshot as Draft<T>);
      if (draft.past.length > limit) draft.past.shift();
      draft.future = [];
    });
  }

  function undo(): T | null {
    const previous = history.past[history.past.length - 1];
    if (!previous) return null;

    updateHistory((draft) => {
      draft.past.pop();
      draft.future.unshift(current as Draft<T>);
      if (draft.future.length > limit) draft.future.pop();
    });
    return previous;
  }

  function redo(): T | null {
    const next = history.future[0];
    if (!next) return null;

    updateHistory((draft) => {
      draft.future.shift();
      draft.past.push(current as Draft<T>);
      if (draft.past.length > limit) draft.past.shift();
    });
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
