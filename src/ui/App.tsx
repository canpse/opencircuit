import { ChangeEvent, type SetStateAction, useCallback, useMemo, useRef, useState } from 'react';
import { isSequentialType, settleSequentialCircuit, stepCircuit } from '../core/evaluateCircuit';
import type { CircuitDocument, GateType, LogicComponent, PinRef, Point, Wire } from '../core/types';
import { downloadJson, STARTER_CIRCUIT } from '../state/storage';
import { createUntitledDocument, loadWorkspace, type WorkspaceDocument } from '../state/workspaceStorage';
import { CircuitCanvas, type WireStyle } from './editor/CircuitCanvas';
import { CIRCUIT_EXAMPLES, CIRCUIT_LESSONS } from '../examples/circuitExamples';
import { CircuitTruthTable } from './panels/CircuitTruthTable';
import { LessonPanel } from './panels/LessonPanel';
import { circuitHasFeedback } from '../core/simulation/graph';
import { CommandBar } from './commandbar/CommandBar';
import { useAutoClock } from './hooks/useAutoClock';
import { useAutoCloseContextMenu } from './hooks/useAutoCloseContextMenu';
import { useAutoSaveWorkspace } from './hooks/useAutoSaveWorkspace';
import { useCircuitHistory } from './hooks/useCircuitHistory';
import { useEditorKeyboardShortcuts } from './hooks/useEditorKeyboardShortcuts';
import { useReleaseMomentaryButtons } from './hooks/useReleaseMomentaryButtons';
import { useResizableSidePanel } from './hooks/useResizableSidePanel';
import { useSimulationRuntime } from './hooks/useSimulationRuntime';
import { useWireStylePreference } from './hooks/useWireStylePreference';
import { cloneCircuit, componentDefinitionLabel, createLogicComponent, hasSelection, nextId, normalizeCircuitForEditor, snap } from './app/editorUtils';
import { ContextMenuView, type ContextMenu, type Selection } from './context-menu/ContextMenuView';
import { ComponentLibrary } from './library/ComponentLibrary';

const GRID = 20;
const HISTORY_LIMIT = 100;
const WIRE_STYLE_STORAGE_KEY = 'opencircuit-wire-style';


