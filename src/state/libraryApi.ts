import type { LogicComponent, Wire } from '../core/types';
import { ApiTransportError, requestJson } from './apiTransport';

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

export class LibraryApiError extends ApiTransportError<StoredLibraryComponent> {
  get remote() {
    return this.conflict;
  }
}

const request = <T>(path: string, init?: RequestInit) =>
  requestJson<T, StoredLibraryComponent, LibraryApiError>(
    path,
    init,
    LibraryApiError,
    'definition',
  );

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
