import { isCircuitDocument } from './circuit-validator.mjs';

const MAX_BODY_BYTES = 2 * 1024 * 1024;
const OWNER_PATTERN = /^[a-zA-Z0-9][a-zA-Z0-9._:-]{2,127}$/;

export function createApiHandler(repository) {
  return async function handle(request, response) {
    const url = new URL(request.url, 'http://localhost');
    if (!url.pathname.startsWith('/api/circuits')) return false;
    response.setHeader('Content-Type', 'application/json; charset=utf-8');
    response.setHeader('Cache-Control', 'no-store');

    try {
      const ownerId = request.headers['x-opencircuit-user'];
      if (typeof ownerId !== 'string' || !OWNER_PATTERN.test(ownerId))
        return send(response, 401, { error: 'Identidade de usuário ausente ou inválida.' });
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

async function readJson(request) {
  const chunks = [];
  let size = 0;
  for await (const chunk of request) {
    size += chunk.length;
    if (size > MAX_BODY_BYTES) {
      const error = new Error('too large');
      error.code = 'BODY_TOO_LARGE';
      throw error;
    }
    chunks.push(chunk);
  }
  return JSON.parse(Buffer.concat(chunks).toString('utf8'));
}

function send(response, status, value) {
  response.statusCode = status;
  response.end(status === 204 ? undefined : JSON.stringify(value));
  return true;
}
