// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { CIRCUIT_EXAMPLES } from '../../src/examples/circuitExamples';
import type { WorkspaceDocument, WorkspaceState } from '../../src/state/workspaceStorage';
import { WORKSPACE_STORAGE_KEY } from '../../src/state/workspaceStorage';
import { App } from '../../src/ui/App';

class IdleWorker {
  addEventListener() {}
  removeEventListener() {}
  postMessage() {}
  terminate() {}
}

class IdleResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
}

const CIRCUIT = CIRCUIT_EXAMPLES.find((example) => example.id === 'signal-led-basic')!.circuit;
const NOW = '2026-07-29T12:00:00.000Z';

function workspaceDocument(overrides: Partial<WorkspaceDocument> = {}): WorkspaceDocument {
  return {
    id: 'doc-active',
    name: 'Circuito original',
    circuit: CIRCUIT,
    exampleId: null,
    saved: false,
    everSaved: true,
    remoteId: 'remote-1',
    revision: 3,
    libraryId: null,
    ...overrides,
  };
}

function seedWorkspace(document: WorkspaceDocument) {
  const workspace: WorkspaceState = {
    version: 2,
    activeDocumentId: document.id,
    documents: [document],
  };
  localStorage.setItem(WORKSPACE_STORAGE_KEY, JSON.stringify(workspace));
}

function storedCircuit(id: string, name: string, revision: number) {
  return {
    id,
    ownerId: 'owner-test',
    name,
    revision,
    createdAt: NOW,
    updatedAt: NOW,
    circuit: CIRCUIT,
  };
}

function documentTab(container: HTMLElement, name: string): HTMLElement {
  const tab = Array.from(container.querySelectorAll<HTMLElement>('.document-tab')).find(
    (candidate) => candidate.querySelector('.document-tab-name')?.textContent === name,
  );
  expect(tab).toBeTruthy();
  return tab!;
}

