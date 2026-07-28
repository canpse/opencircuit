import type { CircuitDocument } from '../core/types';
import { ApiTransportError, requestJson } from './apiTransport';

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

export class CircuitApiError extends ApiTransportError<StoredCircuit> {
  get remote() {
    return this.conflict;
  }
}

const request = <T>(path: string, init?: RequestInit) =>
  requestJson<T, StoredCircuit, CircuitApiError>(path, init, CircuitApiError, 'circuit');

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
