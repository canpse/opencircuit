import type { StoredCircuit } from '../../state/circuitApi';
import type { StoredLibraryComponent } from '../../state/libraryApi';
import type { RemoteSyncState } from './workspaceTypes';

export type CircuitConflict = { documentId: string; remote: StoredCircuit };
export type LibraryConflict = { documentId: string; remote: StoredLibraryComponent };

export type WorkspaceSyncModel = {
  states: ReadonlyMap<string, RemoteSyncState>;
  conflict: CircuitConflict | null;
  libraryConflict: LibraryConflict | null;
};

export type WorkspaceSyncEvent =
  | { type: 'status'; documentId: string; status: RemoteSyncState }
  | { type: 'circuit-conflict'; conflict: CircuitConflict }
  | { type: 'library-conflict'; conflict: LibraryConflict }
  | { type: 'resolve-circuit-conflict' }
  | { type: 'resolve-library-conflict' }
  | { type: 'close-circuit-conflict' }
  | { type: 'close-library-conflict' };

export const INITIAL_WORKSPACE_SYNC_MODEL: WorkspaceSyncModel = {
  states: new Map(),
  conflict: null,
  libraryConflict: null,
};

export function workspaceSyncReducer(
  current: WorkspaceSyncModel,
  event: WorkspaceSyncEvent,
): WorkspaceSyncModel {
  if (event.type === 'status') {
    return {
      ...current,
      states: new Map(current.states).set(event.documentId, event.status),
    };
  }
  if (event.type === 'circuit-conflict') {
    return {
      ...current,
      states: new Map(current.states).set(event.conflict.documentId, 'conflict'),
      conflict: event.conflict,
    };
  }
  if (event.type === 'library-conflict') {
    return {
      ...current,
      states: new Map(current.states).set(event.conflict.documentId, 'conflict'),
      libraryConflict: event.conflict,
    };
  }
  if (event.type === 'resolve-circuit-conflict') {
    if (!current.conflict) return current;
    return {
      ...current,
      states: new Map(current.states).set(current.conflict.documentId, 'saved'),
      conflict: null,
    };
  }
  if (event.type === 'resolve-library-conflict') {
    if (!current.libraryConflict) return current;
    return {
      ...current,
      states: new Map(current.states).set(current.libraryConflict.documentId, 'saved'),
      libraryConflict: null,
    };
  }
  if (event.type === 'close-circuit-conflict') return { ...current, conflict: null };
  return { ...current, libraryConflict: null };
}
