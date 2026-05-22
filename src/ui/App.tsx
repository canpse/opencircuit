import { ChangeEvent, useEffect, useMemo, useRef, useState } from 'react';
import { COMPONENT_DEFINITIONS } from '../core/catalog';
import { evaluateCircuit } from '../core/evaluateCircuit';
import type { CircuitDocument, GateType, LogicComponent, PinRef, Point, Wire } from '../core/types';
import { downloadJson, loadCircuit, saveCircuit, STARTER_CIRCUIT } from '../state/storage';
import { CircuitCanvas } from './editor/CircuitCanvas';

const GRID = 20;
const HISTORY_LIMIT = 100;

type Selection = { componentIds: string[]; wireIds: string[] };
type HistoryState = { past: CircuitDocument[]; future: CircuitDocument[] };
type ContextMenu =
  | { kind: 'canvas'; x: number; y: number; point: Point }
  | { kind: 'component'; x: number; y: number; componentId: string }
  | { kind: 'wire'; x: number; y: number; wireId: string }
  | null;

const EMPTY_SELECTION: Selection = { componentIds: [], wireIds: [] };

export function App() {
  const [circuit, setCircuit] = useState<CircuitDocument>(() => loadCircuit());
  const [selectedTool, setSelectedTool] = useState<GateType | 'select' | 'wire' | 'pan'>('select');
  const [pendingWire, setPendingWire] = useState<PinRef | null>(null);
  const [selection, setSelection] = useState<Selection>(EMPTY_SELECTION);
  const [history, setHistory] = useState<HistoryState>({ past: [], future: [] });
  const [contextMenu, setContextMenu] = useState<ContextMenu>(null);
  const [message, setMessage] = useState('Pronto para testar lógica.');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const evaluation = useMemo(() => evaluateCircuit(circuit), [circuit]);

  useEffect(() => {
    saveCircuit(circuit);
  }, [circuit]);

  useEffect(() => {
    function closeContextMenu() {
      setContextMenu(null);
    }

    window.addEventListener('click', closeContextMenu);
    window.addEventListener('resize', closeContextMenu);
    return () => {
      window.removeEventListener('click', closeContextMenu);
      window.removeEventListener('resize', closeContextMenu);
    };
  }, []);

  useEffect(() => {
    function releaseButtons() {
      setCircuit((current) => ({
        ...current,
        components: current.components.map((component) =>
          component.type === 'button' && component.state ? { ...component, state: false } : component,
        ),
      }));
    }

    window.addEventListener('mouseup', releaseButtons);
    window.addEventListener('blur', releaseButtons);
    return () => {
      window.removeEventListener('mouseup', releaseButtons);
      window.removeEventListener('blur', releaseButtons);
    };
  }, []);

  useEffect(() => {
    function isEditingText(target: EventTarget | null): boolean {
      const element = target as HTMLElement | null;
      return element?.tagName === 'INPUT' || element?.tagName === 'TEXTAREA' || Boolean(element?.isContentEditable);
    }

    function onSpaceDown(event: KeyboardEvent) {
      if (event.code !== 'Space' || event.repeat || isEditingText(event.target)) return;
      event.preventDefault();
      event.stopPropagation();

      const activeElement = document.activeElement as HTMLElement | null;
      if (activeElement?.tagName === 'BUTTON') activeElement.blur();

      setSelectedTool('pan');
      setMessage('Ferramenta Mão ativa.');
    }

    window.addEventListener('keydown', onSpaceDown, true);
    return () => {
      window.removeEventListener('keydown', onSpaceDown, true);
    };
  }, []);

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      const target = event.target as HTMLElement | null;
      const isEditingText = target?.tagName === 'INPUT' || target?.tagName === 'TEXTAREA' || target?.isContentEditable;
      if (isEditingText) return;

      if (event.key === 'Escape') {
        event.preventDefault();
        if (contextMenu) {
          setContextMenu(null);
          return;
        }
        const hadPendingWire = Boolean(pendingWire);
        setPendingWire(null);
        setSelectedTool('select');
        setMessage(hadPendingWire ? 'Conexão cancelada. Modo selecionar.' : 'Modo selecionar.');
        return;
      }

      const key = event.key.toLowerCase();
      const command = event.ctrlKey || event.metaKey;
      const isUndo = command && key === 'z' && !event.shiftKey;
      const isRedo = command && ((key === 'z' && event.shiftKey) || key === 'y');

      if (isUndo) {
        event.preventDefault();
        undo();
        return;
      }

      if (isRedo) {
        event.preventDefault();
        redo();
        return;
      }

      if (event.key !== 'Delete' && event.key !== 'Backspace') return;
      if (!hasSelection(selection)) return;

      event.preventDefault();
      removeSelection();
    }

    window.addEventListener('keydown', onKeyDown);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
    };
  }, [selection, pendingWire, history, circuit, contextMenu]);

  function rememberCircuit(snapshot: CircuitDocument = circuit) {
    setHistory((current) => ({
      past: [...current.past, snapshot].slice(-HISTORY_LIMIT),
      future: [],
    }));
  }

  function restoreCircuit(nextCircuit: CircuitDocument, nextMessage: string) {
    setCircuit(nextCircuit);
    setPendingWire(null);
    setSelection(EMPTY_SELECTION);
    setSelectedTool('select');
    setMessage(nextMessage);
  }

  function undo() {
    const previous = history.past[history.past.length - 1];
    if (!previous) {
      setMessage('Nada para desfazer.');
      return;
    }

    setHistory((current) => ({
      past: current.past.slice(0, -1),
      future: [circuit, ...current.future].slice(0, HISTORY_LIMIT),
    }));
    restoreCircuit(previous, 'Desfeito.');
  }

  function redo() {
    const next = history.future[0];
    if (!next) {
      setMessage('Nada para refazer.');
      return;
    }

    setHistory((current) => ({
      past: [...current.past, circuit].slice(-HISTORY_LIMIT),
      future: current.future.slice(1),
    }));
    restoreCircuit(next, 'Refeito.');
  }

  function openCanvasMenu(x: number, y: number, point: Point) {
    if (pendingWire) {
      setPendingWire(null);
      setSelectedTool('select');
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

  function addComponent(type: GateType, point: Point) {
    const snapped = snap(point);
    const id = nextId(type, circuit.components);
    const component: LogicComponent = {
      id,
      type,
      x: snapped.x,
      y: snapped.y,
      label: defaultLabel(type, id),
      state: type === 'input' || type === 'button' ? false : undefined,
    };
    rememberCircuit();
    setCircuit((current) => ({ ...current, components: [...current.components, component] }));
    setSelection({ componentIds: [id], wireIds: [] });
    setMessage(`${COMPONENT_DEFINITIONS[type].label} adicionado.`);
  }

  function addComponentFromContextMenu(type: GateType) {
    if (!contextMenu || contextMenu.kind !== 'canvas') return;
    addComponent(type, contextMenu.point);
    setContextMenu(null);
  }

  function beginMoveComponent() {
    rememberCircuit();
  }

  function moveComponents(moves: Array<{ componentId: string; point: Point }>) {
    const positions = new Map(
      moves.map((move) => [move.componentId, snap(move.point)]),
    );
    setCircuit((current) => ({
      ...current,
      components: current.components.map((component) => {
        const position = positions.get(component.id);
        return position ? { ...component, x: position.x, y: position.y } : component;
      }),
    }));
  }

  function toggleInput(componentId: string) {
    rememberCircuit();
    setCircuit((current) => ({
      ...current,
      components: current.components.map((component) =>
        component.id === componentId && component.type === 'input'
          ? { ...component, state: !component.state }
          : component,
      ),
    }));
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
      setSelectedTool('wire');
      setMessage('Agora clique em um pino de entrada.');
      return;
    }

    if (!pendingWire) {
      setMessage('Comece o fio clicando em uma saída.');
      return;
    }

    if (pendingWire.componentId === pin.componentId) {
      setMessage('Não conectei: origem e destino são o mesmo componente.');
      setPendingWire(null);
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
      setMessage(inputAlreadyUsed ? 'Entrada já conectada.' : 'Esse fio já existe.');
      setPendingWire(null);
      setSelectedTool('select');
      return;
    }

    const wire: Wire = { id: `W${Date.now()}`, from: pendingWire, to: pin };
    rememberCircuit();
    setCircuit((current) => ({ ...current, wires: [...current.wires, wire] }));
    setSelection({ componentIds: [], wireIds: [wire.id] });
    setMessage('Fio conectado.');
    setPendingWire(null);
    setSelectedTool('select');
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
    setMessage(count === 0 ? 'Nada selecionado.' : `${count} item(ns) selecionado(s).`);
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
      setSelectedTool('select');
    }
    setSelection(EMPTY_SELECTION);
    setMessage('Seleção removida.');
  }

  function cancelPendingWire() {
    if (!pendingWire) return;
    setSelectedTool('select');
    setPendingWire(null);
    setMessage('Conexão cancelada.');
  }

  function removeContextTarget() {
    if (!contextMenu || contextMenu.kind === 'canvas') return;
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

  function removeWire(wireId: string) {
    rememberCircuit();
    setCircuit((current) => ({ ...current, wires: current.wires.filter((wire) => wire.id !== wireId) }));
    setSelection((current) => ({
      componentIds: current.componentIds,
      wireIds: current.wireIds.filter((id) => id !== wireId),
    }));
    setMessage('Fio removido.');
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
      setSelectedTool('select');
    }
    setSelection((current) => ({
      componentIds: current.componentIds.filter((id) => id !== componentId),
      wireIds: [],
    }));
    setMessage('Componente removido.');
  }

  function resetCircuit() {
    rememberCircuit();
    setCircuit(STARTER_CIRCUIT);
    setPendingWire(null);
    setSelection(EMPTY_SELECTION);
    setSelectedTool('select');
    setMessage('Circuito de exemplo restaurado.');
  }

  function importJson(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    file.text()
      .then((text) => {
        const parsed = JSON.parse(text) as CircuitDocument;
        if (parsed.version !== 1 || !Array.isArray(parsed.components) || !Array.isArray(parsed.wires)) {
          throw new Error('Formato inválido');
        }
        rememberCircuit();
        setCircuit(parsed);
        setSelection(EMPTY_SELECTION);
        setMessage('Circuito importado.');
      })
      .catch(() => setMessage('Não foi possível importar esse JSON.'));
    event.target.value = '';
  }

  return (
    <main className="app-shell">
      <header className="topbar">
        <div>
          <p className="eyebrow">OpenCircuit Logic</p>
          <h1>Simulador de circuitos lógicos</h1>
        </div>
        <div className="actions">
          <button onClick={undo} disabled={history.past.length === 0}>Desfazer</button>
          <button onClick={redo} disabled={history.future.length === 0}>Refazer</button>
          <button onClick={() => downloadJson('circuito-logico.json', circuit)}>Exportar JSON</button>
          <button onClick={() => fileInputRef.current?.click()}>Importar JSON</button>
          <button onClick={resetCircuit}>Exemplo</button>
          <input ref={fileInputRef} type="file" accept="application/json" onChange={importJson} hidden />
        </div>
      </header>

      <section className="workspace">
        <aside className="toolbar" aria-label="Componentes">
          <button className={selectedTool === 'select' ? 'active' : ''} onClick={() => setSelectedTool('select')}>Selecionar</button>
          <button className={selectedTool === 'pan' ? 'active' : ''} onClick={() => setSelectedTool('pan')}>Mão</button>
          <button className={selectedTool === 'wire' ? 'active' : ''} onClick={() => setSelectedTool('wire')}>Fio</button>
          {LOGIC_COMPONENT_TOOLS.map((type) => (
            <button
              key={type}
              className={selectedTool === type ? 'active' : ''}
              draggable
              onClick={() => setSelectedTool(type)}
              onDragStart={(event) => event.dataTransfer.setData('application/opencircuit-gate', type)}
            >
              {COMPONENT_DEFINITIONS[type].label}
            </button>
          ))}
          <p className="hint">Arraste na grade para selecionar vários. Delete apaga; Ctrl+Z desfaz; Ctrl+Shift+Z refaz.</p>
        </aside>

        <div className="editor-panel">
          <CircuitCanvas
            circuit={circuit}
            evaluation={evaluation}
            selectedTool={selectedTool}
            pendingWire={pendingWire}
            selection={selection}
            onCanvasAdd={addComponent}
            onBeginMoveComponent={beginMoveComponent}
            onMoveComponents={moveComponents}
            onToggleInput={toggleInput}
            onSetButtonPressed={setButtonPressed}
            onPinClick={onPinClick}
            onRemoveWire={removeWire}
            onRemoveComponent={removeComponent}
            onCancelPendingWire={cancelPendingWire}
            onOpenCanvasMenu={openCanvasMenu}
            onOpenComponentMenu={openComponentMenu}
            onOpenWireMenu={openWireMenu}
            onSelectComponent={selectComponent}
            onSelectWire={selectWire}
            onSelectItems={selectItems}
            onClearSelection={clearSelection}
            onSelectTool={setSelectedTool}
          />
          <footer className="statusbar">
            <span>{message}</span>
            <span>{circuit.components.length} componentes · {circuit.wires.length} fios</span>
          </footer>
        </div>
      </section>

      {contextMenu && (
        <ContextMenuView
          menu={contextMenu}
          selection={selection}
          onAddComponent={addComponentFromContextMenu}
          onRemove={removeContextTarget}
        />
      )}
    </main>
  );
}

