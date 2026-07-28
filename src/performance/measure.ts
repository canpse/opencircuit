export type ProfileDetails = Record<string, number | string | boolean>;

export type ProfileSample = {
  name: string;
  duration: number;
  timestamp: number;
  details: ProfileDetails;
};

type PendingInteraction = {
  name: string;
  startedAt: number;
};

const MAX_SAMPLES = 5_000;
const samples: ProfileSample[] = [];
let pendingInteractions: PendingInteraction[] = [];
export const PROFILE_ENABLED =
  typeof window !== 'undefined' &&
  new URLSearchParams(window.location.search).get('profile') === '1';

export function addProfileSample(name: string, duration: number, details: ProfileDetails = {}) {
  samples.push({ name, duration, timestamp: performance.now(), details });
  if (samples.length > MAX_SAMPLES) samples.splice(0, samples.length - MAX_SAMPLES);
}

export function measureProfile<T>(name: string, details: ProfileDetails, operation: () => T): T {
  if (!PROFILE_ENABLED) return operation();
  const startedAt = performance.now();
  try {
    return operation();
  } finally {
    addProfileSample(name, performance.now() - startedAt, details);
  }
}

export function beginProfileInteraction(name: string) {
  if (!PROFILE_ENABLED) return;
  pendingInteractions.push({ name, startedAt: performance.now() });
}

export function commitProfileInteractions(details: ProfileDetails) {
  if (!PROFILE_ENABLED || pendingInteractions.length === 0 || typeof window === 'undefined') return;
  const committedAt = performance.now();
  const committed = pendingInteractions;
  pendingInteractions = [];

  for (const interaction of committed) {
    addProfileSample(`${interaction.name}.commit`, committedAt - interaction.startedAt, details);
  }

  window.requestAnimationFrame(() => {
    const frameAt = performance.now();
    for (const interaction of committed) {
      addProfileSample(`${interaction.name}.frame`, frameAt - interaction.startedAt, details);
    }
  });
}

function percentile(sorted: number[], ratio: number): number {
  if (sorted.length === 0) return 0;
  return sorted[Math.min(sorted.length - 1, Math.floor(sorted.length * ratio))];
}

function summarize() {
  return Object.fromEntries(
    Array.from(new Set(samples.map((sample) => sample.name))).map((name) => {
      const durations = samples
        .filter((sample) => sample.name === name)
        .map((sample) => sample.duration)
        .sort((left, right) => left - right);
      return [
        name,
        {
          count: durations.length,
          median: percentile(durations, 0.5),
          p95: percentile(durations, 0.95),
          max: durations[durations.length - 1] ?? 0,
        },
      ];
    }),
  );
}

if (typeof window !== 'undefined' && PROFILE_ENABLED) {
  window.__openCircuitProfile = {
    samples,
    reset() {
      samples.length = 0;
      pendingInteractions = [];
    },
    summary: summarize,
  };
}
