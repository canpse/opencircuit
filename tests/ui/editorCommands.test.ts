// @vitest-environment jsdom

import { describe, expect, it, vi } from 'vitest';
import {
  COMMAND_DEFINITIONS,
  COMMAND_MENU_GROUPS,
  commandShortcutLabel,
  createEditorCommands,
  matchesShortcut,
  type EditorCommandBindings,
} from '../../src/ui/commands/editorCommands';

function keyboardEvent(key: string, init: Omit<KeyboardEventInit, 'key'> = {}): KeyboardEvent {
  return new KeyboardEvent('keydown', { key, ...init });
}

function noopBindings(): EditorCommandBindings {
  return Object.fromEntries(
    COMMAND_DEFINITIONS.map((definition) => [definition.id, { run: vi.fn() }]),
  ) as unknown as EditorCommandBindings;
}

describe('editor command catalog', () => {
  it('mantém IDs únicos e menus apontando apenas para comandos existentes', () => {
    const ids = COMMAND_DEFINITIONS.map((definition) => definition.id);
    expect(new Set(ids).size).toBe(ids.length);

    const menuIds = COMMAND_MENU_GROUPS.flatMap((group) =>
      group.entries.filter((entry) => !entry.startsWith('separator:')),
    );
    expect(menuIds.every((id) => ids.includes(id as (typeof ids)[number]))).toBe(true);
  });

  it('reconhece Ctrl e Command como modificador primário', () => {
    const shortcut = COMMAND_DEFINITIONS.find((definition) => definition.id === 'file.save')!
      .shortcuts[0]!;

    expect(matchesShortcut(keyboardEvent('s', { ctrlKey: true }), shortcut)).toBe(true);
    expect(matchesShortcut(keyboardEvent('s', { metaKey: true }), shortcut)).toBe(true);
    expect(matchesShortcut(keyboardEvent('s'), shortcut)).toBe(false);
  });

  it('aceita as duas formas de refazer e as variantes de aproximar', () => {
    const redo = COMMAND_DEFINITIONS.find((definition) => definition.id === 'edit.redo')!;
    const zoomIn = COMMAND_DEFINITIONS.find((definition) => definition.id === 'view.zoomIn')!;

    expect(
      redo.shortcuts.some((shortcut) =>
        matchesShortcut(keyboardEvent('z', { ctrlKey: true, shiftKey: true }), shortcut),
      ),
    ).toBe(true);
    expect(
      redo.shortcuts.some((shortcut) =>
        matchesShortcut(keyboardEvent('y', { ctrlKey: true }), shortcut),
      ),
    ).toBe(true);
    expect(
      zoomIn.shortcuts.some((shortcut) =>
        matchesShortcut(keyboardEvent('=', { ctrlKey: true }), shortcut),
      ),
    ).toBe(true);
    expect(
      zoomIn.shortcuts.some((shortcut) =>
        matchesShortcut(keyboardEvent('+', { ctrlKey: true, shiftKey: true }), shortcut),
      ),
    ).toBe(true);
  });

  it('formata atalhos de acordo com a plataforma', () => {
    const save = COMMAND_DEFINITIONS.find((definition) => definition.id === 'file.save')!;
    expect(commandShortcutLabel(save, 'Linux x86_64')).toBe('Ctrl+S');
    expect(commandShortcutLabel(save, 'MacIntel')).toBe('⌘+S');
  });

  it('não executa bindings desabilitados', () => {
    const bindings = noopBindings();
    const run = vi.fn();
    bindings['edit.copy'] = { run, enabled: false };
    const commands = createEditorCommands(bindings);

    commands['edit.copy'].run();

    expect(run).not.toHaveBeenCalled();
    expect(commands['edit.copy'].enabled).toBe(false);
  });
});