function ContextMenuView({ menu, selection, onAddComponent, onRemove }: {
  menu: NonNullable<ContextMenu>;
  selection: Selection;
  onAddComponent: (type: GateType) => void;
  onRemove: () => void;
}) {
  const selectedCount = selection.componentIds.length + selection.wireIds.length;
  const canRemove = menu.kind !== 'canvas';

  return (
    <div
      className="context-menu"
      style={{ left: menu.x, top: menu.y }}
      onClick={(event) => event.stopPropagation()}
      onMouseDown={(event) => event.stopPropagation()}
      role="menu"
    >
      {menu.kind === 'canvas' ? (
        <>
          <div className="context-menu-title">Adicionar</div>
          {LOGIC_COMPONENT_TOOLS.map((type) => (
            <button key={type} onClick={() => onAddComponent(type)} role="menuitem">
              {COMPONENT_DEFINITIONS[type].label}
            </button>
          ))}
        </>
      ) : (
        <button disabled={!canRemove} onClick={onRemove} role="menuitem">
          {selectedCount > 1 ? `Excluir seleção (${selectedCount})` : 'Excluir'}
        </button>
      )}
    </div>
  );
}

function hasSelection(selection: Selection): boolean {
  return selection.componentIds.length > 0 || selection.wireIds.length > 0;
}

function snap(point: Point): Point {
  return { x: Math.round(point.x / GRID) * GRID, y: Math.round(point.y / GRID) * GRID };
}

const LOGIC_COMPONENT_TOOLS: GateType[] = ['input', 'button', 'led', 'and', 'nand', 'or', 'nor', 'xor', 'xnor', 'not'];

function nextId(type: GateType, components: LogicComponent[]): string {
  const prefixByType: Record<GateType, string> = {
    input: 'I',
    button: 'P',
    led: 'L',
    and: 'A',
    nand: 'NA',
    or: 'O',
    nor: 'NO',
    xor: 'X',
    xnor: 'XN',
    not: 'N',
  };
  const prefix = prefixByType[type];
  let index = components.length + 1;
  let id = `${prefix}${index}`;
  const ids = new Set(components.map((component) => component.id));
  while (ids.has(id)) {
    index += 1;
    id = `${prefix}${index}`;
  }
  return id;
}

function defaultLabel(type: GateType, id: string): string {
  if (type === 'input') return id;
  if (type === 'button') return 'Pulso';
  if (type === 'led') return 'LED';
  return COMPONENT_DEFINITIONS[type].label;
}
