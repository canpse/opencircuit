import type { IncomingMessage, ServerResponse } from 'node:http';
import type { CircuitDocument, LogicComponent, Wire } from '../src/core/types.js';

export type HttpRequest = IncomingMessage;
export type HttpResponse = ServerResponse<IncomingMessage>;
export type ApiHandler = (
  request: HttpRequest,
  response: HttpResponse,
) => boolean | Promise<boolean>;

export interface Identity {
  resolve(request: HttpRequest, response: HttpResponse): string;
}

export interface RateLimitResult {
  allowed: boolean;
  retryAfterSeconds: number;
}

export interface RateLimiter {
  check(key: string): RateLimitResult;
}

export interface ResourceSummary {
  id: string;
  name: string;
  revision: number;
  createdAt: string;
  updatedAt: string;
}

export interface StoredResource extends ResourceSummary {
  ownerId: string;
}

export interface StoredCircuit extends StoredResource {
  circuit: CircuitDocument;
}

export interface LibraryComponentDefinition {
  components: LogicComponent[];
  wires: Wire[];
}

export interface StoredLibraryEntry extends StoredResource {
  definition: LibraryComponentDefinition;
}

export type RepositoryUpdateResult<Resource extends StoredResource> =
  | { kind: 'not-found' }
  | { kind: 'conflict'; resource: Resource | null }
  | { kind: 'updated'; resource: Resource };

export interface VersionedRepository<Value, Resource extends StoredResource> {
  list(ownerId: string): ResourceSummary[];
  get(ownerId: string, id: string): Resource | null;
  create(ownerId: string, name: string, value: Value): Resource;
  update(
    ownerId: string,
    id: string,
    revision: number,
    name: string,
    value: Value,
  ): RepositoryUpdateResult<Resource>;
  delete(ownerId: string, id: string): boolean;
  close(): void;
}

export interface OperationalError {
  error: string;
  [key: string]: unknown;
}

export interface ApiMessages {
  notFound: string;
  invalid: string;
  conflict: string;
  internal: string;
  logPrefix: string;
}

export interface VersionedResourceApiOptions<Value, Resource extends StoredResource> {
  basePath: string;
  repository: VersionedRepository<Value, Resource>;
  identity: Identity;
  rateLimiter: RateLimiter;
  resourceField: string;
  conflictResponseField: string;
  validateResource: (value: unknown) => value is Value;
  validateResourceOperation?: (value: Value) => OperationalError | null;
  messages: ApiMessages;
}

export interface RepositoryOptions {
  table: string;
  jsonColumn: string;
  valueField: string;
  migrationNamespace: string;
  indexName?: string;
}

export interface RateLimiterOptions {
  limit?: number;
  windowMs?: number;
  now?: () => number;
}
