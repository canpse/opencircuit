// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { CircuitDefinition } from '../../src/core/types';
import type { StoredLibraryComponent } from '../../src/state/libraryApi';
import {
  WORKSPACE_STORAGE_KEY,
  type WorkspaceDocument,
  type WorkspaceState,
} from '../../src/state/workspaceStorage';
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

const NOW = '2026-07-29T12:00:00.000Z';
const VALID_DEFINITION: CircuitDefinition = {
  id: 'indicator',
  name: 'Indicador reutilizável',
  components: [
    { id: 'A', type: 'input', x: 0, y: 0 },
    { id: 'OUT', type: 'led', x: 200, y: 0 },
  ],
  wires: [
    {
      id: 'W1',
      from: { componentId: 'A', pinId: 'out' },
      to: { componentId: 'OUT', pinId: 'in' },
    },
  ],
};

function storedLibraryComponent(
  overrides: Partial<StoredLibraryComponent> = {},
): StoredLibraryComponent {
  return {
    id: 'library-1',
    ownerId: 'owner-test',
    name: 'Indicador reutilizável',
    revision: 1,
    createdAt: NOW,
    updatedAt: NOW,
    definition: {
      components: VALID_DEFINITION.components,
      wires: VALID_DEFINITION.wires,
    },
    ...overrides,
  };
}

function seedWorkspace(
  definitions: CircuitDefinition[],
  documentOverrides: Partial<WorkspaceDocument> = {},
) {
  const document: WorkspaceDocument = {
    id: 'doc-active',
    name: 'Projeto local',
    circuit: {
      version: 1,
      components: [],
      wires: [],
      definitions,
    },
    exampleId: null,
    saved: false,
    everSaved: true,
    remoteId: null,
    revision: null,
    libraryId: null,
    ...documentOverrides,
  };
  const workspace: WorkspaceState = {
    version: 2,
    activeDocumentId: document.id,
    documents: [document],
  };
  localStorage.setItem(WORKSPACE_STORAGE_KEY, JSON.stringify(workspace));
}

function response(payload: unknown, status = 200) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

function openLibrary() {
  fireEvent.click(screen.getByRole('button', { name: /Arquivo/ }));
  fireEvent.click(screen.getByRole('menuitem', { name: 'Minha biblioteca' }));
}

