import { useEffect } from 'react';
import type { GateType } from '../../core/types';
import type { ContextMenu, Selection } from '../context-menu/ContextMenuView';

type EditorTool = GateType | 'select' | 'wire' | 'pan';

interface Options {
  selection: Selection;
  pendingWire: unknown;
  contextMenu: ContextMenu;
  dialogOpen: boolean;
  hasSelection: (selection: Selection) => boolean;
  onCancelContextMenu: () => void;
  onCancelPendingWire: () => void;
  onSelectTool: (tool: EditorTool) => void;
  onMessage: (message: string) => void;
  onUndo: () => void;
  onRedo: () => void;
  onSave: () => void;
  onSaveAs: () => void;
  onOpen: () => void;
  onRemoveSelection: () => void;
  onCopy: () => void;
  onPaste: () => void;
}

export function useEditorKeyboardShortcuts({
  selection,
  pendingWire,
  contextMenu,
  dialogOpen,
  hasSelection,
  onCancelContextMenu,
  onCancelPendingWire,
  onSelectTool,
  onMessage,
  onUndo,
  onRedo,
  onSave,
  onSaveAs,
  onOpen,
  onRemoveSelection,
  onCopy,
  onPaste,
}: Options) {
  useEffect(() => {
    function onSpaceDown(event: KeyboardEvent) {
      if (dialogOpen) return;
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
  }, [dialogOpen, onMessage, onSelectTool]);

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      // Com um diálogo modal aberto, o teclado pertence ao diálogo.
      if (dialogOpen) return;
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
      const isSaveAs = command && key === 's' && event.shiftKey;
      const isSave = command && key === 's' && !event.shiftKey;
      const isOpen = command && key === 'o';
      const isCopy = command && key === 'c';
      const isPaste = command && key === 'v';

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

      if (isSaveAs) {
        event.preventDefault();
        onSaveAs();
        return;
      }

      if (isSave) {
        event.preventDefault();
        onSave();
        return;
      }

      if (isOpen) {
        event.preventDefault();
        onOpen();
        return;
      }

      if (isCopy) {
        event.preventDefault();
        onCopy();
        return;
      }

      if (isPaste) {
        event.preventDefault();
        onPaste();
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
  }, [
    contextMenu,
    dialogOpen,
    hasSelection,
    onCancelContextMenu,
    onCancelPendingWire,
    onMessage,
    onRedo,
    onRemoveSelection,
    onSave,
    onSaveAs,
    onOpen,
    onCopy,
    onPaste,
    onSelectTool,
    onUndo,
    pendingWire,
    selection,
  ]);
}

function isEditingText(target: EventTarget | null): boolean {
  const element = target as HTMLElement | null;
  return (
    element?.tagName === 'INPUT' ||
    element?.tagName === 'TEXTAREA' ||
    Boolean(element?.isContentEditable)
  );
}
