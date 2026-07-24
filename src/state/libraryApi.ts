import type { LogicComponent, Wire } from '../core/types';

export type LibraryComponentDefinition = {
  components: LogicComponent[];
  wires: Wire[];
};

export type StoredLibraryComponentSummary = {
  id: string;
  name: string;
  revision: number;
  createdAt: string;
  updatedAt: string;
};

export type StoredLibraryComponent = StoredLibraryComponentSummary & {
  ownerId: string;
  definition: LibraryComponentDefinition;
};

export class LibraryApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly remote?: StoredLibraryComponent,
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
    throw new LibraryApiError('Servidor indisponível. O rascunho local foi preservado.', 0);
  }

  if (!response.ok) {
    const payload = (await response.json().catch(() => null)) as {
      error?: string;
      definition?: StoredLibraryComponent;
    } | null;
    throw new LibraryApiError(
      payload?.error ?? 'Falha ao acessar o servidor.',
      response.status,
      payload?.definition,
    );
  }
  return response.status === 204 ? (undefined as T) : ((await response.json()) as T);
}

export const libraryApi = {
  list: () => request<StoredLibraryComponentSummary[]>('/api/library'),
  get: (id: string) => request<StoredLibraryComponent>(`/api/library/${encodeURIComponent(id)}`),
  create: (name: string, definition: LibraryComponentDefinition) =>
    request<StoredLibraryComponent>('/api/library', {
      method: 'POST',
      body: JSON.stringify({ name, definition }),
    }),
  update: (id: string, name: string, definition: LibraryComponentDefinition, revision: number) =>
    request<StoredLibraryComponent>(`/api/library/${encodeURIComponent(id)}`, {
      method: 'PUT',
      body: JSON.stringify({ name, definition, revision }),
    }),
  delete: (id: string) =>
    request<void>(`/api/library/${encodeURIComponent(id)}`, { method: 'DELETE' }),
};
