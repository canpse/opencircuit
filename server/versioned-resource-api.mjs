import { applyApiHeaders, enforceRateLimit, readJson, send } from './api-helpers.mjs';
import { AuthenticationError } from './session.mjs';

export function createVersionedResourceApiHandler({
  basePath,
  repository,
  identity,
  rateLimiter,
  resourceField,
  resultField,
  conflictResponseField,
  validateResource,
  validateResourceOperation,
  messages,
}) {
  const routePattern = new RegExp(`^${basePath}(?:/([0-9a-f-]+))?$`, 'i');

  return async function handle(request, response) {
    const url = new URL(request.url, 'http://localhost');
    if (!url.pathname.startsWith(basePath)) return false;
    applyApiHeaders(response);

    try {
      const ownerId = identity.resolve(request, response);
      if (enforceRateLimit(request, response, rateLimiter, ownerId)) return true;
      const match = url.pathname.match(routePattern);
      if (!match) return send(response, 404, { error: 'Rota não encontrada.' });
      const id = match[1];

      if (request.method === 'GET' && !id) return send(response, 200, repository.list(ownerId));
      if (request.method === 'GET' && id) {
        const resource = repository.get(ownerId, id);
        return resource
          ? send(response, 200, resource)
          : send(response, 404, { error: messages.notFound });
      }
      if (request.method === 'POST' && !id) {
        const body = await readJson(request);
        const error = validatePayload(
          body,
          false,
          resourceField,
          validateResource,
          messages.invalid,
        );
        if (error) return send(response, 400, { error });
        const operationalError = validateResourceOperation?.(body[resourceField]);
        return operationalError
          ? send(response, 422, operationalError)
          : send(response, 201, repository.create(ownerId, body.name.trim(), body[resourceField]));
      }
      if (request.method === 'PUT' && id) {
        const body = await readJson(request);
        const error = validatePayload(
          body,
          true,
          resourceField,
          validateResource,
          messages.invalid,
        );
        if (error) return send(response, 400, { error });
        const operationalError = validateResourceOperation?.(body[resourceField]);
        if (operationalError) return send(response, 422, operationalError);
        const result = repository.update(
          ownerId,
          id,
          body.revision,
          body.name.trim(),
          body[resourceField],
        );
        if (result.kind === 'not-found') {
          return send(response, 404, { error: messages.notFound });
        }
        if (result.kind === 'conflict') {
          return send(response, 409, {
            error: messages.conflict,
            [conflictResponseField]: result[resultField],
          });
        }
        return send(response, 200, result[resultField]);
      }
      if (request.method === 'DELETE' && id) {
        return repository.delete(ownerId, id)
          ? send(response, 204)
          : send(response, 404, { error: messages.notFound });
      }
      return send(response, 405, { error: 'Método não permitido.' });
    } catch (error) {
      if (error instanceof AuthenticationError) {
        return send(response, 401, { error: 'Autenticação necessária.' });
      }
      if (error?.code === 'BODY_TOO_LARGE') {
        return send(response, 413, { error: 'Documento excede 2 MB.' });
      }
      if (error instanceof SyntaxError) return send(response, 400, { error: 'JSON inválido.' });
      console.error(messages.logPrefix, error instanceof Error ? error.message : error);
      return send(response, 500, { error: messages.internal });
    }
  };
}

function validatePayload(body, needsRevision, resourceField, validateResource, invalidMessage) {
  if (!body || typeof body !== 'object') return 'Corpo inválido.';
  if (
    typeof body.name !== 'string' ||
    body.name.trim().length < 1 ||
    body.name.trim().length > 120
  ) {
    return 'O nome deve ter entre 1 e 120 caracteres.';
  }
  if (!validateResource(body[resourceField])) return invalidMessage;
  if (needsRevision && (!Number.isSafeInteger(body.revision) || body.revision < 1)) {
    return 'Revisão inválida.';
  }
  return null;
}
