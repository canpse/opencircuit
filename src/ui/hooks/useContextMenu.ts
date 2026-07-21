import { useState, useCallback, type Dispatch, type SetStateAction } from 'react';
import type { GateType, PinRef, Point } from '../../core/types';
import type { ContextMenu, Selection } from '../context-menu/ContextMenuView';
import { hasSelection } from '../app/editorUtils';
import { useAutoCloseContextMenu } from './useAutoCloseContextMenu';

interface Options {
  selection: Selection;
  pendingWire: PinRef | null;
  setPendingWire: Dispatch<SetStateAction<PinRef | null>>;
  onSelectTool: (tool: GateType | 'select' | 'wire' | 'pan') => void;
  selectComponent: (id: string) => void;
  selectWire: (id: string) => void;
  addComponent: (type: GateType, point: Point) => void;
  removeSelection: () => void;
  removeComponent: (id: string) => void;
  removeWire: (id: string) => void;
  removeWireWaypoint: (wireId: string, waypointIndex: number) => void;
  toggleWireDisplay: (id: string) => void;
  setRenameRequest: Dispatch<SetStateAction<{ componentId: string; nonce: number } | null>>;
}

export function useContextMenuManager({
  selection,
  pendingWire,
  setPendingWire,
  onSelectTool,
  selectComponent,
  selectWire,
  addComponent,
  removeSelection,
  removeComponent,
  removeWire,
  removeWireWaypoint,
  toggleWireDisplay,
  setRenameRequest,
}: Options) {
  const [contextMenu, setContextMenu] = useState<ContextMenu>(null);

  const closeContextMenu = useCallback(() => setContextMenu(null), []);
  useAutoCloseContextMenu(closeContextMenu);

  function openCanvasMenu(x: number, y: number, point: Point) {
    if (pendingWire) {
      setPendingWire(null);
      onSelectTool('select');
    }
    setContextMenu({ kind: 'canvas', x, y, point });
  }

  function openComponentMenu(x: number, y: number, componentId: string) {
    if (!selection.componentIds.includes(componentId)) {
      selectComponent(componentId);
    }
    setContextMenu({ kind: 'component', x, y, componentId });
  }

  function openWireMenu(x: number, y: number, wireId: string) {
    if (!selection.wireIds.includes(wireId)) {
      selectWire(wireId);
    }
    setContextMenu({ kind: 'wire', x, y, wireId });
  }

  function openWaypointMenu(x: number, y: number, wireId: string, waypointIndex: number) {
    if (!selection.wireIds.includes(wireId)) {
      selectWire(wireId);
    }
    setContextMenu({ kind: 'waypoint', x, y, wireId, waypointIndex });
  }

  function addComponentFromContextMenu(type: GateType) {
    if (!contextMenu || contextMenu.kind !== 'canvas') return;
    addComponent(type, contextMenu.point);
    setContextMenu(null);
  }

  function renameContextTarget() {
    if (!contextMenu || contextMenu.kind !== 'component') return;
    setRenameRequest({ componentId: contextMenu.componentId, nonce: Date.now() });
    setContextMenu(null);
  }

  function removeContextTarget() {
    if (!contextMenu || contextMenu.kind === 'canvas') return;
    if (contextMenu.kind === 'waypoint') {
      removeWireWaypoint(contextMenu.wireId, contextMenu.waypointIndex);
      setContextMenu(null);
      return;
    }
    const targetIsSelected =
      contextMenu.kind === 'component'
        ? selection.componentIds.includes(contextMenu.componentId)
        : selection.wireIds.includes(contextMenu.wireId);

    if (targetIsSelected && hasSelection(selection)) {
      removeSelection();
    } else if (contextMenu.kind === 'component') {
      removeComponent(contextMenu.componentId);
    } else {
      removeWire(contextMenu.wireId);
    }
    setContextMenu(null);
  }

  function toggleWireContextTarget() {
    if (!contextMenu || contextMenu.kind !== 'wire') return;
    toggleWireDisplay(contextMenu.wireId);
    setContextMenu(null);
  }

  return {
    contextMenu,
    closeContextMenu,
    openCanvasMenu,
    openComponentMenu,
    openWireMenu,
    openWaypointMenu,
    addComponentFromContextMenu,
    renameContextTarget,
    toggleWireContextTarget,
    removeContextTarget,
  };
}
