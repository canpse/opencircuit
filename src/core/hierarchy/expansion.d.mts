import type { CircuitDefinition, CircuitDocument } from '../types';

export interface HierarchyExpansionLimits {
  maxDepth: number;
  maxComponents: number;
  maxWires: number;
  maxInstances: number;
  maxPathLength: number;
  maxIdCharacters: number;
  maxWork: number;
}

export interface HierarchyExpansionStats {
  components: number;
  wires: number;
  instances: number;
  maxDepth: number;
  maxPathLength: number;
  totalIdCharacters: number;
  work: number;
}

export type HierarchyExpansionViolationCode =
  | 'max-depth'
  | 'max-components'
  | 'max-wires'
  | 'max-instances'
  | 'max-path-length'
  | 'max-id-characters'
  | 'max-work';

export interface HierarchyExpansionViolation {
  code: HierarchyExpansionViolationCode;
  metric: keyof HierarchyExpansionStats;
  limit: number;
  actual: number;
  scopeId: string;
}

export type HierarchyExpansionResult =
  | {
      ok: true;
      stats: HierarchyExpansionStats;
      scopeId: string;
      scopes?: Array<{
        ok: true;
        stats: HierarchyExpansionStats;
        scopeId: string;
      }>;
    }
  | {
      ok: false;
      stats: HierarchyExpansionStats;
      violation: HierarchyExpansionViolation;
      scopeId: string;
    };

export interface HierarchyExpansionOptions {
  limits?: Partial<HierarchyExpansionLimits>;
  scopeId?: string;
}

export const DEFAULT_HIERARCHY_LIMITS: Readonly<HierarchyExpansionLimits>;

export class HierarchyExpansionError extends Error {
  readonly code: 'HIERARCHY_EXPANSION_LIMIT';
  readonly violation: HierarchyExpansionViolation;
  readonly stats: HierarchyExpansionStats;
  readonly scopeId: string;
  constructor(result: Extract<HierarchyExpansionResult, { ok: false }>);
}

export function formatHierarchyExpansionViolation(violation: HierarchyExpansionViolation): string;

export function inspectHierarchyExpansion(
  scope: CircuitDocument,
  definitions?: CircuitDefinition[],
  options?: HierarchyExpansionOptions,
): HierarchyExpansionResult;

export function inspectCircuitHierarchy(
  document: CircuitDocument,
  options?: HierarchyExpansionOptions,
): HierarchyExpansionResult;

export function assertHierarchyExpansionAllowed(
  scope: CircuitDocument,
  definitions?: CircuitDefinition[],
  options?: HierarchyExpansionOptions,
): HierarchyExpansionStats;

export function assertCircuitHierarchyAllowed(
  document: CircuitDocument,
  options?: HierarchyExpansionOptions,
): HierarchyExpansionResult;
