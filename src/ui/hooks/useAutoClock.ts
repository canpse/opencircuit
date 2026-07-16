import { useEffect } from 'react';

interface AutoClockOptions {
  running: boolean;
  intervalMs: number;
  onTick: () => void;
}

export function useAutoClock({ running, intervalMs, onTick }: AutoClockOptions) {
  useEffect(() => {
    if (!running) return;
    const timer = window.setInterval(onTick, intervalMs);
    return () => window.clearInterval(timer);
  }, [intervalMs, onTick, running]);
}
