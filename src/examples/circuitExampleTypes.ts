import type { CircuitDocument } from '../core/types';

export const CIRCUIT_EXAMPLE_IDS = [
  'signal-led-basic',
  'xor',
  'nand-not',
  'and-basic',
  'or-basic',
  'not-basic',
  'nand-basic',
  'nor-basic',
  'xnor-basic',
  'microwave-safety-challenge',
  'd-latch-basic',
  'd-flip-flop-basic',
  'register-4-basic',
  'sync-counter-8bit',
  'ripple-counter-broken',
  'johnson-counter-8bit',
  'sr-latch-nor-experiment',
  'sr-latch-nand-active-low',
  'gated-d-latch-from-nand',
  'half-adder',
  'full-adder',
  'adder-2-bit',
  'adder-4-bit',
  'subtractor-4-bit',
  'adder-4-bit-gates',
  'subtractor-4-bit-gates',
  'alu-4-bit',
  'mux-2-1',
  'comparator-1-bit',
  'decoder-2-4',
  'demux-1-2',
  'odd-parity-3',
  'majority-3',
  'half-subtractor',
  'full-subtractor',
  'encoder-4-2',
  'mux-4-1',
] as const;

export type CircuitExampleId = (typeof CIRCUIT_EXAMPLE_IDS)[number];
export type CircuitDifficulty = 1 | 2 | 3 | 4 | 5;
export type CircuitLevel = 'concept' | 'composition' | 'system';
export type CircuitExampleMode = 'demo' | 'guided' | 'incomplete' | 'challenge' | 'test';
export type CircuitPrerequisite = CircuitExampleId | { note: string };

export type CurriculumModule = { id: string; title: string; description: string };
export type CurriculumTrack = { id: string; title: string; description: string };
export type CurriculumFamily = { id: string; title: string; description: string };

export type CircuitExample = {
  id: CircuitExampleId;
  name: string;
  description: string;
  moduleId: string;
  familyIds: string[];
  trackIds: string[];
  difficulty: CircuitDifficulty;
  level: CircuitLevel;
  /** Example ids become links; explanatory text must be explicitly classified as a note. */
  prerequisites: CircuitPrerequisite[];
  concepts: string[];
  goal: string;
  steps: string[];
  ideas: string[];
  next: CircuitExampleId[];
  extensions: string[];
  modes: CircuitExampleMode[];
  observe: string[];
  experiments: string[];
  challenge?: string;
  exercises: string[];
  circuit: CircuitDocument;
};

export type ExampleMetadata = Omit<CircuitExample, 'id' | 'name' | 'circuit'>;

export type CircuitLesson = {
  id: string;
  title: string;
  description: string;
  exampleIds: CircuitExampleId[];
  examples: CircuitExample[];
};
