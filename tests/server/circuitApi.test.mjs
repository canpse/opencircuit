import { afterEach, beforeEach, describe, expect, test } from 'vitest';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { CircuitRepository } from '../../server/circuit-repository.mjs';
import { createApiHandler } from '../../server/api.mjs';
import { createRateLimiter } from '../../server/rate-limiter.mjs';
import { createSessionIdentity } from '../../server/session.mjs';
import { createApiTestClient } from './api-test-client.mjs';

const emptyCircuit = { version: 1, components: [], wires: [] };

describe('API de circuitos', () => {
  let directory;
  let repository;
  let api;
  let userA;
  let userB;

  beforeEach(() => {
    directory = mkdtempSync(join(tmpdir(), 'opencircuit-api-'));
    repository = new CircuitRepository(join(directory, 'test.sqlite'));
    const identity = createSessionIdentity('test-secret-that-is-long-enough-for-hmac');
    api = createApiHandler(repository, identity, createRateLimiter({ limit: 10_000 }));
    userA = createApiTestClient(api, '192.0.2.1');
    userB = createApiTestClient(api, '192.0.2.2');
  });

  afterEach(() => {
    repository.close();
    rmSync(directory, { recursive: true });
  });

  test('CRUD fica isolado por proprietário', async () => {
    const createdResponse = await userA.call('/api/circuits', {
      method: 'POST',
      body: JSON.stringify({ name: 'Somador', circuit: emptyCircuit }),
    });
    expect(createdResponse.status).toBe(201);
    const created = await createdResponse.json();

    expect(await (await userA.call('/api/circuits')).json()).toHaveLength(1);
    expect(await (await userB.call('/api/circuits')).json()).toHaveLength(0);
    expect((await userB.call(`/api/circuits/${created.id}`)).status).toBe(404);
    expect((await userB.call(`/api/circuits/${created.id}`, { method: 'DELETE' })).status).toBe(
      404,
    );
    expect((await userA.call(`/api/circuits/${created.id}`, { method: 'DELETE' })).status).toBe(
      204,
    );
  });

  test('revisão antiga produz conflito sem sobrescrever', async () => {
    const created = await (
      await userA.call('/api/circuits', {
        method: 'POST',
        body: JSON.stringify({ name: 'Original', circuit: emptyCircuit }),
      })
    ).json();
    const first = await userA.call(`/api/circuits/${created.id}`, {
      method: 'PUT',
      body: JSON.stringify({ name: 'Primeira', circuit: emptyCircuit, revision: 1 }),
    });
    expect(first.status).toBe(200);
    expect((await first.json()).revision).toBe(2);

    const conflict = await userA.call(`/api/circuits/${created.id}`, {
      method: 'PUT',
      body: JSON.stringify({ name: 'Obsoleta', circuit: emptyCircuit, revision: 1 }),
    });
    expect(conflict.status).toBe(409);
    expect((await conflict.json()).circuit.name).toBe('Primeira');
  });

  test('rejeita nome e CircuitDocument inválidos', async () => {
    expect(
      (
        await userA.call('/api/circuits', {
          method: 'POST',
          body: JSON.stringify({ name: '', circuit: emptyCircuit }),
        })
      ).status,
    ).toBe(400);
    expect(
      (
        await userA.call('/api/circuits', {
          method: 'POST',
          body: JSON.stringify({ name: 'Inválido', circuit: { version: 2 } }),
        })
      ).status,
    ).toBe(400);
  });

  test('circuito com instância de subcircuito e definições é aceito (regressão)', async () => {
    const halfAdder = {
      id: 'half-adder-def',
      name: 'Meio Somador',
      components: [
        { id: 'a', type: 'input', x: 0, y: 0 },
        { id: 'b', type: 'input', x: 0, y: 40 },
        { id: 'xor1', type: 'xor', x: 100, y: 0 },
        { id: 'sum-led', type: 'led', x: 200, y: 0 },
      ],
      wires: [
        {
          id: 'w1',
          from: { componentId: 'a', pinId: 'out' },
          to: { componentId: 'xor1', pinId: 'a' },
        },
        {
          id: 'w2',
          from: { componentId: 'b', pinId: 'out' },
          to: { componentId: 'xor1', pinId: 'b' },
        },
        {
          id: 'w3',
          from: { componentId: 'xor1', pinId: 'out' },
          to: { componentId: 'sum-led', pinId: 'in' },
        },
      ],
    };
    const circuitWithSubcircuit = {
      version: 1,
      definitions: [halfAdder],
      components: [{ id: 'u1', type: 'subcircuit', x: 0, y: 0, definitionId: halfAdder.id }],
      wires: [],
    };
    const response = await userA.call('/api/circuits', {
      method: 'POST',
      body: JSON.stringify({ name: 'Com subcircuito', circuit: circuitWithSubcircuit }),
    });
    expect(response.status).toBe(201);
  });

  test('migração é idempotente', () => {
    repository.migrate();
    repository.migrate();
    expect(repository.db.prepare('SELECT version FROM schema_migrations').all()).toEqual([
      { version: 1 },
    ]);
  });
});
