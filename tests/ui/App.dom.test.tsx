// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { App } from '../../src/ui/App';

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
});
