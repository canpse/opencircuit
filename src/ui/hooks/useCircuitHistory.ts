import { useEffect } from 'react';
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
      draft.past.push(snapshot as any);
      if (draft.past.length > limit) draft.past.shift();
      draft.future = [];
    });
  }

  function undo(): T | null {
    let previous: T | null = null;
    updateHistory((draft) => {
      if (draft.past.length === 0) return;
      previous = draft.past.pop() as T;
      draft.future.unshift(current as any);
      if (draft.future.length > limit) draft.future.pop();
    });
    return previous;
  }

  function redo(): T | null {
    let next: T | null = null;
    updateHistory((draft) => {
      if (draft.future.length === 0) return;
      next = draft.future.shift() as T;
      draft.past.push(current as any);
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

