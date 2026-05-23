import { ChangeEvent, useEffect, useMemo, useRef, useState } from 'react';
import { COMPONENT_DEFINITIONS } from '../core/catalog';
import { evaluateCircuit } from '../core/evaluateCircuit';
import type { CircuitDocument, GateType, LogicComponent, PinRef, Point, Wire } from '../core/types';
import { downloadJson, loadCircuit, saveCircuit, STARTER_CIRCUIT } from '../state/storage';
import andGateAsset from '../assets/components/and_gate.png';
import inputSwitchOffAsset from '../assets/components/input_switch_off.png';
import ledOffAsset from '../assets/components/led_off.png';
import nandGateAsset from '../assets/components/nand_gate.png';
import norGateAsset from '../assets/components/nor_gate.png';
import notGateAsset from '../assets/components/not_gate.png';
import orGateAsset from '../assets/components/or_gate.png';
import outputPortAsset from '../assets/components/output_port.png';
import xnorGateAsset from '../assets/components/xnor_gate.png';
import xorGateAsset from '../assets/components/xor_gate.png';
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
const COMPONENT_TOOL_ASSETS: Partial<Record<GateType, string>> = {
  input: inputSwitchOffAsset,
  button: outputPortAsset,
  led: ledOffAsset,
  and: andGateAsset,
  nand: nandGateAsset,
  or: orGateAsset,
  nor: norGateAsset,
  xor: xorGateAsset,
  xnor: xnorGateAsset,
  not: notGateAsset,
};

const TOOL_GROUPS: Array<{ title: string; tools: GateType[] }> = [
  { title: 'Entradas', tools: ['input', 'button'] },
  { title: 'Saídas', tools: ['led'] },
  { title: 'Portas Lógicas', tools: ['and', 'nand', 'or', 'nor', 'xor', 'xnor', 'not'] },
];

