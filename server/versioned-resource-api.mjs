import { applyApiHeaders, enforceRateLimit, readJson, send } from './api-helpers.mjs';
import { AuthenticationError } from './session.mjs';

/**
 * @typedef {import('./contracts.mjs').ApiHandler} ApiHandler
 * @typedef {import('./contracts.mjs').HttpRequest} HttpRequest
 * @typedef {import('./contracts.mjs').HttpResponse} HttpResponse
 * @typedef {import('./contracts.mjs').StoredResource} StoredResource
 */

/** @param {unknown} error @param {string} code */
function errorHasCode(error, code) {
  return typeof error === 'object' && error !== null && 'code' in error && error.code === code;
}

/** @param {unknown} value @returns {value is Record<string, unknown>} */
function isRecord(value) {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/**
 * @template Value
 * @template {StoredResource} Resource
 * @param {import('./contracts.mjs').VersionedResourceApiOptions<Value, Resource>} options
 * @returns {ApiHandler}
 */
export function createVersionedResourceApiHandler({
  basePath,
  repository,
  identity,
  rateLimiter,
  resourceField,
  conflictResponseField,
  validateResource,
  validateResourceOperation,
  messages,
}) {
  const routePattern = new RegExp(`^${basePath}(?:/([0-9a-f-]+))?$`, 'i');

  /** @param {HttpRequest} request @param {HttpResponse} response */
  return async function handle(request, response) {
    const url = new URL(request.url ?? '/', 'http://localhost');
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
        const payload = validatePayload(
          body,
          false,
          resourceField,
          validateResource,
          messages.invalid,
        );
        if (!payload.ok) return send(response, 400, { error: payload.error });
        const operationalError = validateResourceOperation?.(payload.value);
        return operationalError
          ? send(response, 422, operationalError)
          : send(response, 201, repository.create(ownerId, payload.name, payload.value));
      }
      if (request.method === 'PUT' && id) {
        const body = await readJson(request);
        const payload = validatePayload(
          body,
          true,
          resourceField,
          validateResource,
          messages.invalid,
        );
        if (!payload.ok) return send(response, 400, { error: payload.error });
        const operationalError = validateResourceOperation?.(payload.value);
        if (operationalError) return send(response, 422, operationalError);
        const result = repository.update(
          ownerId,
          id,
          payload.revision,
          payload.name,
          payload.value,
        );
        if (result.kind === 'not-found') {
          return send(response, 404, { error: messages.notFound });
        }
        if (result.kind === 'conflict') {
          return send(response, 409, {
            error: messages.conflict,
            [conflictResponseField]: result.resource,
          });
        }
        return send(response, 200, result.resource);
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
      if (errorHasCode(error, 'BODY_TOO_LARGE')) {
        return send(response, 413, { error: 'Documento excede 2 MB.' });
      }
      if (error instanceof SyntaxError) return send(response, 400, { error: 'JSON inválido.' });
      console.error(messages.logPrefix, error instanceof Error ? error.message : error);
      return send(response, 500, { error: messages.internal });
    }
  };
}

/**
 * @template Value
 * @param {unknown} body
 * @param {boolean} needsRevision
 * @param {string} resourceField
 * @param {(value: unknown) => value is Value} validateResource
 * @param {string} invalidMessage
 * @returns {{ok: false, error: string} | {ok: true, name: string, revision: number, value: Value}}
 */
function validatePayload(body, needsRevision, resourceField, validateResource, invalidMessage) {
  if (!isRecord(body)) return { ok: false, error: 'Corpo inválido.' };
  if (
    !('name' in body) ||
    typeof body.name !== 'string' ||
    body.name.trim().length < 1 ||
    body.name.trim().length > 120
  ) {
    return { ok: false, error: 'O nome deve ter entre 1 e 120 caracteres.' };
  }
  const value = resourceField in body ? body[resourceField] : undefined;
  if (!validateResource(value)) return { ok: false, error: invalidMessage };
  const revision = 'revision' in body ? body.revision : 0;
  if (needsRevision && (!Number.isSafeInteger(revision) || Number(revision) < 1)) {
    return { ok: false, error: 'Revisão inválida.' };
  }
  return {
    ok: true,
    name: body.name.trim(),
    revision: needsRevision ? Number(revision) : 0,
    value,
  };
}
