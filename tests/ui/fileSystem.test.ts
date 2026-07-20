import { describe, expect, test, vi } from 'vitest';
import { ensureReadPermission } from '../../src/state/fileSystem';

function fileHandle(
  queryPermission: () => Promise<PermissionState>,
  requestPermission: () => Promise<PermissionState>,
): FileSystemFileHandle {
  return {
    queryPermission,
    requestPermission,
  } as unknown as FileSystemFileHandle;
}

describe('permissão de arquivos recentes', () => {
  test('reutiliza uma permissão de leitura já concedida', async () => {
    const requestPermission = vi.fn(async () => 'granted' as PermissionState);
    const handle = fileHandle(async () => 'granted', requestPermission);

    await expect(ensureReadPermission(handle)).resolves.toBe(true);
    expect(requestPermission).not.toHaveBeenCalled();
  });

  test('solicita novamente uma permissão pendente', async () => {
    const requestPermission = vi.fn(async () => 'granted' as PermissionState);
    const handle = fileHandle(async () => 'prompt', requestPermission);

    await expect(ensureReadPermission(handle)).resolves.toBe(true);
    expect(requestPermission).toHaveBeenCalledOnce();
  });

  test('não solicita novamente uma permissão negada', async () => {
    const requestPermission = vi.fn(async () => 'granted' as PermissionState);
    const handle = fileHandle(async () => 'denied', requestPermission);

    await expect(ensureReadPermission(handle)).resolves.toBe(false);
    expect(requestPermission).not.toHaveBeenCalled();
  });
});