const CIRCUIT_EXAMPLES: Array<{ id: string; name: string; circuit: CircuitDocument }> = [
  {
    id: 'xor',
    name: 'XOR básico',
    circuit: {
      version: 1,
      components: [
        { id: 'A', type: 'input', x: 80, y: 100, label: 'A', state: false },
        { id: 'B', type: 'input', x: 80, y: 190, label: 'B', state: false },
        { id: 'X1', type: 'xor', x: 250, y: 130, label: 'XOR' },
        { id: 'OUT', type: 'led', x: 430, y: 139, label: 'OUT' },
      ],
      wires: [
        { id: 'W1', from: { componentId: 'A', pinId: 'out' }, to: { componentId: 'X1', pinId: 'a' } },
        { id: 'W2', from: { componentId: 'B', pinId: 'out' }, to: { componentId: 'X1', pinId: 'b' } },
        { id: 'W3', from: { componentId: 'X1', pinId: 'out' }, to: { componentId: 'OUT', pinId: 'in' } },
      ],
    },
  },
  {
    id: 'nand-not',
    name: 'NAND como NOT',
    circuit: {
      version: 1,
      components: [
        { id: 'A', type: 'input', x: 80, y: 140, label: 'A', state: false },
        { id: 'N1', type: 'nand', x: 250, y: 130, label: 'NAND' },
        { id: 'OUT', type: 'led', x: 450, y: 139, label: 'OUT' },
      ],
      wires: [
        { id: 'W1', from: { componentId: 'A', pinId: 'out' }, to: { componentId: 'N1', pinId: 'a' } },
        { id: 'W2', from: { componentId: 'A', pinId: 'out' }, to: { componentId: 'N1', pinId: 'b' } },
        { id: 'W3', from: { componentId: 'N1', pinId: 'out' }, to: { componentId: 'OUT', pinId: 'in' } },
      ],
    },
  },
  {
    id: 'half-adder',
    name: 'Meio somador',
    circuit: {
      version: 1,
      components: [
        { id: 'A', type: 'input', x: 80, y: 110, label: 'A', state: false },
        { id: 'B', type: 'input', x: 80, y: 210, label: 'B', state: false },
        { id: 'X1', type: 'xor', x: 250, y: 105, label: 'SUM' },
        { id: 'A1', type: 'and', x: 250, y: 220, label: 'CARRY' },
        { id: 'SUM', type: 'led', x: 450, y: 114, label: 'SUM' },
        { id: 'CARRY', type: 'led', x: 450, y: 229, label: 'CARRY' },
      ],
      wires: [
        { id: 'W1', from: { componentId: 'A', pinId: 'out' }, to: { componentId: 'X1', pinId: 'a' } },
        { id: 'W2', from: { componentId: 'B', pinId: 'out' }, to: { componentId: 'X1', pinId: 'b' } },
        { id: 'W3', from: { componentId: 'A', pinId: 'out' }, to: { componentId: 'A1', pinId: 'a' } },
        { id: 'W4', from: { componentId: 'B', pinId: 'out' }, to: { componentId: 'A1', pinId: 'b' } },
        { id: 'W5', from: { componentId: 'X1', pinId: 'out' }, to: { componentId: 'SUM', pinId: 'in' } },
        { id: 'W6', from: { componentId: 'A1', pinId: 'out' }, to: { componentId: 'CARRY', pinId: 'in' } },
      ],
    },
  },
  {
    id: 'full-adder',
    name: 'Somador completo',
    circuit: {
      version: 1,
      components: [
        { id: 'A', type: 'input', x: 70, y: 80, label: 'A', state: false },
        { id: 'B', type: 'input', x: 70, y: 170, label: 'B', state: false },
        { id: 'Cin', type: 'input', x: 70, y: 310, label: 'Cin', state: false },
        { id: 'X1', type: 'xor', x: 240, y: 120, label: 'A⊕B' },
        { id: 'X2', type: 'xor', x: 430, y: 160, label: 'SUM' },
        { id: 'A1', type: 'and', x: 240, y: 250, label: 'A·B' },
        { id: 'A2', type: 'and', x: 430, y: 300, label: 'Cin·(A⊕B)' },
        { id: 'O1', type: 'or', x: 620, y: 275, label: 'Cout' },
        { id: 'SUM', type: 'led', x: 640, y: 169, label: 'SUM' },
        { id: 'Cout', type: 'led', x: 800, y: 284, label: 'Cout' },
      ],
      wires: [
        { id: 'W1', from: { componentId: 'A', pinId: 'out' }, to: { componentId: 'X1', pinId: 'a' } },
        { id: 'W2', from: { componentId: 'B', pinId: 'out' }, to: { componentId: 'X1', pinId: 'b' } },
        { id: 'W3', from: { componentId: 'X1', pinId: 'out' }, to: { componentId: 'X2', pinId: 'a' } },
        { id: 'W4', from: { componentId: 'Cin', pinId: 'out' }, to: { componentId: 'X2', pinId: 'b' } },
        { id: 'W5', from: { componentId: 'X2', pinId: 'out' }, to: { componentId: 'SUM', pinId: 'in' } },
        { id: 'W6', from: { componentId: 'A', pinId: 'out' }, to: { componentId: 'A1', pinId: 'a' } },
        { id: 'W7', from: { componentId: 'B', pinId: 'out' }, to: { componentId: 'A1', pinId: 'b' } },
        { id: 'W8', from: { componentId: 'X1', pinId: 'out' }, to: { componentId: 'A2', pinId: 'a' } },
        { id: 'W9', from: { componentId: 'Cin', pinId: 'out' }, to: { componentId: 'A2', pinId: 'b' } },
        { id: 'W10', from: { componentId: 'A1', pinId: 'out' }, to: { componentId: 'O1', pinId: 'a' } },
        { id: 'W11', from: { componentId: 'A2', pinId: 'out' }, to: { componentId: 'O1', pinId: 'b' } },
        { id: 'W12', from: { componentId: 'O1', pinId: 'out' }, to: { componentId: 'Cout', pinId: 'in' } },
      ],
    },
  },
  {
    id: 'mux-2-1',
    name: 'Multiplexador 2:1',
    circuit: {
      version: 1,
      components: [
        { id: 'A', type: 'input', x: 70, y: 80, label: 'A', state: false },
        { id: 'B', type: 'input', x: 70, y: 220, label: 'B', state: false },
        { id: 'Sel', type: 'input', x: 70, y: 360, label: 'Sel', state: false },
        { id: 'N1', type: 'not', x: 240, y: 340, label: 'NOT Sel' },
        { id: 'A1', type: 'and', x: 420, y: 105, label: 'A·!Sel' },
        { id: 'A2', type: 'and', x: 420, y: 250, label: 'B·Sel' },
        { id: 'O1', type: 'or', x: 620, y: 180, label: 'OUT' },
        { id: 'OUT', type: 'led', x: 800, y: 189, label: 'OUT' },
      ],
      wires: [
        { id: 'W1', from: { componentId: 'Sel', pinId: 'out' }, to: { componentId: 'N1', pinId: 'in' } },
        { id: 'W2', from: { componentId: 'A', pinId: 'out' }, to: { componentId: 'A1', pinId: 'a' } },
        { id: 'W3', from: { componentId: 'N1', pinId: 'out' }, to: { componentId: 'A1', pinId: 'b' } },
        { id: 'W4', from: { componentId: 'B', pinId: 'out' }, to: { componentId: 'A2', pinId: 'a' } },
        { id: 'W5', from: { componentId: 'Sel', pinId: 'out' }, to: { componentId: 'A2', pinId: 'b' } },
        { id: 'W6', from: { componentId: 'A1', pinId: 'out' }, to: { componentId: 'O1', pinId: 'a' } },
        { id: 'W7', from: { componentId: 'A2', pinId: 'out' }, to: { componentId: 'O1', pinId: 'b' } },
        { id: 'W8', from: { componentId: 'O1', pinId: 'out' }, to: { componentId: 'OUT', pinId: 'in' } },
      ],
    },
  },
];

