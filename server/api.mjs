import { isCircuitDocument } from './circuit-validator.mjs';
import { applyApiHeaders, enforceRateLimit, readJson, send } from './api-helpers.mjs';
import { AuthenticationError } from './session.mjs';

export function createApiHandler(repository, identity, rateLimiter) {
  return async function handle(request, response) {
    const url = new URL(request.url, 'http://localhost');
    if (!url.pathname.startsWith('/api/circuits')) return false;
    applyApiHeaders(response);

    try {
      const ownerId = identity.resolve(request, response);
      if (enforceRateLimit(request, response, rateLimiter, ownerId)) return true;
      const match = url.pathname.match(/^\/api\/circuits(?:\/([0-9a-f-]+))?$/i);
      if (!match) return send(response, 404, { error: 'Rota não encontrada.' });
      const id = match[1];

      if (request.method === 'GET' && !id) return send(response, 200, repository.list(ownerId));
      if (request.method === 'GET' && id) {
        const circuit = repository.get(ownerId, id);
        return circuit
          ? send(response, 200, circuit)
          : send(response, 404, { error: 'Circuito não encontrado.' });
      }
      if (request.method === 'POST' && !id) {
        const body = await readJson(request);
        const error = validatePayload(body, false);
        return error
          ? send(response, 400, { error })
          : send(response, 201, repository.create(ownerId, body.name.trim(), body.circuit));
      }
      if (request.method === 'PUT' && id) {
        const body = await readJson(request);
        const error = validatePayload(body, true);
        if (error) return send(response, 400, { error });
        const result = repository.update(
          ownerId,
          id,
          body.revision,
          body.name.trim(),
          body.circuit,
        );
        if (result.kind === 'not-found')
          return send(response, 404, { error: 'Circuito não encontrado.' });
        if (result.kind === 'conflict')
          return send(response, 409, {
            error: 'O circuito foi alterado em outra aba.',
            circuit: result.circuit,
          });
        return send(response, 200, result.circuit);
      }
      if (request.method === 'DELETE' && id)
        return repository.delete(ownerId, id)
          ? send(response, 204)
          : send(response, 404, { error: 'Circuito não encontrado.' });
      return send(response, 405, { error: 'Método não permitido.' });
    } catch (error) {
      if (error instanceof AuthenticationError)
        return send(response, 401, { error: 'Autenticação necessária.' });
      if (error?.code === 'BODY_TOO_LARGE')
        return send(response, 413, { error: 'Documento excede 2 MB.' });
      if (error instanceof SyntaxError) return send(response, 400, { error: 'JSON inválido.' });
      console.error('Circuit API error:', error instanceof Error ? error.message : error);
      return send(response, 500, { error: 'Erro interno ao persistir circuito.' });
    }
  };
}

function validatePayload(body, needsRevision) {
  if (!body || typeof body !== 'object') return 'Corpo inválido.';
  if (typeof body.name !== 'string' || body.name.trim().length < 1 || body.name.trim().length > 120)
    return 'O nome deve ter entre 1 e 120 caracteres.';
  if (!isCircuitDocument(body.circuit)) return 'CircuitDocument inválido.';
  if (needsRevision && (!Number.isSafeInteger(body.revision) || body.revision < 1))
    return 'Revisão inválida.';
  return null;
}
