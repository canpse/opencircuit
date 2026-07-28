import { applyApiHeaders, send } from './api-helpers.mjs';
import { AuthenticationError } from './session.mjs';

export function createSessionApiHandler(identity, rateLimiter) {
  return function handle(request, response) {
    const url = new URL(request.url, 'http://localhost');
    if (url.pathname !== '/api/session') return false;
    applyApiHeaders(response);
    if (request.method !== 'GET') return send(response, 405, { error: 'Método não permitido.' });

    let ownerId;
    try {
      ownerId = identity.resolve(request, response);
    } catch (error) {
      if (error instanceof AuthenticationError)
        return send(response, 401, { error: 'Autenticação necessária.' });
      throw error;
    }
    const limit = rateLimiter.check(request.socket?.remoteAddress ?? ownerId);
    if (!limit.allowed) {
      response.setHeader('Retry-After', String(limit.retryAfterSeconds));
      return send(response, 429, { error: 'Muitas requisições. Tente novamente em instantes.' });
    }
    return send(response, 200, { ownerId });
  };
}
