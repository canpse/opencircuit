import { isCircuitDocument } from './circuit-validator.mjs';
import { createVersionedResourceApiHandler } from './versioned-resource-api.mjs';
import {
  formatHierarchyExpansionViolation,
  inspectCircuitHierarchy,
} from '../src/core/hierarchy/expansion.mjs';

/**
 * @typedef {import('../src/core/types.js').CircuitDocument} CircuitDocument
 * @typedef {import('./contracts.mjs').Identity} Identity
 * @typedef {import('./contracts.mjs').OperationalError} OperationalError
 * @typedef {import('./contracts.mjs').RateLimiter} RateLimiter
 */

/**
 * @param {import('./circuit-repository.mjs').CircuitRepository} repository
 * @param {Identity} identity
 * @param {RateLimiter} rateLimiter
 */
export function createApiHandler(repository, identity, rateLimiter) {
  return createVersionedResourceApiHandler({
    basePath: '/api/circuits',
    repository,
    identity,
    rateLimiter,
    resourceField: 'circuit',
    conflictResponseField: 'circuit',
    validateResource: isCircuitDocument,
    validateResourceOperation: validateHierarchyBudget,
    messages: {
      notFound: 'Circuito não encontrado.',
      invalid: 'CircuitDocument inválido.',
      conflict: 'O circuito foi alterado em outra aba.',
      internal: 'Erro interno ao persistir circuito.',
      logPrefix: 'Circuit API error:',
    },
  });
}

/** @param {CircuitDocument} circuit @returns {OperationalError | null} */
function validateHierarchyBudget(circuit) {
  const result = inspectCircuitHierarchy(circuit);
  if (result.ok === true) return null;
  return {
    error: formatHierarchyExpansionViolation(result.violation),
    code: 'HIERARCHY_EXPANSION_LIMIT',
    violation: result.violation,
    stats: result.stats,
  };
}
