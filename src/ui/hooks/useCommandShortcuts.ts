import { useEffect } from 'react';
import {
  COMMAND_DEFINITIONS,
  matchesShortcut,
  type EditorCommandMap,
  type ShortcutSpec,
} from '../commands/editorCommands';

export function useCommandShortcuts(
  commands: EditorCommandMap,
  { suspended }: { suspended: boolean },
) {
  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (suspended || isEditableTarget(event.target) || isMenuOrDialogTarget(event.target)) return;

      for (const definition of COMMAND_DEFINITIONS) {
        const shortcut = definition.shortcuts.find((candidate) =>
          matchesShortcut(event, candidate),
        );
        if (!shortcut || shouldSuppressBareShortcut(event.target, shortcut)) continue;

        event.preventDefault();
        commands[definition.id].run();
        return;
      }
    }

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [commands, suspended]);
}

export function isEditableTarget(target: EventTarget | null): boolean {
  const element = target as HTMLElement | null;
  return Boolean(
    element?.closest?.('input, textarea, select, [contenteditable]:not([contenteditable="false"])'),
  );
}

function isMenuOrDialogTarget(target: EventTarget | null): boolean {
  const element = target as HTMLElement | null;
  return Boolean(element?.closest?.('[data-command-menu="true"], [aria-modal="true"]'));
}

function shouldSuppressBareShortcut(target: EventTarget | null, shortcut: ShortcutSpec): boolean {
  if (shortcut.primary || shortcut.alt) return false;
  if (shortcut.key === 'Escape') return false;
  const element = target as HTMLElement | null;
  return Boolean(element?.closest?.('button, a[href], [role="button"], [role="tab"]'));
}