export function App() {
  const [circuit, setCircuit] = useState<CircuitDocument>(() => loadCircuit());
  const [selectedTool, setSelectedTool] = useState<GateType | 'select' | 'wire' | 'pan'>('select');
  const [pendingWire, setPendingWire] = useState<PinRef | null>(null);
  const [selection, setSelection] = useState<Selection>(EMPTY_SELECTION);
  const [history, setHistory] = useState<HistoryState>({ past: [], future: [] });
  const [contextMenu, setContextMenu] = useState<ContextMenu>(null);
  const [message, setMessage] = useState('Pronto para testar lógica.');
  const [truthPanelWidth, setTruthPanelWidth] = useState(320);
  const [resizingTruthPanel, setResizingTruthPanel] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const evaluation = useMemo(() => evaluateCircuit(circuit), [circuit]);

  useEffect(() => {
    saveCircuit(circuit);
  }, [circuit]);

  useEffect(() => {
    if (!resizingTruthPanel) return;

    function onMouseMove(event: globalThis.MouseEvent) {
      const nextWidth = Math.min(620, Math.max(260, window.innerWidth - event.clientX));
      setTruthPanelWidth(nextWidth);
    }

    function onMouseUp() {
      setResizingTruthPanel(false);
    }

    document.body.classList.add('resizing-panel');
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
    return () => {
      document.body.classList.remove('resizing-panel');
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
    };
  }, [resizingTruthPanel]);

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
    setMessage(`Componente renomeado para ${label}.`);
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

  function loadExample(exampleId: string) {
    const example = CIRCUIT_EXAMPLES.find((candidate) => candidate.id === exampleId);
    if (!example) return;
    rememberCircuit();
    setCircuit(cloneCircuit(example.circuit));
    setPendingWire(null);
    setSelection(EMPTY_SELECTION);
    setSelectedTool('select');
    setMessage(`Exemplo carregado: ${example.name}.`);
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
      <header className="app-titlebar">
        <div className="brand-block">
          <span className="app-icon">OC</span>
          <strong>OpenCircuit</strong>
          <span className="project-name">Projeto: circuito_logico.json</span>
        </div>

      </header>

      <div className="commandbar">
        <button onClick={() => fileInputRef.current?.click()}>Abrir</button>
        <button onClick={() => downloadJson('circuito-logico.json', circuit)}>Salvar</button>
        <select
          className="examples-select"
          value=""
          onChange={(event) => {
            loadExample(event.target.value);
            event.target.value = '';
          }}
          aria-label="Exemplos"
        >
          <option value="" disabled>Exemplos</option>
          {CIRCUIT_EXAMPLES.map((example) => (
            <option key={example.id} value={example.id}>{example.name}</option>
          ))}
        </select>
        <span className="command-separator" />
        <button onClick={undo} disabled={history.past.length === 0}>Desfazer</button>
        <button onClick={redo} disabled={history.future.length === 0}>Refazer</button>
        <span className="command-separator" />
        <button onClick={() => setSelectedTool('pan')} className={selectedTool === 'pan' ? 'active' : ''}>Mão</button>
        <button onClick={() => setSelectedTool('select')} className={selectedTool === 'select' ? 'active' : ''}>Selecionar</button>
        <input ref={fileInputRef} type="file" accept="application/json" onChange={importJson} hidden />
      </div>

      <section
        className="app-layout"
        style={{ gridTemplateColumns: `250px minmax(520px, 1fr) 8px ${truthPanelWidth}px` }}
      >
        <aside className="library-panel" aria-label="Biblioteca de componentes">
          <div className="panel-header">Biblioteca</div>
          <div className="tool-groups">
            {TOOL_GROUPS.map((group) => (
              <section className="tool-group" key={group.title}>
                <h2>{group.title}</h2>
                <div className="tool-grid">
                  {group.tools.map((type) => (
                    <button
                      key={type}
                      className={`tool-card ${selectedTool === type ? 'active' : ''}`}
                      draggable
                      onClick={() => setSelectedTool(type)}
                      onDragStart={(event) => event.dataTransfer.setData('application/opencircuit-gate', type)}
                    >
                      <ToolButtonContent type={type} />
                    </button>
                  ))}
                </div>
              </section>
            ))}
          </div>
        </aside>

        <div className="center-panel">
          <div className="document-tabs">
            <button className="document-tab active">circuito_logico.json</button>
            <button className="document-tab add-tab">+</button>
          </div>
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
              onRenameComponent={renameComponent}
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
          </div>
        </div>

        <div
          className="panel-resizer"
          role="separator"
          aria-orientation="vertical"
          aria-label="Redimensionar tabela verdade"
          onMouseDown={(event) => {
            event.preventDefault();
            setResizingTruthPanel(true);
          }}
        />

        <aside className="properties-panel truth-panel">
          <div className="panel-header">Tabela Verdade</div>
          <CircuitTruthTable circuit={circuit} />
        </aside>
      </section>

      <footer className="statusbar app-footer">
        <span>{message}</span>
        <span>{circuit.components.length} componentes · {circuit.wires.length} fios</span>
      </footer>

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

function CircuitTruthTable({ circuit }: { circuit: CircuitDocument }) {
  const inputs = circuit.components.filter((component) => component.type === 'input');
  const outputs = circuit.components.filter((component) => component.type === 'led');
  const maxInputs = 6;

  if (inputs.length === 0) {
    return <div className="properties-card muted-card">Adicione componentes Input para gerar a tabela verdade do circuito.</div>;
  }

  if (outputs.length === 0) {
    return <div className="properties-card muted-card">Adicione LEDs para observar as saídas do circuito.</div>;
  }

  if (inputs.length > maxInputs) {
    return (
      <div className="properties-card muted-card">
        Este circuito tem {inputs.length} entradas, gerando {2 ** inputs.length} combinações. O limite atual é {maxInputs} entradas.
      </div>
    );
  }

  const rows = buildCircuitTruthRows(circuit, inputs, outputs);
  const currentInputValues = inputs.map((input) => Boolean(input.state));

  return (
    <div className="properties-card truth-table-card">
      <span className="property-subtitle">Circuito inteiro</span>
      <div className="truth-table-wrap">
        <table className="truth-table circuit-truth-table">
          <thead>
            <tr>
              {inputs.map((input) => <th key={input.id}>{input.label ?? input.id}</th>)}
              {outputs.map((output) => <th key={output.id}>{output.label ?? output.id}</th>)}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, rowIndex) => {
              const isCurrent = sameBooleanValues(row.inputs, currentInputValues);
              return (
                <tr key={rowIndex} className={isCurrent ? 'current-truth-row' : undefined}>
                  {row.inputs.map((value, index) => <td key={`i-${index}`}>{bit(value)}</td>)}
                  {row.outputs.map((value, index) => <td key={`o-${index}`} className={truthOutputClass(value)}>{bit(value)}</td>)}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function ToolButtonContent({ type }: { type: GateType }) {
  const asset = COMPONENT_TOOL_ASSETS[type];
  return (
    <span className="tool-button-content">
      {asset && <img className="tool-icon" src={asset} alt="" aria-hidden="true" />}
      <span>{COMPONENT_DEFINITIONS[type].label}</span>
    </span>
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
              <ToolButtonContent type={type} />
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

function buildCircuitTruthRows(circuit: CircuitDocument, inputs: LogicComponent[], outputs: LogicComponent[]) {
  const rowCount = 2 ** inputs.length;
  return Array.from({ length: rowCount }, (_, rowIndex) => {
    const inputValues = inputs.map((_, inputIndex) => {
      const bitIndex = inputs.length - inputIndex - 1;
      return Boolean((rowIndex >> bitIndex) & 1);
    });
    const inputValueById = new Map(inputs.map((input, index) => [input.id, inputValues[index]]));
    const testCircuit: CircuitDocument = {
      ...circuit,
      components: circuit.components.map((component) =>
        component.type === 'input'
          ? { ...component, state: inputValueById.get(component.id) ?? false }
          : component,
      ),
    };
    const result = evaluateCircuit(testCircuit);
    return {
      inputs: inputValues,
      outputs: outputs.map((output) => Boolean(result[output.id]?.in)),
    };
  });
}

function sameBooleanValues(left: boolean[], right: boolean[]): boolean {
  return left.length === right.length && left.every((value, index) => value === right[index]);
}

function bit(value: boolean): 0 | 1 {
  return value ? 1 : 0;
}

function truthOutputClass(value: boolean): string {
  return value ? 'truth-output on' : 'truth-output';
}

function cloneCircuit(circuit: CircuitDocument): CircuitDocument {
  return {
    version: circuit.version,
    components: circuit.components.map((component) => ({ ...component })),
    wires: circuit.wires.map((wire) => ({
      id: wire.id,
      from: { ...wire.from },
      to: { ...wire.to },
    })),
  };
}

function hasSelection(selection: Selection): boolean {
  return selection.componentIds.length > 0 || selection.wireIds.length > 0;
}

function snap(point: Point): Point {
  return { x: Math.round(point.x / GRID) * GRID, y: Math.round(point.y / GRID) * GRID };
}

const LOGIC_COMPONENT_TOOLS: GateType[] = TOOL_GROUPS.flatMap((group) => group.tools);

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
