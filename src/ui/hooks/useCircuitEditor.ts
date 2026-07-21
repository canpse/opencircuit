import { useState, type SetStateAction } from 'react';
import type { CircuitDocument, GateType, PinRef, Point, Wire } from '../../core/types';
import {
  componentDefinitionLabel,
  createLogicComponent,
  hasSelection,
  moveComponentsWithWaypoints,
  nextId,
  pasteClipboard,
  snap,
  type CircuitClipboard,
} from '../app/editorUtils';
import type { Selection } from '../context-menu/ContextMenuView';
import { settleSequentialCircuit } from '../../core/evaluateCircuit';

const GRID = 20;
export const EMPTY_SELECTION: Selection = { componentIds: [], wireIds: [] };

interface Options {
  circuit: CircuitDocument;
  setCircuit: (action: SetStateAction<CircuitDocument>) => void;
  rememberCircuit: () => void;
  onMessage: (message: string) => void;
  onSelectTool: (tool: GateType | 'select' | 'wire' | 'pan') => void;
}

export function useCircuitEditor({
  circuit,
  setCircuit,
  rememberCircuit,
  onMessage,
  onSelectTool,
}: Options) {
  const [pendingWire, setPendingWire] = useState<PinRef | null>(null);
  const [selection, setSelection] = useState<Selection>(EMPTY_SELECTION);
  const [clipboard, setClipboard] = useState<CircuitClipboard | null>(null);

  function addComponent(type: GateType, point: Point) {
    const snapped = snap(point, GRID);
    const id = nextId(type, circuit.components);
    const component = createLogicComponent(type, id, snapped);
    rememberCircuit();
    setCircuit((current) => ({ ...current, components: [...current.components, component] }));
    setSelection({ componentIds: [id], wireIds: [] });
    onMessage(`${componentDefinitionLabel(type)} adicionado.`);
  }

  function beginMoveComponent() {
    rememberCircuit();
  }

  function moveComponents(moves: Array<{ componentId: string; point: Point }>) {
    setCircuit((current) => moveComponentsWithWaypoints(current, moves, GRID));
  }

  function toggleInput(componentId: string) {
    rememberCircuit();
    setCircuit((current) =>
      settleSequentialCircuit({
        ...current,
        components: current.components.map((component) =>
          component.id === componentId && component.type === 'input'
            ? { ...component, state: !component.state }
            : component,
        ),
      }),
    );
  }

  function setButtonPressed(componentId: string, pressed: boolean) {
    setCircuit((current) => ({
      ...current,
      components: current.components.map((component) =>
        component.id === componentId && component.type === 'button'
          ? { ...component, state: pressed }
          : component,
      ),
    }));
  }

  function onPinClick(pin: PinRef, kind: 'input' | 'output') {
    if (kind === 'output') {
      setPendingWire(pin);
      onSelectTool('wire');
      onMessage('Agora clique em um pino de entrada.');
      return;
    }

    if (!pendingWire) {
      onMessage('Comece o fio clicando em uma saída.');
      return;
    }

    const inputAlreadyUsed = circuit.wires.some(
      (wire) => wire.to.componentId === pin.componentId && wire.to.pinId === pin.pinId,
    );
    const duplicate = circuit.wires.some(
      (wire) =>
        wire.from.componentId === pendingWire.componentId &&
        wire.from.pinId === pendingWire.pinId &&
        wire.to.componentId === pin.componentId &&
        wire.to.pinId === pin.pinId,
    );

    if (inputAlreadyUsed || duplicate) {
      onMessage(inputAlreadyUsed ? 'Entrada já conectada.' : 'Esse fio já existe.');
      setPendingWire(null);
      onSelectTool('select');
      return;
    }

    const wire: Wire = { id: `W${Date.now()}`, from: pendingWire, to: pin };
    rememberCircuit();
    setCircuit((current) => ({ ...current, wires: [...current.wires, wire] }));
    setSelection({ componentIds: [], wireIds: [wire.id] });
    onMessage('Fio conectado.');
    setPendingWire(null);
    onSelectTool('select');
  }

  function clearSelection() {
    setSelection(EMPTY_SELECTION);
  }

  function selectComponent(componentId: string) {
    setSelection({ componentIds: [componentId], wireIds: [] });
  }

  function selectWire(wireId: string) {
    setSelection({ componentIds: [], wireIds: [wireId] });
  }

  function selectItems(nextSelection: Selection) {
    setSelection(nextSelection);
    const count = nextSelection.componentIds.length + nextSelection.wireIds.length;
    onMessage(count === 0 ? 'Nada selecionado.' : `${count} item(ns) selecionado(s).`);
  }

  function removeSelection() {
    if (!hasSelection(selection)) return;
    const componentIds = new Set(selection.componentIds);
    const wireIds = new Set(selection.wireIds);
    rememberCircuit();
    setCircuit((current) => ({
      ...current,
      components: current.components.filter((component) => !componentIds.has(component.id)),
      wires: current.wires.filter(
        (wire) =>
          !wireIds.has(wire.id) &&
          !componentIds.has(wire.from.componentId) &&
          !componentIds.has(wire.to.componentId),
      ),
    }));
    if (pendingWire && componentIds.has(pendingWire.componentId)) {
      setPendingWire(null);
      onSelectTool('select');
    }
    setSelection(EMPTY_SELECTION);
    onMessage('Seleção removida.');
  }

  function cancelPendingWire() {
    if (!pendingWire) return;
    onSelectTool('select');
    setPendingWire(null);
    onMessage('Conexão cancelada.');
  }

  function removeWire(wireId: string) {
    rememberCircuit();
    setCircuit((current) => ({
      ...current,
      wires: current.wires.filter((wire) => wire.id !== wireId),
    }));
    setSelection((current) => ({
      componentIds: current.componentIds,
      wireIds: current.wireIds.filter((id) => id !== wireId),
    }));
    onMessage('Fio removido.');
  }

  function toggleWireDisplay(wireId: string) {
    const currentWire = circuit.wires.find((wire) => wire.id === wireId);
    if (!currentWire) return;
    const showAsTunnel = currentWire.display !== 'tunnel';
    const usedLabels = new Set(
      circuit.wires
        .filter((wire) => wire.id !== wireId && wire.label)
        .map((wire) => wire.label!.toLocaleUpperCase()),
    );
    let generatedLabel = 'T1';
    for (let index = 1; usedLabels.has(generatedLabel); index += 1) {
      generatedLabel = `T${index + 1}`;
    }

    rememberCircuit();
    setCircuit((current) => ({
      ...current,
      wires: current.wires.map((wire) =>
        wire.id === wireId
          ? {
              ...wire,
              display: showAsTunnel ? 'tunnel' : 'wire',
              label: showAsTunnel ? wire.label || generatedLabel : wire.label,
            }
          : wire,
      ),
    }));
    onMessage(showAsTunnel ? 'Fio convertido em túnel.' : 'Túnel mostrado como fio.');
  }

  function renameWire(wireId: string, label: string) {
    const nextLabel = label.trim();
    const currentWire = circuit.wires.find((wire) => wire.id === wireId);
    if (!currentWire || !nextLabel || currentWire.label === nextLabel) return;
    rememberCircuit();
    setCircuit((current) => ({
      ...current,
      wires: current.wires.map((wire) =>
        wire.id === wireId ? { ...wire, label: nextLabel } : wire,
      ),
    }));
    onMessage(`Túnel renomeado para ${nextLabel}.`);
  }

  function addWireWaypoint(wireId: string, waypointIndex: number, point: Point) {
    const currentWire = circuit.wires.find((wire) => wire.id === wireId);
    if (!currentWire) return;
    rememberCircuit();
    setCircuit((current) => ({
      ...current,
      wires: current.wires.map((wire) =>
        wire.id === wireId
          ? {
              ...wire,
              waypoints: [
                ...(wire.waypoints ?? []).slice(0, waypointIndex),
                { ...point },
                ...(wire.waypoints ?? []).slice(waypointIndex),
              ],
            }
          : wire,
      ),
    }));
    setSelection({ componentIds: [], wireIds: [wireId] });
    onMessage('Ponto de controle adicionado.');
  }

  function beginMoveWireWaypoint() {
    rememberCircuit();
  }

  function moveWireWaypoint(wireId: string, waypointIndex: number, point: Point) {
    setCircuit((current) => ({
      ...current,
      wires: current.wires.map((wire) => {
        if (wire.id !== wireId || !wire.waypoints?.[waypointIndex]) return wire;
        return {
          ...wire,
          waypoints: wire.waypoints.map((waypoint, index) =>
            index === waypointIndex ? { ...point } : waypoint,
          ),
        };
      }),
    }));
  }

  function removeWireWaypoint(wireId: string, waypointIndex: number) {
    const currentWire = circuit.wires.find((wire) => wire.id === wireId);
    if (!currentWire?.waypoints?.[waypointIndex]) return;
    rememberCircuit();
    setCircuit((current) => ({
      ...current,
      wires: current.wires.map((wire) => {
        if (wire.id !== wireId || !wire.waypoints) return wire;
        const waypoints = wire.waypoints.filter((_, index) => index !== waypointIndex);
        return { ...wire, waypoints: waypoints.length > 0 ? waypoints : undefined };
      }),
    }));
    onMessage('Ponto de controle removido.');
  }

  function removeComponent(componentId: string) {
    rememberCircuit();
    setCircuit((current) => ({
      ...current,
      components: current.components.filter((component) => component.id !== componentId),
      wires: current.wires.filter(
        (wire) => wire.from.componentId !== componentId && wire.to.componentId !== componentId,
      ),
    }));
    if (pendingWire?.componentId === componentId) {
      setPendingWire(null);
      onSelectTool('select');
    }
    setSelection((current) => ({
      componentIds: current.componentIds.filter((id) => id !== componentId),
      wireIds: [],
    }));
    onMessage('Componente removido.');
  }

  function renameComponent(componentId: string, label: string) {
    const currentComponent = circuit.components.find((component) => component.id === componentId);
    if (!currentComponent || currentComponent.label === label) return;
    rememberCircuit();
    setCircuit((current) => ({
      ...current,
      components: current.components.map((component) =>
        component.id === componentId ? { ...component, label } : component,
      ),
    }));
    onMessage(`Componente renomeado para ${label}.`);
  }

  function resizeTextComponent(componentId: string, width: number) {
    setCircuit((current) => ({
      ...current,
      components: current.components.map((component) =>
        component.id === componentId && component.type === 'text'
          ? { ...component, width: snap({ x: width, y: 0 }, GRID).x }
          : component,
      ),
    }));
  }

  function onCopy() {
    if (selection.componentIds.length === 0 && selection.wireIds.length === 0) return;

    const copiedComponents = circuit.components.filter((c) =>
      selection.componentIds.includes(c.id),
    );
    const copiedWires = circuit.wires.filter((w) => selection.wireIds.includes(w.id));

    setClipboard({ components: copiedComponents, wires: copiedWires });
    onMessage(`${copiedComponents.length} portas e ${copiedWires.length} fios copiados.`);
  }

  function onPaste() {
    if (!clipboard) {
      onMessage('A área de transferência está vazia.');
      return;
    }

    rememberCircuit();

    const pasted = pasteClipboard(circuit, clipboard, { x: GRID * 2, y: GRID * 2 }, GRID);
    setCircuit(pasted.circuit);
    setSelection(pasted.selection);
    onMessage(
      `Colado ${pasted.selection.componentIds.length} portas e ${pasted.selection.wireIds.length} fios.`,
    );
  }

  return {
    pendingWire,
    setPendingWire,
    selection,
    setSelection,
    clipboard,
    addComponent,
    beginMoveComponent,
    moveComponents,
    toggleInput,
    setButtonPressed,
    onPinClick,
    clearSelection,
    selectComponent,
    selectWire,
    selectItems,
    removeSelection,
    cancelPendingWire,
    removeWire,
    toggleWireDisplay,
    renameWire,
    addWireWaypoint,
    beginMoveWireWaypoint,
    moveWireWaypoint,
    removeWireWaypoint,
    removeComponent,
    renameComponent,
    resizeTextComponent,
    onCopy,
    onPaste,
  };
}
