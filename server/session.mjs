import { createHmac, randomBytes, randomUUID, timingSafeEqual } from 'node:crypto';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';

export const SESSION_COOKIE_NAME = 'opencircuit_session';
const SESSION_VERSION = 'v1';
const ONE_YEAR_SECONDS = 365 * 24 * 60 * 60;

export class AuthenticationError extends Error {}

export function loadOrCreateSessionSecret(filename) {
  try {
    const existing = readFileSync(filename, 'utf8').trim();
    if (existing.length >= 32) return existing;
  } catch (error) {
    if (error?.code !== 'ENOENT') throw error;
  }

  mkdirSync(dirname(filename), { recursive: true });
  const created = randomBytes(48).toString('base64url');
  try {
    writeFileSync(filename, created, { encoding: 'utf8', flag: 'wx', mode: 0o600 });
    return created;
  } catch (error) {
    if (error?.code !== 'EEXIST') throw error;
    return readFileSync(filename, 'utf8').trim();
  }
}

export function createSessionIdentity(secret, { secure = false } = {}) {
  if (typeof secret !== 'string' || secret.length < 32) {
    throw new Error('O segredo de sessão precisa ter ao menos 32 caracteres.');
  }

  return {
    resolve(request, response) {
      const current = parseCookie(request.headers?.cookie)?.[SESSION_COOKIE_NAME];
      const verified = current ? verifySession(current, secret) : null;
      if (verified) return verified;

      const ownerId = `user-${randomUUID()}`;
      response.setHeader(
        'Set-Cookie',
        serializeSessionCookie(signSession(ownerId, secret), secure),
      );
      return ownerId;
    },
  };
}

export function createTrustedProxyIdentity(secret, { headerName = 'x-authenticated-user' } = {}) {
  if (typeof secret !== 'string' || secret.length < 32) {
    throw new Error('O segredo de identidade precisa ter ao menos 32 caracteres.');
  }
  const normalizedHeader = headerName.toLowerCase();
  return {
    resolve(request) {
      const externalId = request.headers?.[normalizedHeader];
      if (typeof externalId !== 'string' || externalId.length < 1 || externalId.length > 512) {
        throw new AuthenticationError('Identidade autenticada ausente.');
      }
      const digest = createHmac('sha256', secret).update(externalId).digest('hex');
      return `account-${digest.slice(0, 48)}`;
    },
  };
}

function signSession(ownerId, secret) {
  const payload = `${SESSION_VERSION}.${ownerId}`;
  const signature = createHmac('sha256', secret).update(payload).digest('base64url');
  return `${payload}.${signature}`;
}

function verifySession(value, secret) {
  const match = value.match(/^(v1)\.(user-[0-9a-f-]{36})\.([A-Za-z0-9_-]+)$/i);
  if (!match) return null;
  const payload = `${match[1]}.${match[2]}`;
  const expected = createHmac('sha256', secret).update(payload).digest();
  let received;
  try {
    received = Buffer.from(match[3], 'base64url');
  } catch {
    return null;
  }
  return received.length === expected.length && timingSafeEqual(received, expected)
    ? match[2]
    : null;
}

function parseCookie(header) {
  if (typeof header !== 'string') return {};
  return Object.fromEntries(
    header.split(';').flatMap((part) => {
      const separator = part.indexOf('=');
      if (separator < 1) return [];
      return [[part.slice(0, separator).trim(), part.slice(separator + 1).trim()]];
    }),
  );
}

function serializeSessionCookie(value, secure) {
  return [
    `${SESSION_COOKIE_NAME}=${value}`,
    'Path=/',
    'HttpOnly',
    'SameSite=Lax',
    `Max-Age=${ONE_YEAR_SECONDS}`,
    ...(secure ? ['Secure'] : []),
  ].join('; ');
}
