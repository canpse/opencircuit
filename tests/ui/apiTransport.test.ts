import assert from 'node:assert/strict';
import { afterEach, test, vi } from 'vitest';
import { ApiTransportError, requestJson } from '../../src/state/apiTransport';

class TestApiError extends ApiTransportError<{ revision: number }> {}

afterEach(() => {
  vi.unstubAllGlobals();
});

test('transporte usa a sessão same-origin e devolve JSON de sucesso', async () => {
  const fetchMock = vi.fn<typeof fetch>(async () => {
    return new Response(JSON.stringify({ ok: true }), { status: 200 });
  });
  vi.stubGlobal('fetch', fetchMock);

  const result = await requestJson<{ ok: boolean }, { revision: number }, TestApiError>(
    '/api/test',
    undefined,
    TestApiError,
    'conflict',
  );

  assert.deepEqual(result, { ok: true });
  assert.equal(fetchMock.mock.calls[0][1]?.credentials, 'same-origin');
  assert.equal(
    (fetchMock.mock.calls[0][1]?.headers as Record<string, string>)['X-OpenCircuit-User'],
    undefined,
  );
});

test('transporte preserva payload de conflito tipado', async () => {
  vi.stubGlobal(
    'fetch',
    vi.fn(
      async () =>
        new Response(JSON.stringify({ error: 'Conflito', conflict: { revision: 3 } }), {
          status: 409,
        }),
    ),
  );

  await assert.rejects(
    requestJson<never, { revision: number }, TestApiError>(
      '/api/test',
      undefined,
      TestApiError,
      'conflict',
    ),
    (error: unknown) =>
      error instanceof TestApiError &&
      error.status === 409 &&
      error.conflict?.revision === 3 &&
      error.message === 'Conflito',
  );
});

test('transporte trata rede indisponível, erro sem JSON e resposta 204', async () => {
  vi.stubGlobal(
    'fetch',
    vi.fn(async () => Promise.reject(new Error('offline'))),
  );
  await assert.rejects(
    requestJson('/api/test', undefined, TestApiError, 'conflict'),
    (error: unknown) => error instanceof TestApiError && error.status === 0,
  );

  vi.stubGlobal(
    'fetch',
    vi.fn(async () => new Response('oops', { status: 500 })),
  );
  await assert.rejects(
    requestJson('/api/test', undefined, TestApiError, 'conflict'),
    (error: unknown) =>
      error instanceof TestApiError &&
      error.status === 500 &&
      error.message === 'Falha ao acessar o servidor.',
  );

  vi.stubGlobal(
    'fetch',
    vi.fn(async () => new Response(null, { status: 204 })),
  );
  assert.equal(
    await requestJson<void, { revision: number }, TestApiError>(
      '/api/test',
      undefined,
      TestApiError,
      'conflict',
    ),
    undefined,
  );
});