const EMPTY_SELECTION: Selection = { componentIds: [], wireIds: [] };
export function App() {
  const [workspace, setWorkspace] = useState(() => loadWorkspace());
  const documents = workspace.documents;
  const activeDocumentId = workspace.activeDocumentId;
  const setDocuments = useCallback((action: SetStateAction<WorkspaceDocument[]>) => {
    setWorkspace((current) => {
      const nextDocuments = typeof action === 'function' ? action(current.documents) : action;
      const activeStillExists = nextDocuments.some((document) => document.id === current.activeDocumentId);
      return {
        ...current,
        documents: nextDocuments,
        activeDocumentId: activeStillExists ? current.activeDocumentId : nextDocuments[0]?.id ?? current.activeDocumentId,
      };
    });
  }, []);
  const setActiveDocumentId = useCallback((documentId: string) => {
    setWorkspace((current) => ({ ...current, activeDocumentId: documentId }));
  }, []);
  const [selectedTool, setSelectedTool] = useState<GateType | 'select' | 'wire' | 'pan'>('select');
  const [pendingWire, setPendingWire] = useState<PinRef | null>(null);
  const [selection, setSelection] = useState<Selection>(EMPTY_SELECTION);
  const [rightPanelTab, setRightPanelTab] = useState<'simulation' | 'lesson'>('simulation');
  const activeDocument = documents.find((document) => document.id === activeDocumentId) ?? documents[0];
  const circuit = activeDocument.circuit;
  const currentExampleId = activeDocument.exampleId;
  const setCircuit = useCallback((action: SetStateAction<CircuitDocument>) => {
    setDocuments((currentDocuments) => currentDocuments.map((document) => {
      if (document.id !== activeDocumentId) return document;
      const nextCircuit = typeof action === 'function' ? action(document.circuit) : action;
      return { ...document, circuit: nextCircuit, saved: false };
    }));
  }, [activeDocumentId]);
  const setActiveExampleId = useCallback((exampleId: string | null) => {
    setDocuments((currentDocuments) => currentDocuments.map((document) =>
      document.id === activeDocumentId ? { ...document, exampleId } : document,
    ));
  }, [activeDocumentId]);
  const { canUndo, canRedo, remember: rememberCircuit, undo: undoHistory, redo: redoHistory } = useCircuitHistory(circuit, HISTORY_LIMIT, activeDocumentId);
  const [contextMenu, setContextMenu] = useState<ContextMenu>(null);
  const [renameRequest, setRenameRequest] = useState<{ componentId: string; nonce: number } | null>(null);
  const [message, setMessage] = useState('Pronto para testar lógica.');
  const [autoClockRunning, setAutoClockRunning] = useState(false);
  const [autoClockIntervalMs, setAutoClockIntervalMs] = useState(500);
  const [wireStyle, setWireStyle] = useWireStylePreference(WIRE_STYLE_STORAGE_KEY);
  const truthPanel = useResizableSidePanel(320, 260, 620);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { simulationResult, evaluation, resetSimulationRuntime } = useSimulationRuntime(circuit);
  const hasSequentialComponents = circuit.components.some((component) => isSequentialType(component.type));
  const hasFeedback = useMemo(() => circuitHasFeedback(circuit), [circuit]);
  const currentExample = useMemo(
    () => CIRCUIT_EXAMPLES.find((example) => example.id === currentExampleId) ?? null,
    [currentExampleId],
  );

  const closeContextMenu = useCallback(() => setContextMenu(null), []);
  const autoClockTick = useCallback(() => {
    setCircuit((current) => stepCircuit(current));
  }, []);

  useAutoSaveWorkspace(workspace);
  useAutoClock({ running: autoClockRunning, intervalMs: autoClockIntervalMs, onTick: autoClockTick });
  useAutoCloseContextMenu(closeContextMenu);
  useReleaseMomentaryButtons(setCircuit);

  useEditorKeyboardShortcuts({
    selection,
    pendingWire,
    contextMenu,
    hasSelection,
    onCancelContextMenu: () => setContextMenu(null),
    onCancelPendingWire: () => setPendingWire(null),
    onSelectTool: setSelectedTool,
    onMessage: setMessage,
    onUndo: undo,
    onRedo: redo,
    onSave: saveActiveDocument,
    onRemoveSelection: removeSelection,
  });

  function restoreCircuit(nextCircuit: CircuitDocument, nextMessage: string) {
    resetSimulationRuntime();
    setCircuit(normalizeCircuitForEditor(nextCircuit));
    setPendingWire(null);
    setSelection(EMPTY_SELECTION);
    setSelectedTool('select');
    setAutoClockRunning(false);
    setMessage(nextMessage);
  }

  function undo() {
    const previous = undoHistory();
    if (!previous) {
      setMessage('Nada para desfazer.');
      return;
    }

    restoreCircuit(previous, 'Desfeito.');
  }

  function redo() {
    const next = redoHistory();
    if (!next) {
      setMessage('Nada para refazer.');
      return;
    }

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
    const snapped = snap(point, GRID);
    const id = nextId(type, circuit.components);
    const component = createLogicComponent(type, id, snapped);
    rememberCircuit();
    setCircuit((current) => ({ ...current, components: [...current.components, component] }));
    setSelection({ componentIds: [id], wireIds: [] });
    setMessage(`${componentDefinitionLabel(type)} adicionado.`);
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
      moves.map((move) => [move.componentId, snap(move.point, GRID)]),
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
    setCircuit((current) => settleSequentialCircuit({
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

  function circuitCanTick() {
    return circuit.components.some((component) => isSequentialType(component.type));
  }

  function tickSequentialCircuit() {
    if (!circuitCanTick()) {
      setMessage('Adicione Clock, Latch D ou Flip-Flop D para usar Tick.');
      return;
    }
    rememberCircuit();
    setCircuit((current) => stepCircuit(current));
    setMessage('Tick: tempo sequencial avançado.');
  }

  function toggleAutoClock() {
    if (!autoClockRunning && !circuitCanTick()) {
      setMessage('Adicione Clock, Latch D ou Flip-Flop D para rodar o clock automático.');
      return;
    }
    if (!autoClockRunning) {
      rememberCircuit();
    }
    setAutoClockRunning((running) => !running);
    setMessage(autoClockRunning ? 'Clock automático pausado.' : 'Clock automático rodando.');
  }

  function resetSimulation() {
    setAutoClockRunning(false);
    resetSimulationRuntime();
    setMessage('Estado da simulação resetado.');
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

  function renameContextTarget() {
    if (!contextMenu || contextMenu.kind !== 'component') return;
    setRenameRequest({ componentId: contextMenu.componentId, nonce: Date.now() });
    setContextMenu(null);
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

  function selectDocument(documentId: string) {
    if (documentId === activeDocumentId) return;
    resetSimulationRuntime();
    setActiveDocumentId(documentId);
    setPendingWire(null);
    setSelection(EMPTY_SELECTION);
    setSelectedTool('select');
    setAutoClockRunning(false);
    setMessage('Arquivo alternado.');
  }

  function createNewDocument() {
    const index = documents.length + 1;
    const document = createUntitledDocument(index);
    setDocuments((currentDocuments) => [
      ...currentDocuments,
      { ...document, circuit: normalizeCircuitForEditor(cloneCircuit(document.circuit)) },
    ]);
    resetSimulationRuntime();
    setActiveDocumentId(document.id);
    setPendingWire(null);
    setSelection(EMPTY_SELECTION);
    setSelectedTool('select');
    setAutoClockRunning(false);
    setRightPanelTab('simulation');
    setMessage(`Novo arquivo criado: ${document.name}.`);
  }

  function closeDocument(documentId: string) {
    const closingIndex = documents.findIndex((document) => document.id === documentId);
    const fallback = documents[closingIndex + 1] ?? documents[closingIndex - 1] ?? documents[0];

    if (documents.length === 1) {
      const replacement = createUntitledDocument(1);
      setDocuments([{ ...replacement, circuit: normalizeCircuitForEditor(cloneCircuit(replacement.circuit)) }]);
      resetSimulationRuntime();
      setActiveDocumentId(replacement.id);
      setPendingWire(null);
      setSelection(EMPTY_SELECTION);
      setSelectedTool('select');
      setAutoClockRunning(false);
      setRightPanelTab('simulation');
      setMessage('Arquivo fechado. Nova aba vazia aberta.');
      return;
    }

    setDocuments((currentDocuments) => currentDocuments.filter((document) => document.id !== documentId));
    if (documentId === activeDocumentId) {
      resetSimulationRuntime();
      setActiveDocumentId(fallback.id);
      setPendingWire(null);
      setSelection(EMPTY_SELECTION);
      setSelectedTool('select');
      setAutoClockRunning(false);
    }
    setMessage('Arquivo fechado.');
  }

  function saveActiveDocument() {
    const filename = activeDocument.saved ? activeDocument.name : `${activeDocument.name}.json`;
    downloadJson(filename, circuit);
    setDocuments((currentDocuments) => currentDocuments.map((document) =>
      document.id === activeDocumentId ? { ...document, name: filename, saved: true } : document,
    ));
    setMessage(`Arquivo salvo: ${filename}.`);
  }

  function resetCircuit() {
    rememberCircuit();
    resetSimulationRuntime();
    setCircuit(STARTER_CIRCUIT);
    setPendingWire(null);
    setSelection(EMPTY_SELECTION);
    setSelectedTool('select');
    setAutoClockRunning(false);
    setActiveExampleId(null);
    setMessage('Circuito de exemplo restaurado.');
  }

  function loadExample(exampleId: string) {
    const example = CIRCUIT_EXAMPLES.find((candidate) => candidate.id === exampleId);
    if (!example) return;
    const id = `doc-${Date.now()}`;
    setDocuments((currentDocuments) => [
      ...currentDocuments,
      {
        id,
        name: `${example.name}.json`,
        circuit: normalizeCircuitForEditor(cloneCircuit(example.circuit)),
        exampleId: example.id,
        saved: false,
      },
    ]);
    resetSimulationRuntime();
    setActiveDocumentId(id);
    setPendingWire(null);
    setSelection(EMPTY_SELECTION);
    setSelectedTool('select');
    setAutoClockRunning(false);
    setRightPanelTab('lesson');
    setMessage(`Exemplo aberto em nova aba: ${example.name}.`);
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
        const id = `doc-${Date.now()}`;
        setDocuments((currentDocuments) => [
          ...currentDocuments,
          {
            id,
            name: file.name || `importado_${currentDocuments.length + 1}.json`,
            circuit: normalizeCircuitForEditor(parsed),
            exampleId: null,
            saved: true,
          },
        ]);
        resetSimulationRuntime();
        setActiveDocumentId(id);
        setPendingWire(null);
        setSelection(EMPTY_SELECTION);
        setSelectedTool('select');
        setAutoClockRunning(false);
        setRightPanelTab('simulation');
        setMessage('Circuito importado em nova aba.');
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
          <span className="project-name">Projeto: {activeDocument.name}</span>
        </div>

      </header>

      <CommandBar
        selectedTool={selectedTool}
        wireStyle={wireStyle}
        lessons={CIRCUIT_LESSONS}
        canUndo={canUndo}
        canRedo={canRedo}
        autoClockRunning={autoClockRunning}
        autoClockIntervalMs={autoClockIntervalMs}
        fileInputRef={fileInputRef}
        onOpen={() => fileInputRef.current?.click()}
        onSave={saveActiveDocument}
        onLoadExample={loadExample}
        onUndo={undo}
        onRedo={redo}
        onSelectTool={setSelectedTool}
        onTick={tickSequentialCircuit}
        onToggleAutoClock={toggleAutoClock}
        onAutoClockIntervalChange={setAutoClockIntervalMs}
        onResetSimulation={resetSimulation}
        onWireStyleChange={setWireStyle}
        onImportJson={importJson}
      />

      <section
        className="app-layout"
        style={{ gridTemplateColumns: `250px minmax(520px, 1fr) 8px ${truthPanel.width}px` }}
      >
        <ComponentLibrary selectedTool={selectedTool} onSelectTool={setSelectedTool} />

        <div className="center-panel">
          <div className="document-tabs">
            {documents.map((document) => (
              <div
                key={document.id}
                className={`document-tab ${document.id === activeDocumentId ? 'active' : ''}`}
                title={document.exampleId ? `Exemplo: ${CIRCUIT_EXAMPLES.find((example) => example.id === document.exampleId)?.name ?? document.exampleId}` : document.name}
              >
                <button className="document-tab-title" onClick={() => selectDocument(document.id)}>
                  {!document.saved && <span className="unsaved-dot" aria-label="Arquivo ainda não salvo">●</span>}
                  {document.name}
                </button>
                <button
                    className="document-tab-close"
                    aria-label={`Fechar ${document.name}`}
                    onClick={(event) => {
                      event.stopPropagation();
                      closeDocument(document.id);
                    }}
                  >
                    ×
                  </button>
              </div>
            ))}
            <button className="document-tab add-tab" onClick={createNewDocument}>+</button>
          </div>
          <div className="editor-panel">
            <CircuitCanvas
              circuit={circuit}
              evaluation={evaluation}
              selectedTool={selectedTool}
              wireStyle={wireStyle}
              pendingWire={pendingWire}
              selection={selection}
              renameRequest={renameRequest}
              onRenameRequestHandled={() => setRenameRequest(null)}
              onCanvasAdd={addComponent}
              onBeginMoveComponent={beginMoveComponent}
              onMoveComponents={moveComponents}
              onResizeTextComponent={resizeTextComponent}
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
            truthPanel.startResizing();
          }}
        />

        <aside className="properties-panel truth-panel">
          <div className="panel-header right-panel-header">
            <button
              className={rightPanelTab === 'simulation' ? 'active' : ''}
              onClick={() => setRightPanelTab('simulation')}
            >
              {hasSequentialComponents || hasFeedback ? 'Estado' : 'Tabela'}
            </button>
            <button
              className={rightPanelTab === 'lesson' ? 'active' : ''}
              onClick={() => setRightPanelTab('lesson')}
            >
              Lição
            </button>
          </div>
          {rightPanelTab === 'simulation' ? (
            <CircuitTruthTable circuit={circuit} evaluation={evaluation} unstable={simulationResult.unstable} hasFeedback={hasFeedback} />
          ) : (
            <LessonPanel example={currentExample} examples={CIRCUIT_EXAMPLES} onLoadExample={loadExample} />
          )}
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
          onRename={renameContextTarget}
          onRemove={removeContextTarget}
        />
      )}
    </main>
  );
}

