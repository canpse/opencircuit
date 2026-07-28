import { COMPONENT_DEFINITIONS } from './catalog';
import type { ComponentDefinition, GateType } from './types';

export type ComponentCategory =
  'inputs' | 'outputs' | 'gates' | 'combinational' | 'sequential' | 'buses' | 'annotations';

export type ComponentDescriptor = {
  definition: ComponentDefinition;
  idPrefix: string;
  category: ComponentCategory | null;
  sequential: boolean;
  observableRank: number | null;
};

function descriptor(
  type: GateType,
  idPrefix: string,
  category: ComponentCategory | null,
  options: { sequential?: boolean; observableRank?: number } = {},
): ComponentDescriptor {
  return {
    definition: COMPONENT_DEFINITIONS[type],
    idPrefix,
    category,
    sequential: options.sequential ?? false,
    observableRank: options.observableRank ?? null,
  };
}

/**
 * Canonical non-semantic metadata for every GateType. The semantic pin contract
 * remains in component-contract.json and gate evaluation remains explicit in the
 * simulator; this registry covers discoverability and editor presentation policy.
 */
export const COMPONENT_REGISTRY: Record<GateType, ComponentDescriptor> = {
  input: descriptor('input', 'I', 'inputs', { observableRank: 1 }),
  button: descriptor('button', 'P', 'inputs', { observableRank: 1 }),
  led: descriptor('led', 'L', 'outputs', { observableRank: 3 }),
  and: descriptor('and', 'A', 'gates'),
  nand: descriptor('nand', 'NA', 'gates'),
  or: descriptor('or', 'O', 'gates'),
  nor: descriptor('nor', 'NO', 'gates'),
  xor: descriptor('xor', 'X', 'gates'),
  xnor: descriptor('xnor', 'XN', 'gates'),
  not: descriptor('not', 'N', 'gates'),
  text: descriptor('text', 'T', 'annotations'),
  'half-adder': descriptor('half-adder', 'HS', 'combinational'),
  'full-adder': descriptor('full-adder', 'FS', 'combinational'),
  'mux-2-1': descriptor('mux-2-1', 'M2', 'combinational'),
  'mux-4-1': descriptor('mux-4-1', 'M4', 'combinational'),
  'decoder-2-4': descriptor('decoder-2-4', 'D', 'combinational'),
  'comparator-1-bit': descriptor('comparator-1-bit', 'C', 'combinational'),
  'encoder-4-2': descriptor('encoder-4-2', 'E', 'combinational'),
  'odd-parity-3': descriptor('odd-parity-3', 'P', 'combinational'),
  'majority-3': descriptor('majority-3', 'MJ', 'combinational'),
  'half-subtractor': descriptor('half-subtractor', 'HSub', 'combinational'),
  'full-subtractor': descriptor('full-subtractor', 'FSub', 'combinational'),
  clock: descriptor('clock', 'CLK', 'sequential', { sequential: true, observableRank: 0 }),
  'd-latch': descriptor('d-latch', 'DL', 'sequential', {
    sequential: true,
    observableRank: 2,
  }),
  'd-flip-flop': descriptor('d-flip-flop', 'DFF', 'sequential', {
    sequential: true,
    observableRank: 2,
  }),
  'register-4': descriptor('register-4', 'REG', 'sequential', {
    sequential: true,
    observableRank: 2,
  }),
  'merge-4': descriptor('merge-4', 'MG', 'buses'),
  'split-4': descriptor('split-4', 'SP', 'buses'),
  'display-4': descriptor('display-4', 'DISP', 'buses', { observableRank: 3 }),
  'bus-in-4': descriptor('bus-in-4', 'BI', 'buses'),
  'adder-4': descriptor('adder-4', 'AD4', 'buses'),
  'subtractor-4': descriptor('subtractor-4', 'SB4', 'buses'),
  'comparator-4': descriptor('comparator-4', 'CP4', 'buses'),
  subcircuit: descriptor('subcircuit', 'U', null),
};

export const INSERTABLE_COMPONENT_TYPES = (Object.keys(COMPONENT_REGISTRY) as GateType[]).filter(
  (type) => COMPONENT_REGISTRY[type].category !== null,
);

export const SEQUENTIAL_TYPES = (Object.keys(COMPONENT_REGISTRY) as GateType[]).filter(
  (type) => COMPONENT_REGISTRY[type].sequential,
);
