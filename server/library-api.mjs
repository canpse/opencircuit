import { validateScope } from './circuit-validator.mjs';
import { createVersionedResourceApiHandler } from './versioned-resource-api.mjs';
import {
  formatHierarchyExpansionViolation,
  inspectHierarchyExpansion,
} from '../src/core/hierarchy/expansion.mjs';

export function createLibraryApiHandler(repository, identity, rateLimiter) {
  return createVersionedResourceApiHandler({
    basePath: '/api/library',
    repository,
    identity,
    rateLimiter,
    resourceField: 'definition',
    resultField: 'entry',
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

function isValidDefinition(definition) {
  if (!definition || typeof definition !== 'object' || Array.isArray(definition)) return false;
  return validateScope(definition.components, definition.wires, new Map());
}

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
