import { validateScope } from './circuit-validator.mjs';
import { createVersionedResourceApiHandler } from './versioned-resource-api.mjs';
import {
  formatHierarchyExpansionViolation,
  inspectHierarchyExpansion,
} from '../src/core/hierarchy/expansion.mjs';

/**
 * @typedef {import('./contracts.mjs').Identity} Identity
 * @typedef {import('./contracts.mjs').LibraryComponentDefinition} LibraryComponentDefinition
 * @typedef {import('./contracts.mjs').OperationalError} OperationalError
 * @typedef {import('./contracts.mjs').RateLimiter} RateLimiter
 */

/**
 * @param {import('./library-repository.mjs').LibraryRepository} repository
 * @param {Identity} identity
 * @param {RateLimiter} rateLimiter
 */
export function createLibraryApiHandler(repository, identity, rateLimiter) {
  return createVersionedResourceApiHandler({
    basePath: '/api/library',
    repository,
    identity,
    rateLimiter,
    resourceField: 'definition',
    conflictResponseField: 'definition',
    validateResource: isValidDefinition,
    validateResourceOperation: validateHierarchyBudget,
    messages: {
      notFound: 'Componente não encontrado.',
      invalid: 'Definição de componente inválida.',
      conflict: 'O componente foi alterado em outra aba.',
      internal: 'Erro interno ao persistir componente.',
      logPrefix: 'Library API error:',
    },
  });
}

/** @param {unknown} value @returns {value is Record<string, unknown>} */
function isRecord(value) {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/** @param {unknown} definition @returns {definition is LibraryComponentDefinition} */
function isValidDefinition(definition) {
  if (!isRecord(definition)) return false;
  return validateScope(definition.components, definition.wires, new Map());
}

/** @param {LibraryComponentDefinition} definition @returns {OperationalError | null} */
function validateHierarchyBudget(definition) {
  const result = inspectHierarchyExpansion(
    { version: 1, components: definition.components, wires: definition.wires },
    [],
    { scopeId: 'library-definition' },
  );
  if (result.ok === true) return null;
  return {
    error: formatHierarchyExpansionViolation(result.violation),
    code: 'HIERARCHY_EXPANSION_LIMIT',
    violation: result.violation,
    stats: result.stats,
  };
}
