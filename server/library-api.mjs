import { validateScope } from './circuit-validator.mjs';
import { createVersionedResourceApiHandler } from './versioned-resource-api.mjs';

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
