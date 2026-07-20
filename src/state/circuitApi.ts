import type { CircuitDocument } from '../core/types';

export type StoredCircuitSummary = {
  id: string;
  name: string;
  revision: number;
  createdAt: string;
  updatedAt: string;
};

export type StoredCircuit = StoredCircuitSummary & {
  ownerId: string;
  circuit: CircuitDocument;
};

export class CircuitApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly remote?: StoredCircuit,
  ) {
    super(message);
  }
}

const USER_STORAGE_KEY = 'opencircuit.local-user.v1';

function getLocalUserId(): string {
  try {
    const current = localStorage.getItem(USER_STORAGE_KEY);
    if (current) return current;
    const created = `local-${crypto.randomUUID()}`;
    localStorage.setItem(USER_STORAGE_KEY, created);
    return created;
  } catch {
    return 'local-memory-user';
  }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  let response: Response;
  try {
    response = await fetch(path, {
      ...init,
      headers: {
        'Content-Type': 'application/json',
        'X-OpenCircuit-User': getLocalUserId(),
        ...init?.headers,
      },
    });
  } catch {
    throw new CircuitApiError('Servidor indisponível. O rascunho local foi preservado.', 0);
  }

  if (!response.ok) {
    const payload = (await response.json().catch(() => null)) as {
      error?: string;
      circuit?: StoredCircuit;
    } | null;
    throw new CircuitApiError(
      payload?.error ?? 'Falha ao acessar o servidor.',
      response.status,
      payload?.circuit,
    );
  }
  return response.status === 204 ? (undefined as T) : ((await response.json()) as T);
}

export const circuitApi = {
  list: () => request<StoredCircuitSummary[]>('/api/circuits'),
  get: (id: string) => request<StoredCircuit>(`/api/circuits/${encodeURIComponent(id)}`),
  create: (name: string, circuit: CircuitDocument) =>
    request<StoredCircuit>('/api/circuits', {
      method: 'POST',
      body: JSON.stringify({ name, circuit }),
    }),
  update: (id: string, name: string, circuit: CircuitDocument, revision: number) =>
    request<StoredCircuit>(`/api/circuits/${encodeURIComponent(id)}`, {
      method: 'PUT',
      body: JSON.stringify({ name, circuit, revision }),
    }),
  delete: (id: string) =>
    request<void>(`/api/circuits/${encodeURIComponent(id)}`, { method: 'DELETE' }),
};