describe('fluxos montados de persistência', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.stubGlobal('Worker', IdleWorker);
    vi.stubGlobal('ResizeObserver', IdleResizeObserver);
    vi.stubGlobal('fetch', vi.fn());
  });

  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it('atualiza o circuito remoto já vinculado sem criar outro registro', async () => {
    seedWorkspace(workspaceDocument());
    const fetchMock = vi.mocked(fetch);
    fetchMock.mockResolvedValueOnce(
      new Response(JSON.stringify(storedCircuit('remote-1', 'Circuito original', 4)), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }),
    );
    render(<App />);

    fireEvent.keyDown(window, { key: 's', code: 'KeyS', ctrlKey: true });

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledTimes(1);
      expect(screen.getByLabelText('Circuito no servidor: Sincronizado')).toBeTruthy();
    });
    const [path, request] = fetchMock.mock.calls[0]!;
    expect(path).toBe('/api/circuits/remote-1');
    expect(request?.method).toBe('PUT');
    expect(JSON.parse(String(request?.body))).toMatchObject({
      name: 'Circuito original',
      revision: 3,
    });
  });

  it('atualiza o componente vinculado à biblioteca no destino correto', async () => {
    seedWorkspace(
      workspaceDocument({
        name: 'Porta personalizada',
        remoteId: null,
        libraryId: 'library-1',
        revision: 5,
      }),
    );
    const fetchMock = vi.mocked(fetch);
    fetchMock.mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          id: 'library-1',
          ownerId: 'owner-test',
          name: 'Porta personalizada',
          revision: 6,
          createdAt: NOW,
          updatedAt: NOW,
          definition: { components: CIRCUIT.components, wires: CIRCUIT.wires },
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } },
      ),
    );
    const { container } = render(<App />);

    expect(documentTab(container, 'Porta personalizada').textContent).toContain('Biblioteca');
    fireEvent.keyDown(window, { key: 's', code: 'KeyS', ctrlKey: true });

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledTimes(1);
      expect(screen.getByLabelText('Componente da biblioteca: Sincronizado')).toBeTruthy();
    });
    const [path, request] = fetchMock.mock.calls[0]!;
    expect(path).toBe('/api/library/library-1');
    expect(request?.method).toBe('PUT');
    expect(JSON.parse(String(request?.body))).toMatchObject({
      name: 'Porta personalizada',
      revision: 5,
    });
  });

  it('cria e seleciona uma cópia em nova aba sem alterar a aba original', async () => {
    seedWorkspace(workspaceDocument({ saved: true }));
    const fetchMock = vi.mocked(fetch);
    fetchMock.mockResolvedValueOnce(
      new Response(JSON.stringify(storedCircuit('remote-copy', 'Circuito original - cópia', 1)), {
        status: 201,
        headers: { 'Content-Type': 'application/json' },
      }),
    );
    const { container } = render(<App />);

    fireEvent.keyDown(window, {
      key: 's',
      code: 'KeyS',
      ctrlKey: true,
      shiftKey: true,
    });

    const dialog = screen.getByRole('dialog', { name: 'Criar cópia no servidor' });
    expect(dialog.textContent).toContain('aberta em uma nova aba');
    expect(dialog.textContent).toContain('aba original permanecerá intacta');
    expect((screen.getByRole('textbox', { name: 'Nome' }) as HTMLInputElement).value).toBe(
      'Circuito original - cópia',
    );
    fireEvent.click(screen.getByRole('button', { name: 'Criar cópia' }));

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledTimes(1);
      expect(documentTab(container, 'Circuito original - cópia')).toBeTruthy();
    });
    const originalTab = documentTab(container, 'Circuito original');
    const copyTab = documentTab(container, 'Circuito original - cópia');
    expect(originalTab.textContent).toContain('Servidor');
    expect(copyTab.textContent).toContain('Servidor');
    expect(originalTab.classList.contains('active')).toBe(false);
    expect(copyTab.classList.contains('active')).toBe(true);
    expect(container.querySelectorAll('.document-tab:not(.add-tab)')).toHaveLength(2);

    const [path, request] = fetchMock.mock.calls[0]!;
    expect(path).toBe('/api/circuits');
    expect(request?.method).toBe('POST');
    expect(JSON.parse(String(request?.body)).name).toBe('Circuito original - cópia');
  });

  it('mantém o rascunho local e informa offline quando o primeiro envio falha', async () => {
    const fetchMock = vi.mocked(fetch);
    fetchMock.mockRejectedValueOnce(new TypeError('offline'));
    const { container } = render(<App />);

    fireEvent.keyDown(window, { key: 's', code: 'KeyS', ctrlKey: true });
    fireEvent.change(screen.getByRole('textbox', { name: 'Nome' }), {
      target: { value: 'Circuito offline' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Salvar e vincular aba' }));

    await waitFor(() => {
      expect(
        screen.getByLabelText('Rascunho local: Servidor offline; mantido localmente'),
      ).toBeTruthy();
    });
    expect(screen.getByRole('dialog', { name: 'Salvar no servidor' })).toBeTruthy();
    expect(documentTab(container, 'circuito_logico.json').textContent).toContain('Local');
    expect(container.querySelectorAll('.document-tab:not(.add-tab)')).toHaveLength(1);
  });

  it('explicita o destino ao fechar e salva antes de substituir a última aba', async () => {
    seedWorkspace(
      workspaceDocument({
        name: 'Rascunho importante.json',
        remoteId: null,
        revision: null,
        libraryId: null,
      }),
    );
    const fetchMock = vi.mocked(fetch);
    fetchMock.mockResolvedValueOnce(
      new Response(JSON.stringify(storedCircuit('remote-new', 'Rascunho importante', 1)), {
        status: 201,
        headers: { 'Content-Type': 'application/json' },
      }),
    );
    const { container } = render(<App />);

    fireEvent.click(screen.getByRole('button', { name: 'Fechar Rascunho importante.json' }));
    const closeDialog = screen.getByRole('alertdialog', {
      name: 'Fechar Rascunho importante.json?',
    });
    expect(closeDialog.textContent).toContain('Salve-o no servidor antes de fechar');
    fireEvent.click(screen.getByRole('button', { name: 'Salvar no servidor e fechar…' }));

    expect(screen.queryByRole('alertdialog')).toBeNull();
    expect(screen.getByRole('dialog', { name: 'Salvar no servidor' }).textContent).toContain(
      'Meus circuitos no servidor',
    );
    expect((screen.getByRole('textbox', { name: 'Nome' }) as HTMLInputElement).value).toBe(
      'Rascunho importante',
    );
    fireEvent.click(screen.getByRole('button', { name: 'Salvar e fechar' }));

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledTimes(1);
      expect(screen.queryByText('Rascunho importante.json')).toBeNull();
      expect(documentTab(container, 'Sem título 1')).toBeTruthy();
    });
    expect(JSON.parse(String(fetchMock.mock.calls[0]?.[1]?.body)).name).toBe('Rascunho importante');
  });

  it('preserva alterações em conflito e permite abri-las como cópia independente', async () => {
    seedWorkspace(workspaceDocument());
    const fetchMock = vi.mocked(fetch);
    fetchMock
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            error: 'Existe uma versão mais nova.',
            circuit: storedCircuit('remote-1', 'Circuito do servidor', 4),
          }),
          { status: 409, headers: { 'Content-Type': 'application/json' } },
        ),
      )
      .mockResolvedValueOnce(
        new Response(JSON.stringify(storedCircuit('remote-conflict-copy', 'Minha versão', 1)), {
          status: 201,
          headers: { 'Content-Type': 'application/json' },
        }),
      );
    const { container } = render(<App />);

    fireEvent.keyDown(window, { key: 's', code: 'KeyS', ctrlKey: true });

    const conflict = await screen.findByRole('alertdialog', {
      name: 'Conflito em Circuito original',
    });
    expect(conflict.textContent).toContain('versão mais nova no servidor');
    expect(conflict.textContent).toContain('alterações continuam protegidas localmente');
    expect(screen.getByLabelText('Circuito no servidor: Conflito de versão')).toBeTruthy();

    fireEvent.click(screen.getByRole('button', { name: 'Criar cópia…' }));
    const nameInput = screen.getByRole('textbox', { name: 'Nome' });
    fireEvent.change(nameInput, { target: { value: 'Minha versão' } });
    fireEvent.click(screen.getByRole('button', { name: 'Criar cópia' }));

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledTimes(2);
      expect(documentTab(container, 'Minha versão').classList.contains('active')).toBe(true);
    });
    expect(documentTab(container, 'Circuito original')).toBeTruthy();
    expect(container.querySelectorAll('.document-tab:not(.add-tab)')).toHaveLength(2);
    expect(fetchMock.mock.calls[1]?.[0]).toBe('/api/circuits');
    expect(fetchMock.mock.calls[1]?.[1]?.method).toBe('POST');
  });
});
