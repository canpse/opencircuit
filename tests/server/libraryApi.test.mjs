import { afterEach, beforeEach, describe, expect, test } from 'vitest';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { LibraryRepository } from '../../server/library-repository.mjs';
import { createLibraryApiHandler } from '../../server/library-api.mjs';
import { createRateLimiter } from '../../server/rate-limiter.mjs';
import { createSessionIdentity } from '../../server/session.mjs';
import { createApiTestClient } from './api-test-client.mjs';

const emptyDefinition = { components: [], wires: [] };

describe('API da biblioteca', () => {
  let directory;
  let repository;
  let api;
  let userA;
  let userB;

  beforeEach(() => {
    directory = mkdtempSync(join(tmpdir(), 'opencircuit-library-api-'));
    repository = new LibraryRepository(join(directory, 'test.sqlite'));
    const identity = createSessionIdentity('test-secret-that-is-long-enough-for-hmac');
    api = createLibraryApiHandler(repository, identity, createRateLimiter({ limit: 10_000 }));
    userA = createApiTestClient(api, '192.0.2.1');
    userB = createApiTestClient(api, '192.0.2.2');
  });

  afterEach(() => {
    repository.close();
    rmSync(directory, { recursive: true });
  });

  test('CRUD fica isolado por proprietário', async () => {
    const createdResponse = await userA.call('/api/library', {
      method: 'POST',
      body: JSON.stringify({ name: 'Meio Somador', definition: emptyDefinition }),
    });
    expect(createdResponse.status).toBe(201);
    const created = await createdResponse.json();

    expect(await (await userA.call('/api/library')).json()).toHaveLength(1);
    expect(await (await userB.call('/api/library')).json()).toHaveLength(0);
    expect((await userB.call(`/api/library/${created.id}`)).status).toBe(404);
    expect((await userB.call(`/api/library/${created.id}`, { method: 'DELETE' })).status).toBe(404);
    expect((await userA.call(`/api/library/${created.id}`, { method: 'DELETE' })).status).toBe(204);
  });

  test('revisão antiga produz conflito sem sobrescrever', async () => {
    const created = await (
      await userA.call('/api/library', {
        method: 'POST',
        body: JSON.stringify({ name: 'Original', definition: emptyDefinition }),
      })
    ).json();
    const first = await userA.call(`/api/library/${created.id}`, {
      method: 'PUT',
      body: JSON.stringify({ name: 'Primeira', definition: emptyDefinition, revision: 1 }),
    });
    expect(first.status).toBe(200);
    expect((await first.json()).revision).toBe(2);

    const conflict = await userA.call(`/api/library/${created.id}`, {
      method: 'PUT',
      body: JSON.stringify({ name: 'Obsoleta', definition: emptyDefinition, revision: 1 }),
    });
    expect(conflict.status).toBe(409);
    expect((await conflict.json()).definition.name).toBe('Primeira');
  });

  test('rejeita nome e definição inválidos', async () => {
    expect(
      (
        await userA.call('/api/library', {
          method: 'POST',
          body: JSON.stringify({ name: '', definition: emptyDefinition }),
        })
      ).status,
    ).toBe(400);
    expect(
      (
        await userA.call('/api/library', {
          method: 'POST',
          body: JSON.stringify({ name: 'Inválido', definition: { components: 'nope', wires: [] } }),
        })
      ).status,
    ).toBe(400);
  });
});
