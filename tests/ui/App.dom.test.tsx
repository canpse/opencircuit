// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
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

describe('App mounted interactions', () => {
  beforeEach(() => {
    localStorage.clear();
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
});
