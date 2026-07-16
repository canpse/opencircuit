/// <reference types="vite/client" />

import type { ProfileSample } from './performance/profiling';

declare global {
  interface Window {
    __openCircuitProfile?: {
      samples: ProfileSample[];
      reset: () => void;
      summary: () => Record<string, { count: number; median: number; p95: number; max: number }>;
    };
  }
}
