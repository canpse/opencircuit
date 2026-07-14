import { useEffect, useRef, useState } from 'react';
import type { CircuitDocument, GateType } from '../core/types';
import { CircuitCanvas } from './editor/CircuitCanvas';
import { CIRCUIT_EXAMPLES, CIRCUIT_LESSONS } from '../examples/circuitExamples';
import { CircuitTruthTable } from './panels/CircuitTruthTable';
import { LessonPanel } from './panels/LessonPanel';
import { circuitHasFeedback } from '../core/simulation/graph';
import { CommandBar } from './commandbar/CommandBar';
import { useAutoSaveWorkspace } from './hooks/useAutoSaveWorkspace';
import { useCircuitHistory } from './hooks/useCircuitHistory';
import { useEditorKeyboardShortcuts } from './hooks/useEditorKeyboardShortcuts';
import { useReleaseMomentaryButtons } from './hooks/useReleaseMomentaryButtons';
import { useResizableSidePanel } from './hooks/useResizableSidePanel';
import { useWireStylePreference } from './hooks/useWireStylePreference';
import {
  hasSelection,
  normalizeCircuitForEditor,
} from './app/editorUtils';
import { ContextMenuView } from './context-menu/ContextMenuView';
import { ComponentLibrary } from './library/ComponentLibrary';
import { useWorkspaceManager } from './hooks/useWorkspaceManager';
import { useCircuitEditor } from './hooks/useCircuitEditor';
import { useSimulationController } from './hooks/useSimulationController';
import { useContextMenuManager } from './hooks/useContextMenu';

const HISTORY_LIMIT = 100;
const WIRE_STYLE_STORAGE_KEY = 'opencircuit-wire-style';
export function App() {
  const [message, setMessage] = useState('Pronto para testar lógica.');
  const [selectedTool, setSelectedTool] = useState<GateType | 'select' | 'wire' | 'pan'>('select');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const {
    workspace,
    documents,
    activeDocument,
    activeDocumentId,
    circuit,
    currentExampleId,
    setCircuit,
    selectDocument,
    createNewDocument,
    closeDocument,
    saveActiveDocument,
    loadExample,
    importJson,
  } = useWorkspaceManager({
    onMessage: setMessage,
  });
  const {
    canUndo,
    canRedo,
    remember: rememberCircuit,
    undo: undoHistory,
    redo: redoHistory,
  } = useCircuitHistory(circuit, HISTORY_LIMIT, activeDocumentId);

  const {
    pendingWire,
    setPendingWire,
    selection,
    setSelection,
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
    removeComponent,
    renameComponent,
    resizeTextComponent,
    onCopy,
    onPaste,
  } = useCircuitEditor({
    circuit,
    setCircuit,
    rememberCircuit,
    onMessage: setMessage,
    onSelectTool: setSelectedTool,
  });

  const [renameRequest, setRenameRequest] = useState<{ componentId: string; nonce: number } | null>(
    null,
  );
  
  const {
    contextMenu,
    closeContextMenu,
    openCanvasMenu,
    openComponentMenu,
    openWireMenu,
    addComponentFromContextMenu,
    renameContextTarget,
    removeContextTarget,
  } = useContextMenuManager({
    selection,
    pendingWire,
    setPendingWire,
    onSelectTool: setSelectedTool,
    selectComponent,
    selectWire,
    addComponent,
    removeSelection,
    removeComponent,
    removeWire,
    setRenameRequest,
  });

  const {
    autoClockRunning,
    autoClockIntervalMs,
    setAutoClockIntervalMs,
    simulationResult,
    evaluation,
    hasSequentialComponents,
    tickSequentialCircuit,
    toggleAutoClock,
    resetSimulation,
    resetSimulationRuntime,
  } = useSimulationController({
    circuit,
    setCircuit,
    rememberCircuit,
    onMessage: setMessage,
  });

  const [wireStyle, setWireStyle] = useWireStylePreference(WIRE_STYLE_STORAGE_KEY);
  const truthPanel = useResizableSidePanel(320, 260, 620);

  const hasFeedback = circuitHasFeedback(circuit);
  const currentExample = CIRCUIT_EXAMPLES.find((example) => example.id === currentExampleId) ?? null;

  useAutoSaveWorkspace(workspace);
  useReleaseMomentaryButtons(setCircuit);

  useEditorKeyboardShortcuts({
    selection,
    pendingWire,
    contextMenu,
    hasSelection,
    onCancelContextMenu: closeContextMenu,
    onCancelPendingWire: () => setPendingWire(null),
    onSelectTool: setSelectedTool,
    onMessage: setMessage,
    onUndo: undo,
    onRedo: redo,
    onSave: saveActiveDocument,
    onRemoveSelection: removeSelection,
    onCopy,
    onPaste,
  });

  // Reset editor state when switching documents
  useEffect(() => {
    setSelectedTool('select');
    resetSimulation();
    setPendingWire(null);
    clearSelection();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeDocumentId]);

  function restoreCircuit(nextCircuit: CircuitDocument, nextMessage: string) {
    resetSimulation();
    setCircuit(normalizeCircuitForEditor(nextCircuit));
    setPendingWire(null);
    clearSelection();
    setSelectedTool('select');
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
                title={
                  document.exampleId
                    ? `Exemplo: ${CIRCUIT_EXAMPLES.find((example) => example.id === document.exampleId)?.name ?? document.exampleId}`
                    : document.name
                }
              >
                <button className="document-tab-title" onClick={() => selectDocument(document.id)}>
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
            <button className="document-tab add-tab" onClick={createNewDocument}>
              +
            </button>
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
          <div className="panel-header">
            {hasSequentialComponents || hasFeedback ? 'Estado do Circuito' : 'Tabela Verdade'}
          </div>
          <CircuitTruthTable
            circuit={circuit}
            evaluation={evaluation}
            unstable={simulationResult.unstable}
            hasFeedback={hasFeedback}
          />
          <div className="panel-section-divider" />
          <div className="panel-header lesson-panel-header">Lição</div>
          <LessonPanel
            example={currentExample}
            examples={CIRCUIT_EXAMPLES}
            onLoadExample={loadExample}
          />
        </aside>
      </section>

      <footer className="statusbar app-footer">
        <span>{message}</span>
        <span>
          {circuit.components.length} componentes · {circuit.wires.length} fios
        </span>
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