describe('fluxos montados da biblioteca pessoal', () => {
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

  it('publica pelo ponto principal com nome, destino e resumo explícitos', async () => {
    seedWorkspace([VALID_DEFINITION]);
    const fetchMock = vi.mocked(fetch);
    fetchMock.mockResolvedValueOnce(response(storedLibraryComponent(), 201));
    render(<App />);

    fireEvent.click(screen.getByTitle('Editar Indicador reutilizável'));
    fireEvent.click(screen.getByRole('button', { name: 'Publicar na biblioteca…' }));

    const dialog = screen.getByRole('dialog', { name: 'Publicar na biblioteca' });
    expect(dialog.textContent).toContain('Minha biblioteca');
    expect(dialog.textContent).toContain('independente');
    const summary = screen.getByRole('group', { name: 'Resumo do componente' });
    expect(summary.textContent).toContain('Componentes2');
    expect(summary.textContent).toContain('Fios1');
    expect(summary.textContent).toContain('Entradas1');
    expect(summary.textContent).toContain('Saídas1');
    expect(
      (screen.getByRole('textbox', { name: 'Nome do componente' }) as HTMLInputElement).value,
    ).toBe('Indicador reutilizável');

    fireEvent.click(screen.getByRole('button', { name: 'Publicar componente' }));

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledTimes(1);
      expect(screen.queryByRole('dialog', { name: 'Publicar na biblioteca' })).toBeNull();
    });
    const [path, request] = fetchMock.mock.calls[0]!;
    expect(path).toBe('/api/library');
    expect(request?.method).toBe('POST');
    expect(JSON.parse(String(request?.body))).toMatchObject({
      name: 'Indicador reutilizável',
      definition: {
        components: VALID_DEFINITION.components,
        wires: VALID_DEFINITION.wires,
      },
    });
  });

  it('usa o mesmo diálogo pelo atalho contextual e bloqueia definição aninhada', () => {
    const nested: CircuitDefinition = {
      id: 'nested',
      name: 'Composição',
      components: [
        {
          id: 'U1',
          type: 'subcircuit',
          definitionId: VALID_DEFINITION.id,
          x: 0,
          y: 0,
        },
      ],
      wires: [],
    };
    seedWorkspace([VALID_DEFINITION, nested], {
      circuit: {
        version: 1,
        components: [
          {
            id: 'ROOT-U1',
            type: 'subcircuit',
            definitionId: nested.id,
            x: 100,
            y: 100,
          },
        ],
        wires: [],
        definitions: [VALID_DEFINITION, nested],
      },
    });
    const { container } = render(<App />);

    const instance = container.querySelector<SVGGElement>('g.component');
    expect(instance).not.toBeNull();
    fireEvent.contextMenu(instance!, { clientX: 300, clientY: 300 });
    fireEvent.click(screen.getByRole('menuitem', { name: 'Publicar na biblioteca…' }));

    const dialog = screen.getByRole('dialog', { name: 'Publicar na biblioteca' });
    expect(dialog.textContent).toContain('Publicação indisponível');
    expect(dialog.textContent).toContain('Indicador reutilizável');
    expect(
      (
        screen.getByRole('button', {
          name: 'Publicar componente',
        }) as HTMLButtonElement
      ).disabled,
    ).toBe(true);
    expect(fetch).not.toHaveBeenCalled();
  });

  it('explica e bloqueia a publicação de uma definição vazia', () => {
    const empty: CircuitDefinition = {
      id: 'empty',
      name: 'Sem conteúdo',
      components: [],
      wires: [],
    };
    seedWorkspace([empty]);
    render(<App />);

    fireEvent.click(screen.getByTitle('Editar Sem conteúdo'));
    fireEvent.click(screen.getByRole('button', { name: 'Publicar na biblioteca…' }));

    expect(screen.getByRole('alert').textContent).toContain('A definição está vazia');
    expect(
      (
        screen.getByRole('button', {
          name: 'Publicar componente',
        }) as HTMLButtonElement
      ).disabled,
    ).toBe(true);
  });

  it('insere uma cópia, mostra posicionamento cancelável e preserva a cópia ao excluir a origem', async () => {
    seedWorkspace([]);
    const stored = storedLibraryComponent();
    const summary = {
      id: stored.id,
      name: stored.name,
      revision: stored.revision,
      createdAt: stored.createdAt,
      updatedAt: stored.updatedAt,
    };
    const fetchMock = vi.mocked(fetch);
    fetchMock
      .mockResolvedValueOnce(response([summary]))
      .mockResolvedValueOnce(response(stored))
      .mockResolvedValueOnce(response([summary]))
      .mockResolvedValueOnce(new Response(null, { status: 204 }));
    const { container } = render(<App />);

    openLibrary();
    expect(await screen.findByRole('dialog', { name: 'Minha biblioteca' })).toBeTruthy();
    expect(screen.getByText(/Insira uma cópia independente/)).toBeTruthy();
    expect(screen.getByRole('button', { name: `Inserir ${stored.name}` })).toBeTruthy();
    expect(screen.getByRole('button', { name: `Editar ${stored.name}` })).toBeTruthy();
    expect(screen.getByRole('button', { name: `Excluir ${stored.name}` })).toBeTruthy();

    fireEvent.click(screen.getByRole('button', { name: `Inserir ${stored.name}` }));

    const placement = await screen.findByRole('status');
    expect(placement.textContent).toContain(`${stored.name} pronto para posicionar`);
    expect(screen.getByTitle(`Editar ${stored.name}`)).toBeTruthy();
    const canvas = container.querySelector<SVGSVGElement>('svg.circuit-canvas')!;
    Object.defineProperties(canvas, {
      getScreenCTM: {
        configurable: true,
        value: () => ({ inverse: () => ({}) }),
      },
      createSVGPoint: {
        configurable: true,
        value: () => ({
          x: 0,
          y: 0,
          matrixTransform() {
            return { x: this.x, y: this.y };
          },
        }),
      },
    });
    fireEvent.click(container.querySelector('.canvas-bg')!, {
      clientX: 320,
      clientY: 180,
    });
    expect(container.querySelectorAll('g.component')).toHaveLength(1);
    expect(screen.getByRole('status').textContent).toContain('pronto para posicionar');

    fireEvent.click(screen.getByRole('button', { name: 'Cancelar posicionamento' }));
    expect(screen.queryByRole('status')).toBeNull();

    openLibrary();
    const libraryDialog = await screen.findByRole('dialog', { name: 'Minha biblioteca' });
    fireEvent.click(
      within(libraryDialog).getByRole('button', {
        name: `Excluir ${stored.name}`,
      }),
    );

    const deleteDialog = screen.getByRole('alertdialog', {
      name: 'Excluir componente da biblioteca?',
    });
    expect(deleteDialog.textContent).toContain('Cópias já inseridas');
    fireEvent.click(screen.getByRole('button', { name: 'Excluir da biblioteca' }));

    await waitFor(() => {
      expect(screen.queryByRole('alertdialog')).toBeNull();
      expect(screen.getByText('Nenhum componente salvo na biblioteca.')).toBeTruthy();
    });
    expect(screen.getByTitle(`Editar ${stored.name}`)).toBeTruthy();
    expect(container.querySelectorAll('g.component')).toHaveLength(1);
    expect(fetchMock.mock.calls[3]?.[0]).toBe('/api/library/library-1');
    expect(fetchMock.mock.calls[3]?.[1]?.method).toBe('DELETE');
  });

  it('abre a origem para edição numa aba vinculada à biblioteca', async () => {
    seedWorkspace([]);
    const stored = storedLibraryComponent();
    const fetchMock = vi.mocked(fetch);
    fetchMock
      .mockResolvedValueOnce(
        response([
          {
            id: stored.id,
            name: stored.name,
            revision: stored.revision,
            createdAt: stored.createdAt,
            updatedAt: stored.updatedAt,
          },
        ]),
      )
      .mockResolvedValueOnce(response(stored));
    const { container } = render(<App />);

    openLibrary();
    await screen.findByRole('dialog', { name: 'Minha biblioteca' });
    fireEvent.click(screen.getByRole('button', { name: `Editar ${stored.name}` }));

    await waitFor(() => {
      expect(screen.queryByRole('dialog', { name: 'Minha biblioteca' })).toBeNull();
      expect(screen.getByLabelText('Componente da biblioteca: Sincronizado')).toBeTruthy();
    });
    const tabs = Array.from(container.querySelectorAll<HTMLElement>('.document-tab'));
    const libraryTab = tabs.find(
      (tab) => tab.querySelector('.document-tab-name')?.textContent === stored.name,
    );
    expect(libraryTab?.textContent).toContain('Biblioteca');
    expect(libraryTab?.classList.contains('active')).toBe(true);
    expect(fetchMock.mock.calls[1]?.[0]).toBe('/api/library/library-1');
  });

  it('preserva uma aba vinculada como rascunho ao excluir sua origem', async () => {
    const stored = storedLibraryComponent();
    seedWorkspace([], {
      name: stored.name,
      circuit: {
        version: 1,
        components: stored.definition.components,
        wires: stored.definition.wires,
      },
      saved: true,
      remoteId: null,
      revision: stored.revision,
      libraryId: stored.id,
    });
    const fetchMock = vi.mocked(fetch);
    fetchMock
      .mockResolvedValueOnce(
        response([
          {
            id: stored.id,
            name: stored.name,
            revision: stored.revision,
            createdAt: stored.createdAt,
            updatedAt: stored.updatedAt,
          },
        ]),
      )
      .mockResolvedValueOnce(new Response(null, { status: 204 }));
    const { container } = render(<App />);

    expect(screen.getByLabelText('Componente da biblioteca: Sincronizado')).toBeTruthy();
    openLibrary();
    await screen.findByRole('dialog', { name: 'Minha biblioteca' });
    fireEvent.click(screen.getByRole('button', { name: `Excluir ${stored.name}` }));

    const deleteDialog = screen.getByRole('alertdialog', {
      name: 'Excluir componente da biblioteca?',
    });
    expect(deleteDialog.textContent).toContain('A aba que edita este componente');
    fireEvent.click(screen.getByRole('button', { name: 'Excluir da biblioteca' }));

    await waitFor(() => {
      expect(screen.getByLabelText('Rascunho local: Ainda não enviado ao servidor')).toBeTruthy();
    });
    const activeTab = container.querySelector<HTMLElement>('.document-tab.active');
    expect(activeTab?.textContent).toContain('Local');
    expect(activeTab?.textContent).toContain(stored.name);
  });

  it('trata conflito da biblioteca e cria uma cópia em nova aba', async () => {
    const stored = storedLibraryComponent({
      name: 'Componente em edição',
      revision: 2,
    });
    seedWorkspace([], {
      name: stored.name,
      circuit: {
        version: 1,
        components: stored.definition.components,
        wires: stored.definition.wires,
      },
      saved: false,
      remoteId: null,
      revision: 1,
      libraryId: stored.id,
    });
    const copy = storedLibraryComponent({
      id: 'library-copy',
      name: 'Minha versão',
      revision: 1,
    });
    const fetchMock = vi.mocked(fetch);
    fetchMock
      .mockResolvedValueOnce(
        response(
          {
            error: 'O componente foi alterado em outra aba.',
            definition: stored,
          },
          409,
        ),
      )
      .mockResolvedValueOnce(response(copy, 201));
    const { container } = render(<App />);

    fireEvent.keyDown(window, { key: 's', code: 'KeyS', ctrlKey: true });

    const conflict = await screen.findByRole('alertdialog', {
      name: 'Conflito em Componente em edição',
    });
    expect(conflict.textContent).toContain('versão mais nova na biblioteca');
    fireEvent.click(screen.getByRole('button', { name: 'Criar cópia…' }));

    expect(screen.getByRole('dialog', { name: 'Criar cópia na biblioteca' })).toBeTruthy();
    fireEvent.change(screen.getByRole('textbox', { name: 'Nome' }), {
      target: { value: 'Minha versão' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Criar cópia' }));

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledTimes(2);
      expect(screen.getByLabelText('Componente da biblioteca: Sincronizado')).toBeTruthy();
    });
    const tabs = Array.from(container.querySelectorAll<HTMLElement>('.document-tab'));
    const originalTab = tabs.find(
      (tab) => tab.querySelector('.document-tab-name')?.textContent === 'Componente em edição',
    );
    const copyTab = tabs.find(
      (tab) => tab.querySelector('.document-tab-name')?.textContent === 'Minha versão',
    );
    expect(originalTab).toBeTruthy();
    expect(copyTab?.classList.contains('active')).toBe(true);
    expect(fetchMock.mock.calls[1]?.[0]).toBe('/api/library');
    expect(fetchMock.mock.calls[1]?.[1]?.method).toBe('POST');
  });
});
