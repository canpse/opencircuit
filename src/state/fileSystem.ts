import type { CircuitDocument } from '../core/types';

// Tipos da File System Access API que o lib.dom do TypeScript ainda não expõe.
interface FileSystemHandlePermissionDescriptor {
  mode?: 'read' | 'readwrite';
}

interface FilePickerAcceptType {
  description?: string;
  accept: Record<string, string[]>;
}

interface SaveFilePickerOptions {
  suggestedName?: string;
  types?: FilePickerAcceptType[];
}

interface OpenFilePickerOptions {
  multiple?: boolean;
  types?: FilePickerAcceptType[];
}

declare global {
  interface FileSystemFileHandle {
    isSameEntry?(other: FileSystemFileHandle): Promise<boolean>;
    queryPermission?(descriptor?: FileSystemHandlePermissionDescriptor): Promise<PermissionState>;
    requestPermission?(descriptor?: FileSystemHandlePermissionDescriptor): Promise<PermissionState>;
  }
  interface Window {
    showSaveFilePicker?(options?: SaveFilePickerOptions): Promise<FileSystemFileHandle>;
    showOpenFilePicker?(options?: OpenFilePickerOptions): Promise<FileSystemFileHandle[]>;
  }
}

const CIRCUIT_FILE_TYPES: FilePickerAcceptType[] = [
  { description: 'Circuito OpenCircuit', accept: { 'application/json': ['.json'] } },
];

export function supportsFileSystemAccess(): boolean {
  return typeof window !== 'undefined' && typeof window.showSaveFilePicker === 'function';
}

// null = usuário cancelou o picker (AbortError) ou o picker falhou.
export async function pickFileToSave(suggestedName: string): Promise<FileSystemFileHandle | null> {
  try {
    return (
      (await window.showSaveFilePicker?.({ suggestedName, types: CIRCUIT_FILE_TYPES })) ?? null
    );
  } catch {
    return null;
  }
}

// [] = usuário cancelou o picker.
export async function pickFilesToOpen(): Promise<FileSystemFileHandle[]> {
  try {
    return (await window.showOpenFilePicker?.({ multiple: true, types: CIRCUIT_FILE_TYPES })) ?? [];
  } catch {
    return [];
  }
}

export function serializeCircuit(circuit: CircuitDocument): string {
  return JSON.stringify(circuit, null, 2);
}

export async function writeTextToHandle(handle: FileSystemFileHandle, text: string): Promise<void> {
  const writable = await handle.createWritable();
  await writable.write(text);
  await writable.close();
}

// Handles restaurados de sessões anteriores exigem revalidação de permissão;
// requestPermission precisa de gesto do usuário, então só é chamado dentro de
// ações como Ctrl+S. Navegadores sem a API de permissão contam como liberados.
export async function ensureWritePermission(handle: FileSystemFileHandle): Promise<boolean> {
  const descriptor: FileSystemHandlePermissionDescriptor = { mode: 'readwrite' };
  const state = (await handle.queryPermission?.(descriptor)) ?? 'granted';
  if (state === 'granted') return true;
  if (state === 'denied') return false;
  return ((await handle.requestPermission?.(descriptor)) ?? 'denied') === 'granted';
}

export async function ensureReadPermission(handle: FileSystemFileHandle): Promise<boolean> {
  const descriptor: FileSystemHandlePermissionDescriptor = { mode: 'read' };
  const state = (await handle.queryPermission?.(descriptor)) ?? 'granted';
  if (state === 'granted') return true;
  if (state === 'denied') return false;
  return ((await handle.requestPermission?.(descriptor)) ?? 'denied') === 'granted';
}

// Handles de arquivo não são serializáveis em localStorage; vivem em IndexedDB
// com o id do documento como chave. Toda falha aqui é silenciosa: o vínculo
// passa a valer só para a sessão atual, e o save degrada para "Salvar como".
const DB_NAME = 'opencircuit.files';
const DB_VERSION = 2;
const STORE_NAME = 'handles';
const RECENT_STORE_NAME = 'recent-files';
const MAX_RECENT_FILES = 10;

export type RecentFile = {
  id: string;
  name: string;
  handle: FileSystemFileHandle;
  lastOpenedAt: number;
};

function openDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      if (!request.result.objectStoreNames.contains(STORE_NAME)) {
        request.result.createObjectStore(STORE_NAME);
      }
      if (!request.result.objectStoreNames.contains(RECENT_STORE_NAME)) {
        request.result.createObjectStore(RECENT_STORE_NAME, { keyPath: 'id' });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error('IndexedDB indisponível'));
  });
}

async function withStore<T>(
  storeName: string,
  mode: IDBTransactionMode,
  run: (store: IDBObjectStore) => IDBRequest<T>,
): Promise<T> {
  const db = await openDatabase();
  try {
    return await new Promise<T>((resolve, reject) => {
      const request = run(db.transaction(storeName, mode).objectStore(storeName));
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error ?? new Error('Operação IndexedDB falhou'));
    });
  } finally {
    db.close();
  }
}

export async function storeFileHandle(
  documentId: string,
  handle: FileSystemFileHandle,
): Promise<void> {
  try {
    await withStore(STORE_NAME, 'readwrite', (store) => store.put(handle, documentId));
  } catch {
    // Vínculo vale só para a sessão atual.
  }
}

export async function removeFileHandle(documentId: string): Promise<void> {
  try {
    await withStore(STORE_NAME, 'readwrite', (store) => store.delete(documentId));
  } catch {
    // Nada a limpar.
  }
}

export async function loadFileHandles(): Promise<Map<string, FileSystemFileHandle>> {
  const handles = new Map<string, FileSystemFileHandle>();
  try {
    const db = await openDatabase();
    try {
      await new Promise<void>((resolve, reject) => {
        const store = db.transaction(STORE_NAME, 'readonly').objectStore(STORE_NAME);
        const request = store.openCursor();
        request.onsuccess = () => {
          const cursor = request.result;
          if (!cursor) {
            resolve();
            return;
          }
          if (typeof cursor.key === 'string') {
            handles.set(cursor.key, cursor.value as FileSystemFileHandle);
          }
          cursor.continue();
        };
        request.onerror = () => reject(request.error ?? new Error('Operação IndexedDB falhou'));
      });
    } finally {
      db.close();
    }
  } catch {
    // Sem handles persistidos.
  }
  return handles;
}

export async function loadRecentFiles(): Promise<RecentFile[]> {
  try {
    const entries = await withStore<RecentFile[]>(RECENT_STORE_NAME, 'readonly', (store) =>
      store.getAll(),
    );
    return entries.sort((left, right) => right.lastOpenedAt - left.lastOpenedAt);
  } catch {
    return [];
  }
}

async function handlesMatch(
  left: FileSystemFileHandle,
  right: FileSystemFileHandle,
): Promise<boolean> {
  try {
    return (await left.isSameEntry?.(right)) ?? left === right;
  } catch {
    return false;
  }
}

export async function rememberRecentFile(handle: FileSystemFileHandle): Promise<RecentFile[]> {
  const current = await loadRecentFiles();
  let previous: RecentFile | undefined;
  for (const entry of current) {
    if (await handlesMatch(entry.handle, handle)) {
      previous = entry;
      break;
    }
  }

  const recent: RecentFile = {
    id: previous?.id ?? `recent-${Date.now()}-${crypto.randomUUID?.() ?? Math.random()}`,
    name: handle.name,
    handle,
    lastOpenedAt: Date.now(),
  };

  try {
    await withStore(RECENT_STORE_NAME, 'readwrite', (store) => store.put(recent));
    const overflow = current.filter((entry) => entry.id !== recent.id).slice(MAX_RECENT_FILES - 1);
    await Promise.all(
      overflow.map((entry) =>
        withStore(RECENT_STORE_NAME, 'readwrite', (store) => store.delete(entry.id)),
      ),
    );
  } catch {
    // A abertura continua funcionando mesmo sem histórico persistente.
  }
  return loadRecentFiles();
}

export async function removeRecentFile(recentId: string): Promise<RecentFile[]> {
  try {
    await withStore(RECENT_STORE_NAME, 'readwrite', (store) => store.delete(recentId));
  } catch {
    // Nada a limpar.
  }
  return loadRecentFiles();
}
