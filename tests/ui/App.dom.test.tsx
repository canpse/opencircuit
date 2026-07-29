// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { App } from '../../src/ui/App';
import { CIRCUIT_EXAMPLES } from '../../src/examples/circuitExamples';
import { WORKSPACE_STORAGE_KEY } from '../../src/state/workspaceStorage';

class IdleWorker {
  static instances = 0;

  constructor() {
    IdleWorker.instances += 1;
  }

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

const SIGNAL_EXAMPLE = CIRCUIT_EXAMPLES.find((example) => example.id === 'signal-led-basic')!;
const NOT_EXAMPLE = CIRCUIT_EXAMPLES.find((example) => example.id === 'not-basic')!;

function openExample(exampleId: string) {
  fireEvent.change(screen.getByRole('combobox', { name: 'Aulas e exemplos' }), {
    target: { value: exampleId },
  });
}

function documentTab(container: HTMLElement, documentName: string): HTMLElement {
  const tab = Array.from(container.querySelectorAll<HTMLElement>('.document-tab')).find((item) =>
    item.querySelector('.document-tab-title')?.textContent?.includes(documentName),
  );
  expect(tab).toBeTruthy();
  return tab!;
}

describe('App mounted interactions', () => {
  beforeEach(() => {
    localStorage.clear();
    IdleWorker.instances = 0;
    vi.stubGlobal('Worker', IdleWorker);
    vi.stubGlobal('ResizeObserver', IdleResizeObserver);
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        new Response(JSON.stringify([]), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        }),
      ),
    );
  });

  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it('mounts the editor and creates another document tab', () => {
    const { container } = render(<App />);

    expect(screen.getByText('OpenCircuit')).toBeTruthy();
    expect(screen.getByText('circuito_logico.json')).toBeTruthy();

    const addTab = container.querySelector<HTMLButtonElement>('.add-tab');
    expect(addTab).not.toBeNull();
    fireEvent.click(addTab!);

    expect(screen.getByText('Sem título 2')).toBeTruthy();
  });

  it('toggles the hand tool through the Space shortcut', () => {
    render(<App />);
    const handTool = screen.getByRole('button', { name: 'Mão' });

    fireEvent.keyDown(window, { key: ' ', code: 'Space' });
    expect(handTool.classList.contains('active')).toBe(true);

    fireEvent.keyDown(window, { key: ' ', code: 'Space' });
    expect(handTool.classList.contains('active')).toBe(false);
  });

  it('opens the remote circuit browser through Ctrl+O', async () => {
    render(<App />);

    fireEvent.keyDown(window, { key: 'o', code: 'KeyO', ctrlKey: true });

    expect(await screen.findByRole('dialog', { name: 'Meus circuitos' })).toBeTruthy();
    await waitFor(() => {
      expect(fetch).toHaveBeenCalledTimes(1);
    });
  });

  it('abre exemplo limpo na Lição e fecha sem confirmação quando intocado', () => {
    const { container } = render(<App />);

    openExample(SIGNAL_EXAMPLE.id);

    expect(screen.getByRole('tab', { name: 'Lição' }).getAttribute('aria-selected')).toBe('true');
    expect(screen.getByRole('heading', { name: SIGNAL_EXAMPLE.name })).toBeTruthy();
    const tab = documentTab(container, SIGNAL_EXAMPLE.name);
    expect(tab.querySelector('[aria-label="Mudanças não salvas"]')).toBeNull();

    fireEvent.click(screen.getByRole('button', { name: `Fechar ${SIGNAL_EXAMPLE.name}` }));

    expect(screen.queryByRole('alertdialog')).toBeNull();
    expect(
      Array.from(container.querySelectorAll('.document-tab-title')).some((item) =>
        item.textContent?.includes(SIGNAL_EXAMPLE.name),
      ),
    ).toBe(false);
  });

  it('marca exemplo alterado como sujo e protege o fechamento', () => {
    const { container } = render(<App />);

    openExample(SIGNAL_EXAMPLE.id);
    const input = container.querySelector<SVGImageElement>('.input-asset');
    expect(input).not.toBeNull();
    fireEvent.click(input!);

    const tab = documentTab(container, SIGNAL_EXAMPLE.name);
    expect(tab.querySelector('[aria-label="Mudanças não salvas"]')).not.toBeNull();

    fireEvent.click(screen.getByRole('button', { name: `Fechar ${SIGNAL_EXAMPLE.name}` }));

    expect(
      screen.getByRole('alertdialog', { name: `Fechar ${SIGNAL_EXAMPLE.name}?` }),
    ).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Salvar' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Descartar' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Cancelar' })).toBeTruthy();
  });

  it('salva uma cópia remota do exemplo sem alterar o catálogo embutido', async () => {
    const catalogBefore = JSON.stringify(SIGNAL_EXAMPLE.circuit);
    const fetchMock = vi.mocked(fetch);
    fetchMock.mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          id: 'remote-example',
          ownerId: 'owner-test',
          name: SIGNAL_EXAMPLE.name,
          revision: 1,
          createdAt: '2026-07-29T12:00:00.000Z',
          updatedAt: '2026-07-29T12:00:00.000Z',
          circuit: SIGNAL_EXAMPLE.circuit,
        }),
        {
          status: 201,
          headers: { 'Content-Type': 'application/json' },
        },
      ),
    );
    const { container } = render(<App />);
    openExample(SIGNAL_EXAMPLE.id);

    fireEvent.keyDown(window, { key: 's', code: 'KeyS', ctrlKey: true });

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledTimes(1);
      expect(documentTab(container, SIGNAL_EXAMPLE.name).textContent).toContain('☁');
    });
    const [path, request] = fetchMock.mock.calls[0]!;
    expect(path).toBe('/api/circuits');
    expect(request?.method).toBe('POST');
    const body = JSON.parse(String(request?.body)) as {
      name: string;
      circuit: unknown;
    };
    expect(body.name).toBe(SIGNAL_EXAMPLE.name);
    expect(body.circuit).toEqual(SIGNAL_EXAMPLE.circuit);
    expect(JSON.stringify(SIGNAL_EXAMPLE.circuit)).toBe(catalogBefore);
  });

  it('abre exemplos relacionados em abas independentes e mantém a Lição ativa', () => {
    const { container } = render(<App />);

    openExample(SIGNAL_EXAMPLE.id);
    fireEvent.click(screen.getByRole('button', { name: NOT_EXAMPLE.name }));

    expect(documentTab(container, SIGNAL_EXAMPLE.name)).toBeTruthy();
    expect(documentTab(container, NOT_EXAMPLE.name)).toBeTruthy();
    expect(screen.getByRole('tab', { name: 'Lição' }).getAttribute('aria-selected')).toBe('true');
    expect(screen.getByRole('heading', { name: NOT_EXAMPLE.name })).toBeTruthy();
  });

  it('opens an over-budget legacy document in recovery mode without starting simulation', () => {
    const definition = {
      id: 'wide',
      name: 'Larga',
      components: Array.from({ length: 100 }, (_, index) => ({
        id: `g${index}`,
        type: 'not',
        x: index,
        y: 0,
      })),
      wires: [],
    };
    const circuit = {
      version: 1,
      definitions: [definition],
      components: Array.from({ length: 101 }, (_, index) => ({
        id: `u${index}`,
        type: 'subcircuit',
        x: index,
        y: 0,
        definitionId: definition.id,
      })),
      wires: [],
    };
    localStorage.setItem(
      'opencircuit.logic.workspace.v1',
      JSON.stringify({
        version: 2,
        activeDocumentId: 'legacy',
        documents: [
          {
            id: 'legacy',
            name: 'legado.json',
            circuit,
            exampleId: null,
            saved: true,
            everSaved: true,
            remoteId: null,
            revision: null,
            libraryId: null,
          },
        ],
      }),
    );

    render(<App />);

    expect(screen.getByRole('alert').textContent).toContain('Modo de recuperação');
    expect(screen.getByText(/Análise desativada/)).toBeTruthy();
    expect(IdleWorker.instances).toBe(0);
  });

  it('mantém um aviso único quando o autosave falha e oferece o download do JSON', async () => {
    const originalSetItem = Storage.prototype.setItem;
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(function (this: Storage, key, value) {
      if (key === WORKSPACE_STORAGE_KEY) {
        throw new DOMException('Quota excedida', 'QuotaExceededError');
      }
      originalSetItem.call(this, key, value);
    });
    const createObjectURL = vi.fn(() => 'blob:recovery');
    const revokeObjectURL = vi.fn();
    vi.stubGlobal('URL', { createObjectURL, revokeObjectURL });
    const anchorClick = vi
      .spyOn(HTMLAnchorElement.prototype, 'click')
      .mockImplementation(() => undefined);
    const { container } = render(<App />);

    const warning = await screen.findByRole('alert');
    expect(warning.textContent).toContain('O autosave local falhou');
    expect(warning.textContent).toContain('alterações podem ser perdidas');
    expect(screen.getAllByRole('alert')).toHaveLength(1);
    const footerText = container.querySelector('.app-footer')?.textContent;
    expect(footerText).toContain('autosave local: falhou');
    expect(footerText).toContain('servidor: não sincronizado');

    const addTab = container.querySelector<HTMLButtonElement>('.add-tab');
    expect(addTab).not.toBeNull();
    fireEvent.click(addTab!);
    await waitFor(() => {
      expect(screen.getAllByRole('alert')).toHaveLength(1);
      expect(screen.getByRole('alert')).toBe(warning);
    });

    fireEvent.click(screen.getByRole('button', { name: 'Baixar JSON agora' }));
    expect(createObjectURL).toHaveBeenCalledTimes(1);
    expect(anchorClick).toHaveBeenCalledTimes(1);
    expect(revokeObjectURL).toHaveBeenCalledWith('blob:recovery');
  });

  it('remove o aviso e sinaliza recuperação após uma gravação local bem-sucedida', async () => {
    const originalSetItem = Storage.prototype.setItem;
    let shouldFail = true;
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(function (this: Storage, key, value) {
      if (key === WORKSPACE_STORAGE_KEY && shouldFail) {
        throw new DOMException('Storage bloqueado', 'SecurityError');
      }
      originalSetItem.call(this, key, value);
    });
    const { container } = render(<App />);

    expect(await screen.findByRole('alert')).toBeTruthy();
    shouldFail = false;
    const addTab = container.querySelector<HTMLButtonElement>('.add-tab');
    expect(addTab).not.toBeNull();
    fireEvent.click(addTab!);

    await waitFor(() => {
      expect(screen.queryByRole('alert')).toBeNull();
      expect(container.querySelector('.app-footer')?.textContent).toContain(
        'autosave local: recuperado',
      );
    });
  });
});
