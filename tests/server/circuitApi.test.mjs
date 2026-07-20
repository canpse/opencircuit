import { afterEach, beforeEach, describe, expect, test } from 'vitest';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { Readable } from 'node:stream';
import { CircuitRepository } from '../../server/circuit-repository.mjs';
import { createApiHandler } from '../../server/api.mjs';

const emptyCircuit = { version: 1, components: [], wires: [] };

describe('API de circuitos', () => {
  let directory;
  let repository;
  let api;

  beforeEach(() => {
    directory = mkdtempSync(join(tmpdir(), 'opencircuit-api-'));
    repository = new CircuitRepository(join(directory, 'test.sqlite'));
    api = createApiHandler(repository);
  });

  afterEach(() => {
    repository.close();
    rmSync(directory, { recursive: true });
  });

  async function call(path, owner, init = {}) {
    const request = Readable.from(init.body ? [Buffer.from(init.body)] : []);
    request.url = path;
    request.method = init.method ?? 'GET';
    request.headers = owner ? { 'x-opencircuit-user': owner } : {};
    let responseBody = '';
    const response = {
      statusCode: 200,
      setHeader() {},
      end(value) {
        responseBody = value?.toString() ?? '';
      },
    };
    await api(request, response);
    return {
      status: response.statusCode,
      json: async () => JSON.parse(responseBody),
    };
  }

  test('CRUD fica isolado por proprietário', async () => {
    const createdResponse = await call('/api/circuits', 'user-a', {
      method: 'POST',
      body: JSON.stringify({ name: 'Somador', circuit: emptyCircuit }),
    });
    expect(createdResponse.status).toBe(201);
    const created = await createdResponse.json();

    expect(await (await call('/api/circuits', 'user-a')).json()).toHaveLength(1);
    expect(await (await call('/api/circuits', 'user-b')).json()).toHaveLength(0);
    expect((await call(`/api/circuits/${created.id}`, 'user-b')).status).toBe(404);
    expect((await call(`/api/circuits/${created.id}`, 'user-b', { method: 'DELETE' })).status).toBe(
      404,
    );
    expect((await call(`/api/circuits/${created.id}`, 'user-a', { method: 'DELETE' })).status).toBe(
      204,
    );
  });

  test('revisão antiga produz conflito sem sobrescrever', async () => {
    const created = await (
      await call('/api/circuits', 'user-a', {
        method: 'POST',
        body: JSON.stringify({ name: 'Original', circuit: emptyCircuit }),
      })
    ).json();
    const first = await call(`/api/circuits/${created.id}`, 'user-a', {
      method: 'PUT',
      body: JSON.stringify({ name: 'Primeira', circuit: emptyCircuit, revision: 1 }),
    });
    expect(first.status).toBe(200);
    expect((await first.json()).revision).toBe(2);

    const conflict = await call(`/api/circuits/${created.id}`, 'user-a', {
      method: 'PUT',
      body: JSON.stringify({ name: 'Obsoleta', circuit: emptyCircuit, revision: 1 }),
    });
    expect(conflict.status).toBe(409);
    expect((await conflict.json()).circuit.name).toBe('Primeira');
  });

  test('rejeita identidade, nome e CircuitDocument inválidos', async () => {
    expect((await call('/api/circuits')).status).toBe(401);
    expect(
      (
        await call('/api/circuits', 'user-a', {
          method: 'POST',
          body: JSON.stringify({ name: '', circuit: emptyCircuit }),
        })
      ).status,
    ).toBe(400);
    expect(
      (
        await call('/api/circuits', 'user-a', {
          method: 'POST',
          body: JSON.stringify({ name: 'Inválido', circuit: { version: 2 } }),
        })
      ).status,
    ).toBe(400);
  });

  test('migração é idempotente', () => {
    repository.migrate();
    repository.migrate();
    expect(repository.db.prepare('SELECT version FROM schema_migrations').all()).toEqual([
      { version: 1 },
    ]);
  });
});
