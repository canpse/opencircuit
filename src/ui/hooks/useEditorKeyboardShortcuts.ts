import { useEffect } from 'react';
import type { GateType } from '../../core/types';
import type { ContextMenu, Selection } from '../context-menu/ContextMenuView';

type EditorTool = GateType | 'select' | 'wire' | 'pan';

interface Options {
  selection: Selection;
  pendingWire: unknown;
  contextMenu: ContextMenu;
  hasSelection: (selection: Selection) => boolean;
  onCancelContextMenu: () => void;
  onCancelPendingWire: () => void;
  onSelectTool: (tool: EditorTool) => void;
  onMessage: (message: string) => void;
  onUndo: () => void;
  onRedo: () => void;
  onSave: () => void;
  onRemoveSelection: () => void;
}

export function useEditorKeyboardShortcuts({
  selection,
  pendingWire,
  contextMenu,
  hasSelection,
  onCancelContextMenu,
  onCancelPendingWire,
  onSelectTool,
  onMessage,
  onUndo,
  onRedo,
  onSave,
  onRemoveSelection,
}: Options) {
  useEffect(() => {
    function onSpaceDown(event: KeyboardEvent) {
      if (event.code !== 'Space' || event.repeat || isEditingText(event.target)) return;
      event.preventDefault();
      event.stopPropagation();

      const activeElement = document.activeElement as HTMLElement | null;
      if (activeElement?.tagName === 'BUTTON') activeElement.blur();

      onSelectTool('pan');
      onMessage('Ferramenta Mão ativa.');
    }

    window.addEventListener('keydown', onSpaceDown, true);
    return () => {
      window.removeEventListener('keydown', onSpaceDown, true);
    };
  }, [onMessage, onSelectTool]);

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (isEditingText(event.target)) return;

      if (event.key === 'Escape') {
        event.preventDefault();
        if (contextMenu) {
          onCancelContextMenu();
          return;
        }
        const hadPendingWire = Boolean(pendingWire);
        onCancelPendingWire();
        onSelectTool('select');
        onMessage(hadPendingWire ? 'Conexão cancelada. Modo selecionar.' : 'Modo selecionar.');
        return;
      }

      const key = event.key.toLowerCase();
      const command = event.ctrlKey || event.metaKey;
      const isUndo = command && key === 'z' && !event.shiftKey;
      const isRedo = command && ((key === 'z' && event.shiftKey) || key === 'y');
      const isSave = command && key === 's';

      if (isUndo) {
        event.preventDefault();
        onUndo();
        return;
      }

      if (isRedo) {
        event.preventDefault();
        onRedo();
        return;
      }

      if (isSave) {
        event.preventDefault();
        onSave();
        return;
      }

      if (event.key !== 'Delete' && event.key !== 'Backspace') return;
      if (!hasSelection(selection)) return;

      event.preventDefault();
      onRemoveSelection();
    }

    window.addEventListener('keydown', onKeyDown);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
    };
  }, [contextMenu, hasSelection, onCancelContextMenu, onCancelPendingWire, onMessage, onRedo, onRemoveSelection, onSave, onSelectTool, onUndo, pendingWire, selection]);
}

function isEditingText(target: EventTarget | null): boolean {
  const element = target as HTMLElement | null;
  return element?.tagName === 'INPUT' || element?.tagName === 'TEXTAREA' || Boolean(element?.isContentEditable);
}
