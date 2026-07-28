import documentLimits from '../src/core/document-limits.json' with { type: 'json' };

export const MAX_BODY_BYTES = documentLimits.maxBodyBytes;
export function applySecurityHeaders(response) {
  response.setHeader('X-Content-Type-Options', 'nosniff');
  response.setHeader('Referrer-Policy', 'no-referrer');
  response.setHeader('X-Frame-Options', 'DENY');
  response.setHeader('Cross-Origin-Resource-Policy', 'same-origin');
  response.setHeader(
    'Content-Security-Policy',
    "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; worker-src 'self' blob:; connect-src 'self'; object-src 'none'; base-uri 'self'; frame-ancestors 'none'",
  );
}

export function applyApiHeaders(response) {
  applySecurityHeaders(response);
  response.setHeader('Content-Type', 'application/json; charset=utf-8');
  response.setHeader('Cache-Control', 'no-store');
}

export function enforceRateLimit(request, response, rateLimiter, ownerId) {
  const result = rateLimiter.check(request.socket?.remoteAddress ?? ownerId);
  if (result.allowed) return false;
  response.setHeader('Retry-After', String(result.retryAfterSeconds));
  send(response, 429, { error: 'Muitas requisições. Tente novamente em instantes.' });
  return true;
}

export async function readJson(request) {
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

export function send(response, status, value) {
  response.statusCode = status;
  response.end(status === 204 ? undefined : JSON.stringify(value));
  return true;
}
