import { describe, expect, test } from 'vitest';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createRateLimiter } from '../../server/rate-limiter.mjs';
import { createSessionApiHandler } from '../../server/session-api.mjs';
import {
  createSessionIdentity,
  createTrustedProxyIdentity,
  loadOrCreateSessionSecret,
  SESSION_COOKIE_NAME,
} from '../../server/session.mjs';
import { createApiTestClient } from './api-test-client.mjs';

const SECRET = 'test-secret-that-is-long-enough-for-hmac';

function resolve(identity, cookie = '') {
  const headers = new Map();
  const ownerId = identity.resolve(
    { headers: cookie ? { cookie } : {} },
    { setHeader: (name, value) => headers.set(name.toLowerCase(), value) },
  );
  return { ownerId, headers };
}

describe('sessão autenticada', () => {
  test('emite cookie HttpOnly e recupera a mesma identidade assinada', () => {
    const identity = createSessionIdentity(SECRET);
    const first = resolve(identity);
    const setCookie = first.headers.get('set-cookie');
    expect(setCookie).toContain(`${SESSION_COOKIE_NAME}=`);
    expect(setCookie).toContain('HttpOnly');
    expect(setCookie).toContain('SameSite=Lax');

    const cookie = setCookie.split(';', 1)[0];
    const second = resolve(identity, cookie);
    expect(second.ownerId).toBe(first.ownerId);
    expect(second.headers.has('set-cookie')).toBe(false);
  });

  test('cookie adulterado não permite escolher a identidade', () => {
    const identity = createSessionIdentity(SECRET);
    const first = resolve(identity);
    const signedCookie = first.headers.get('set-cookie').split(';', 1)[0];
    const forged = signedCookie.replace(/.$/, signedCookie.endsWith('A') ? 'B' : 'A');
    const second = resolve(identity, forged);
    expect(second.ownerId).not.toBe(first.ownerId);
    expect(second.headers.has('set-cookie')).toBe(true);
  });

  test('modo trusted proxy deriva owner estável sem expor o id externo', () => {
    const identity = createTrustedProxyIdentity(SECRET);
    const first = identity.resolve({ headers: { 'x-authenticated-user': 'teacher@example.edu' } });
    const second = identity.resolve({ headers: { 'x-authenticated-user': 'teacher@example.edu' } });
    const other = identity.resolve({ headers: { 'x-authenticated-user': 'student@example.edu' } });
    expect(first).toBe(second);
    expect(first).not.toBe(other);
    expect(first).not.toContain('teacher');
    expect(() => identity.resolve({ headers: {} })).toThrow(/ausente/);
  });

  test('segredo gerado em disco é estável entre reinicializações', () => {
    const directory = mkdtempSync(join(tmpdir(), 'opencircuit-session-'));
    try {
      const filename = join(directory, 'session-secret');
      const first = loadOrCreateSessionSecret(filename);
      const second = loadOrCreateSessionSecret(filename);
      expect(first).toBe(second);
      expect(first.length).toBeGreaterThanOrEqual(32);
    } finally {
      rmSync(directory, { recursive: true });
    }
  });
});

test('rate limiter informa quando a janela foi excedida e quando ela reinicia', () => {
  let currentTime = 1_000;
  const limiter = createRateLimiter({ limit: 2, windowMs: 1_000, now: () => currentTime });
  expect(limiter.check('client').allowed).toBe(true);
  expect(limiter.check('client').allowed).toBe(true);
  expect(limiter.check('client')).toEqual({ allowed: false, retryAfterSeconds: 1 });
  currentTime += 1_000;
  expect(limiter.check('client').allowed).toBe(true);
});

test('endpoint de sessão informa o owner atual e exige identidade no modo proxy', async () => {
  const limiter = createRateLimiter({ limit: 10 });
  const sessionHandler = createSessionApiHandler(createSessionIdentity(SECRET), limiter);
  const client = createApiTestClient(sessionHandler, '192.0.2.10');
  const first = await client.call('/api/session');
  const second = await client.call('/api/session');
  expect((await first.json()).ownerId).toBe((await second.json()).ownerId);

  const proxyHandler = createSessionApiHandler(createTrustedProxyIdentity(SECRET), limiter);
  const unauthenticated = createApiTestClient(proxyHandler, '192.0.2.11');
  expect((await unauthenticated.call('/api/session')).status).toBe(401);
});
