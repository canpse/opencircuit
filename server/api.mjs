import { isCircuitDocument } from './circuit-validator.mjs';
import { createVersionedResourceApiHandler } from './versioned-resource-api.mjs';

export function createApiHandler(repository, identity, rateLimiter) {
  return createVersionedResourceApiHandler({
    basePath: '/api/circuits',
    repository,
    identity,
    rateLimiter,
    resourceField: 'circuit',
    resultField: 'circuit',
    conflictResponseField: 'circuit',
    validateResource: isCircuitDocument,
    messages: {
      notFound: 'Circuito não encontrado.',
      invalid: 'CircuitDocument inválido.',
      conflict: 'O circuito foi alterado em outra aba.',
      internal: 'Erro interno ao persistir circuito.',
      logPrefix: 'Circuit API error:',
    },
  });
}
