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

    const addTab = screen.getByRole('button', { name: 'Novo circuito' });
    expect(container.querySelector('.add-tab')).toBe(addTab);
    fireEvent.click(addTab);

    expect(screen.getByText('Sem título 2')).toBeTruthy();
  });

  it('uses the same new-document command from tab button and menu', () => {
    render(<App />);

    fireEvent.click(screen.getByRole('button', { name: 'Novo circuito' }));
    expect(screen.getByText('Sem título 2')).toBeTruthy();

    fireEvent.click(screen.getByRole('button', { name: /Arquivo/ }));
    fireEvent.click(screen.getByRole('menuitem', { name: /Novo circuito/ }));
    expect(screen.getByText('Sem título 3')).toBeTruthy();
  });

  it('navigates command menus with arrows and restores focus on Escape', () => {
    render(<App />);
    const fileMenu = screen.getByRole('button', { name: /Arquivo/ });
    fileMenu.focus();

    fireEvent.keyDown(fileMenu, { key: 'ArrowDown' });

    const newDocument = screen.getByRole('menuitem', { name: /Novo circuito/ });
    expect(document.activeElement).toBe(newDocument);
    fireEvent.keyDown(newDocument, { key: 'ArrowDown' });
    expect(document.activeElement).toBe(screen.getByRole('menuitem', { name: /Meus circuitos/ }));

    fireEvent.keyDown(document.activeElement!, { key: 'Escape' });
    expect(screen.queryByRole('menu', { name: 'Arquivo' })).toBeNull();
    expect(document.activeElement).toBe(fileMenu);
  });

  it('toggles the hand tool through the Space shortcut', () => {
    render(<App />);
    const handTool = screen.getByRole('button', { name: 'Mão' });

    fireEvent.keyDown(window, { key: ' ', code: 'Space' });
    expect(handTool.classList.contains('active')).toBe(true);

    fireEvent.keyDown(window, { key: ' ', code: 'Space' });
    expect(handTool.classList.contains('active')).toBe(false);
  });

  it('does not steal Space from a focused button', () => {
    render(<App />);
    const handTool = screen.getByRole('button', { name: 'Mão' });
    const tickButton = screen.getByRole('button', { name: 'Tick' });
    tickButton.focus();

    fireEvent.keyDown(tickButton, { key: ' ', code: 'Space' });

    expect(handTool.classList.contains('active')).toBe(false);
  });

  it('suspends command shortcuts while editing text', () => {
    render(<App />);
    fireEvent.doubleClick(screen.getByRole('button', { name: 'circuito_logico.json' }));
    const renameInput = document.querySelector<HTMLInputElement>('.document-tab-rename');
    expect(renameInput).not.toBeNull();

    fireEvent.keyDown(renameInput!, { key: 'o', code: 'KeyO', ctrlKey: true });

    expect(screen.queryByRole('dialog', { name: 'Meus circuitos' })).toBeNull();
    fireEvent.keyDown(renameInput!, { key: 'Escape' });
  });

  it('opens shortcut help and suspends editor commands while the dialog is open', () => {
    render(<App />);
    const helpMenu = screen.getByRole('button', { name: /Ajuda/ });
    fireEvent.click(helpMenu);
    fireEvent.click(screen.getByRole('menuitem', { name: 'Atalhos e gestos' }));

    expect(screen.getByRole('dialog', { name: 'Atalhos e gestos' })).toBeTruthy();
    const close = screen.getByRole('button', { name: 'Fechar' });
    expect(document.activeElement).toBe(close);
    fireEvent.keyDown(close, { key: 'Tab' });
    expect(document.activeElement).toBe(close);
    fireEvent.keyDown(window, { key: 'o', code: 'KeyO', ctrlKey: true });
    expect(screen.queryByRole('dialog', { name: 'Meus circuitos' })).toBeNull();

    fireEvent.keyDown(window, { key: 'Escape' });
    expect(screen.queryByRole('dialog', { name: 'Atalhos e gestos' })).toBeNull();
    expect(document.activeElement).toBe(helpMenu);
  });

  it('keeps copy, paste and delete availability aligned with selection and clipboard', () => {
    const { container } = render(<App />);
    openExample(SIGNAL_EXAMPLE.id);

    fireEvent.click(screen.getByRole('button', { name: /Editar/ }));
    expect((screen.getByRole('menuitem', { name: /Copiar/ }) as HTMLButtonElement).disabled).toBe(
      true,
    );
    expect((screen.getByRole('menuitem', { name: /Colar/ }) as HTMLButtonElement).disabled).toBe(
      true,
    );
    fireEvent.keyDown(screen.getByRole('menuitem', { name: /Copiar/ }), { key: 'Escape' });

    const firstComponent = container.querySelector<SVGGElement>('.component');
    expect(firstComponent).not.toBeNull();
    fireEvent.contextMenu(firstComponent!, { clientX: 300, clientY: 300 });
    fireEvent.keyDown(screen.getByRole('menu'), { key: 'Escape' });

    fireEvent.click(screen.getByRole('button', { name: /Editar/ }));
    const copy = screen.getByRole('menuitem', { name: /Copiar/ }) as HTMLButtonElement;
    expect(copy.disabled).toBe(false);
    fireEvent.click(copy);

    fireEvent.click(screen.getByRole('button', { name: /Editar/ }));
    const paste = screen.getByRole('menuitem', { name: /Colar/ }) as HTMLButtonElement;
    expect(paste.disabled).toBe(false);
    fireEvent.click(paste);
    expect(container.querySelectorAll('.component')).toHaveLength(
      SIGNAL_EXAMPLE.circuit.components.length + 1,
    );

    fireEvent.click(screen.getByRole('button', { name: /Editar/ }));
    const remove = screen.getByRole('menuitem', {
      name: /Excluir seleção/,
    }) as HTMLButtonElement;
    expect(remove.disabled).toBe(false);
    fireEvent.click(remove);
    expect(container.querySelectorAll('.component')).toHaveLength(
      SIGNAL_EXAMPLE.circuit.components.length,
    );
  });

  it('adds and removes components and wires with Shift without losing the mixed selection', () => {
    const { container } = render(<App />);
    openExample(SIGNAL_EXAMPLE.id);

    const components = Array.from(container.querySelectorAll<SVGGElement>('g.component'));
    expect(components.length).toBeGreaterThanOrEqual(2);

    fireEvent.mouseDown(components[0], { button: 0, shiftKey: true });
    fireEvent.mouseDown(components[1], { button: 0, shiftKey: true });
    expect(container.querySelectorAll('g.component.selected')).toHaveLength(2);

    const wire = container.querySelector<SVGPathElement>('path.wire:not(.wire-trunk-stem)');
    expect(wire).not.toBeNull();
    fireEvent.click(wire!, { shiftKey: true });

    expect(container.querySelectorAll('g.component.selected')).toHaveLength(2);
    expect(wire!.classList.contains('selected')).toBe(true);
    expect(screen.getByText('2 componentes e 1 fio selecionados.')).toBeTruthy();

    fireEvent.mouseDown(components[0], { button: 0, shiftKey: true });
    expect(container.querySelectorAll('g.component.selected')).toHaveLength(1);
    expect(wire!.classList.contains('selected')).toBe(true);
  });

  it('uses Ctrl+A and the Edit menu to select everything in the current scope', () => {
    const { container } = render(<App />);
    fireEvent.click(screen.getByRole('button', { name: 'Novo circuito' }));

    fireEvent.click(screen.getByRole('button', { name: /Editar/ }));
    expect(
      (screen.getByRole('menuitem', { name: /Selecionar tudo/ }) as HTMLButtonElement).disabled,
    ).toBe(true);
    fireEvent.keyDown(screen.getByRole('menuitem', { name: /Selecionar tudo/ }), {
      key: 'Escape',
    });

    openExample(SIGNAL_EXAMPLE.id);
    fireEvent.keyDown(window, { key: 'a', code: 'KeyA', ctrlKey: true });

    expect(container.querySelectorAll('g.component.selected')).toHaveLength(
      SIGNAL_EXAMPLE.circuit.components.length,
    );
    expect(container.querySelectorAll('path.wire.selected')).toHaveLength(
      SIGNAL_EXAMPLE.circuit.wires.length,
    );

    fireEvent.click(container.querySelector('.canvas-bg')!);
    expect(container.querySelectorAll('.selected')).toHaveLength(0);

    fireEvent.click(screen.getByRole('button', { name: /Editar/ }));
    const selectAll = screen.getByRole('menuitem', {
      name: /Selecionar tudo/,
    }) as HTMLButtonElement;
    expect(selectAll.disabled).toBe(false);
    fireEvent.click(selectAll);
    expect(container.querySelectorAll('g.component.selected')).toHaveLength(
      SIGNAL_EXAMPLE.circuit.components.length,
    );
  });

  it('uses Escape first for the active tool and then to clear the selection', () => {
    const { container } = render(<App />);
    openExample(SIGNAL_EXAMPLE.id);
    fireEvent.keyDown(window, { key: 'a', code: 'KeyA', ctrlKey: true });
    fireEvent.keyDown(window, { key: ' ', code: 'Space' });

    const handTool = screen.getByRole('button', { name: 'Mão' });
    expect(handTool.classList.contains('active')).toBe(true);

    fireEvent.keyDown(window, { key: 'Escape' });
    expect(handTool.classList.contains('active')).toBe(false);
    expect(container.querySelectorAll('g.component.selected')).toHaveLength(
      SIGNAL_EXAMPLE.circuit.components.length,
    );

    fireEvent.keyDown(window, { key: 'Escape' });
    expect(container.querySelectorAll('.selected')).toHaveLength(0);
    expect(screen.getByText('Nada selecionado.')).toBeTruthy();
  });

  it('gives direct deletion an accessible name, keyboard activation and Undo', () => {
    const { container } = render(<App />);
    openExample(SIGNAL_EXAMPLE.id);
    const originalCount = SIGNAL_EXAMPLE.circuit.components.length;

    const removeButtons = screen.getAllByRole('button', { name: /^Excluir / });
    expect(removeButtons).toHaveLength(originalCount);
    fireEvent.keyDown(removeButtons[0], { key: 'Enter' });

    expect(container.querySelectorAll('g.component')).toHaveLength(originalCount - 1);
    expect(screen.getByText('Componente removido. Use Desfazer para restaurar.')).toBeTruthy();

    fireEvent.keyDown(window, { key: 'z', code: 'KeyZ', ctrlKey: true });
    expect(container.querySelectorAll('g.component')).toHaveLength(originalCount);
  });

  it('keeps Shift selection from toggling an Input and renames labels only on double click', () => {
    const { container } = render(<App />);
    openExample(SIGNAL_EXAMPLE.id);

    const inputAsset = container.querySelector<SVGImageElement>('image.input-asset');
    expect(inputAsset).not.toBeNull();
    const hrefBefore = inputAsset!.getAttribute('href');
    fireEvent.mouseDown(inputAsset!, { button: 0, shiftKey: true });
    fireEvent.click(inputAsset!, { shiftKey: true });
    expect(inputAsset!.getAttribute('href')).toBe(hrefBefore);
    expect(inputAsset!.closest('g.component')?.classList.contains('selected')).toBe(true);

    openExample(NOT_EXAMPLE.id);
    const editableLabel = container.querySelector<SVGTextElement>('.editable-label');
    expect(editableLabel).not.toBeNull();
    fireEvent.click(editableLabel!);
    expect(container.querySelector('.label-editor-object')).toBeNull();

    fireEvent.doubleClick(editableLabel!);
    expect(container.querySelector('.label-editor-object input')).not.toBeNull();
  });

  it('shares zoom execution between keyboard, controls and menu', () => {
    render(<App />);
    const zoomReset = screen.getByRole('button', { name: 'Restaurar zoom a 100%' });
    expect(zoomReset.textContent).toBe('100%');

    fireEvent.keyDown(window, { key: '=', code: 'Equal', ctrlKey: true });
    expect(zoomReset.textContent).toBe('120%');

    fireEvent.click(screen.getByRole('button', { name: 'Afastar' }));
    expect(zoomReset.textContent).toBe('100%');

    fireEvent.click(screen.getByRole('button', { name: /Exibir/ }));
    fireEvent.click(screen.getByRole('menuitem', { name: /Aproximar/ }));
    expect(zoomReset.textContent).toBe('120%');
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
    expect(screen.getByRole('button', { name: 'Salvar no servidor e fechar…' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Descartar' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Cancelar' })).toBeTruthy();
  });

  it('faz o primeiro salvamento com nome explícito sem alterar o catálogo embutido', async () => {
    const catalogBefore = JSON.stringify(SIGNAL_EXAMPLE.circuit);
    const fetchMock = vi.mocked(fetch);
    fetchMock.mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          id: 'remote-example',
          ownerId: 'owner-test',
          name: 'Minha primeira aula',
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
    const dialog = screen.getByRole('dialog', { name: 'Salvar no servidor' });
    expect(dialog.textContent).toContain('a aba atual ficará vinculada');
    const nameInput = screen.getByRole('textbox', { name: 'Nome' });
    expect((nameInput as HTMLInputElement).value).toBe(SIGNAL_EXAMPLE.name);

    fireEvent.change(nameInput, { target: { value: 'Minha primeira aula.json' } });
    fireEvent.click(screen.getByRole('button', { name: 'Salvar e vincular aba' }));
    expect(screen.getByRole('alert').textContent).toContain('sem .json');
    expect(fetchMock).not.toHaveBeenCalled();

    fireEvent.change(nameInput, { target: { value: 'Minha primeira aula' } });
    fireEvent.click(screen.getByRole('button', { name: 'Salvar e vincular aba' }));

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledTimes(1);
      expect(documentTab(container, 'Minha primeira aula').textContent).toContain('Servidor');
      expect(screen.getByLabelText('Circuito no servidor: Sincronizado')).toBeTruthy();
    });
    const [path, request] = fetchMock.mock.calls[0]!;
    expect(path).toBe('/api/circuits');
    expect(request?.method).toBe('POST');
    const body = JSON.parse(String(request?.body)) as {
      name: string;
      circuit: unknown;
    };
    expect(body.name).toBe('Minha primeira aula');
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

  it('creates, renames and safely deletes an unused subcircuit definition', () => {
    const { container } = render(<App />);

    expect(screen.getByRole('navigation', { name: 'Escopo de edição' }).textContent).toContain(
      'Circuito principal',
    );
    fireEvent.click(screen.getByRole('button', { name: 'Nova definição' }));

    const createDialog = screen.getByRole('dialog', {
      name: 'Nova definição de subcircuito',
    });
    const nameInput = screen.getByRole('textbox', { name: 'Nome' });
    expect(document.activeElement).toBe(nameInput);
    fireEvent.click(screen.getByRole('button', { name: 'Criar e editar' }));
    expect(screen.getByRole('alert').textContent).toContain('Informe um nome');

    fireEvent.change(nameInput, { target: { value: '  Unidade lógica  ' } });
    fireEvent.submit(createDialog.querySelector('form')!);

    expect(screen.getByRole('navigation', { name: 'Escopo de edição' }).textContent).toContain(
      'Unidade lógica',
    );
    expect(screen.getByText('Unidade lógica está vazio.')).toBeTruthy();
    expect(screen.getByLabelText('Como criar o subcircuito').textContent).toContain(
      'Input, Clock e Bus In 4 criam entradas externas',
    );
    expect(container.querySelector('.definition-usage.orphan')?.textContent).toBe('sem uso');

    fireEvent.click(screen.getByRole('button', { name: 'Renomear' }));
    const renameInput = screen.getByRole('textbox', { name: 'Nome' });
    expect(renameInput.getAttribute('value')).toBe('Unidade lógica');
    fireEvent.change(renameInput, { target: { value: 'ULA' } });
    fireEvent.click(
      screen
        .getByRole('dialog', { name: 'Renomear subcircuito' })
        .querySelector<HTMLButtonElement>('button[type="submit"]')!,
    );
    expect(screen.getByText('ULA está vazio.')).toBeTruthy();

    fireEvent.click(screen.getByRole('button', { name: 'Excluir' }));
    expect(screen.getByRole('dialog', { name: 'Excluir subcircuito?' }).textContent).toContain(
      'não é usada',
    );
    fireEvent.click(screen.getByRole('button', { name: 'Excluir definição' }));

    expect(screen.queryByRole('button', { name: 'ULA' })).toBeNull();
    expect(screen.getByText('Nenhuma definição')).toBeTruthy();
    expect(screen.getByText(/Use Desfazer para restaurar/)).toBeTruthy();
  });

  it('transforms a selection through the visible command and blocks deletion while used', () => {
    const { container } = render(<App />);
    const transformButton = screen.getByRole('button', { name: 'Transformar seleção' });

    expect((transformButton as HTMLButtonElement).disabled).toBe(true);
    expect(transformButton.getAttribute('title')).toContain('Selecione ao menos um componente');

    openExample(SIGNAL_EXAMPLE.id);
    const firstComponent = container.querySelector<SVGGElement>('g.component');
    expect(firstComponent).not.toBeNull();
    fireEvent.contextMenu(firstComponent!, { clientX: 300, clientY: 300 });
    fireEvent.keyDown(screen.getByRole('menu'), { key: 'Escape' });

    expect((transformButton as HTMLButtonElement).disabled).toBe(false);
    fireEvent.click(transformButton);
    expect(
      screen.getByRole('dialog', { name: 'Transformar seleção em subcircuito' }).textContent,
    ).toContain('1 componente selecionado');
    fireEvent.change(screen.getByRole('textbox', { name: 'Nome' }), {
      target: { value: 'Bloco reutilizável' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Transformar' }));

    expect(screen.getByTitle('Editar Bloco reutilizável')).toBeTruthy();
    expect(container.querySelector('.definition-usage')?.textContent).toBe('1');

    fireEvent.click(screen.getByTitle('Editar Bloco reutilizável'));
    fireEvent.click(screen.getByRole('button', { name: 'Excluir' }));
    const blockedDialog = screen.getByRole('alertdialog', {
      name: 'Não é possível excluir',
    });
    expect(blockedDialog.textContent).toContain('Circuito principal: 1 instância');
    expect(screen.queryByRole('button', { name: 'Excluir definição' })).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'Fechar' }));

    fireEvent.click(screen.getByRole('button', { name: 'Renomear' }));
    fireEvent.change(screen.getByRole('textbox', { name: 'Nome' }), {
      target: { value: 'Bloco atualizado' },
    });
    fireEvent.submit(
      screen.getByRole('dialog', { name: 'Renomear subcircuito' }).querySelector('form')!,
    );

    fireEvent.click(screen.getByRole('button', { name: 'Circuito principal' }));
    const instance = Array.from(container.querySelectorAll<SVGGElement>('g.component')).find(
      (component) => component.textContent?.includes('Bloco atualizado'),
    );
    expect(instance).toBeTruthy();
    fireEvent.contextMenu(instance!, { clientX: 300, clientY: 300 });
    fireEvent.click(screen.getByRole('menuitem', { name: 'Editar subcircuito' }));

    expect(screen.getByRole('navigation', { name: 'Escopo de edição' }).textContent).toContain(
      'Bloco atualizado',
    );
    expect(screen.getByTitle('Editar Bloco atualizado')).toBeTruthy();
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
    expect(footerText).toContain('Proteção local: falhou');
    expect(footerText).toContain('Rascunho local: ainda não enviado ao servidor');

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
        'Proteção local: recuperada',
      );
    });
  });
});
