import { Profiler, useEffect, useRef, useState } from 'react';
import type { CircuitDocument, GateType } from '../core/types';
import { CircuitCanvas } from './editor/CircuitCanvas';
import { exportCircuitImage, type CircuitImageFormat } from './editor/exportCircuitImage';
import { recordReactProfile } from '../performance/profiling';
import { CIRCUIT_EXAMPLES, CIRCUIT_LESSONS } from '../examples/circuitExamples';
import { CircuitTruthTable } from './panels/CircuitTruthTable';
import { LessonPanel } from './panels/LessonPanel';
import { WaveformPanel } from './panels/WaveformPanel';
import { circuitHasFeedback } from '../core/simulation/graph';
import { CommandBar } from './commandbar/CommandBar';
import { useAutoSaveWorkspace } from './hooks/useAutoSaveWorkspace';
import { useCircuitHistory } from './hooks/useCircuitHistory';
import { useEditorKeyboardShortcuts } from './hooks/useEditorKeyboardShortcuts';
import { useReleaseMomentaryButtons } from './hooks/useReleaseMomentaryButtons';
import { useResizableSidePanel } from './hooks/useResizableSidePanel';
import { useWireStylePreference } from './hooks/useWireStylePreference';
import { hasSelection, normalizeCircuitForEditor } from './app/editorUtils';
import { ContextMenuView } from './context-menu/ContextMenuView';
import { ConfirmCloseDialog } from './dialogs/ConfirmCloseDialog';
import { DocumentTabs } from './tabs/DocumentTabs';
import { ComponentLibrary } from './library/ComponentLibrary';
import { useWorkspaceManager } from './hooks/useWorkspaceManager';
import { useCircuitEditor } from './hooks/useCircuitEditor';
import { useSimulationController } from './hooks/useSimulationController';
import { useContextMenuManager } from './hooks/useContextMenu';

const HISTORY_LIMIT = 100;
const WIRE_STYLE_STORAGE_KEY = 'opencircuit-wire-style';
export function App() {
  const [message, setMessage] = useState('Pronto para testar lógica.');
  const [sidePanelTab, setSidePanelTab] = useState<'truth' | 'waveform' | 'lesson'>('truth');
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
    requestCloseDocument,
    pendingCloseDocument,
    savePendingCloseDocument,
    discardPendingCloseDocument,
    cancelPendingClose,
    saveActiveDocument,
    renameDocument,
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
    waveformSamples,
    waveformSignals,
    clearWaveformHistory,
    tickSequentialCircuit,
    toggleAutoClock,
    resetSimulation,
    resetSimulationState,
  } = useSimulationController({
    circuit,
    setCircuit,
    rememberCircuit,
    onMessage: setMessage,
  });

  const [wireStyle, setWireStyle] = useWireStylePreference(WIRE_STYLE_STORAGE_KEY);
  const truthPanel = useResizableSidePanel(320, 260, 620);

  const hasFeedback = circuitHasFeedback(circuit);
  const currentExample =
    CIRCUIT_EXAMPLES.find((example) => example.id === currentExampleId) ?? null;

  useAutoSaveWorkspace(workspace);
  useReleaseMomentaryButtons(setCircuit);

  useEditorKeyboardShortcuts({
    selection,
    pendingWire,
    contextMenu,
    dialogOpen: pendingCloseDocument !== null,
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

  // Reset editor state when switching documents, without emitting a status
  // message: the handler that switched the document already set its own.
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setSelectedTool('select');
    resetSimulationState();
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

  async function exportImage(format: CircuitImageFormat) {
    if (circuit.components.length === 0) {
      setMessage('Adicione componentes antes de exportar a imagem.');
      return;
    }
    const svg = document.querySelector<SVGSVGElement>('svg.circuit-canvas');
    if (!svg) {
      setMessage('Canvas não encontrado para exportar.');
      return;
    }
    const baseName = activeDocument.name.replace(/\.json$/i, '') || 'circuito';
    setMessage('Gerando imagem do circuito...');
    try {
      const filename = await exportCircuitImage(svg, baseName, format);
      setMessage(`Imagem exportada: ${filename}.`);
    } catch {
      setMessage('Não foi possível exportar a imagem.');
    }
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
        onExportImage={exportImage}
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
          <DocumentTabs
            documents={documents}
            activeDocumentId={activeDocumentId}
            onSelect={selectDocument}
            onRequestClose={requestCloseDocument}
            onRename={renameDocument}
            onCreate={createNewDocument}
          />
          <div className="editor-panel">
            <Profiler id="CircuitCanvas" onRender={recordReactProfile}>
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
            </Profiler>
          </div>
        </div>

        <div
          className="panel-resizer"
          role="separator"
          aria-orientation="vertical"
          aria-label="Redimensionar painel lateral"
          onMouseDown={(event) => {
            event.preventDefault();
            truthPanel.startResizing();
          }}
        />

        <aside className="properties-panel side-panel">
          <div className="side-panel-tabs" role="tablist" aria-label="Painéis do circuito">
            <button
              role="tab"
              aria-selected={sidePanelTab === 'truth'}
              className={sidePanelTab === 'truth' ? 'active' : ''}
              onClick={() => setSidePanelTab('truth')}
            >
              Tabela verdade
            </button>
            <button
              role="tab"
              aria-selected={sidePanelTab === 'waveform'}
              className={sidePanelTab === 'waveform' ? 'active' : ''}
              onClick={() => setSidePanelTab('waveform')}
            >
              Formas de onda
            </button>
            <button
              role="tab"
              aria-selected={sidePanelTab === 'lesson'}
              className={sidePanelTab === 'lesson' ? 'active' : ''}
              onClick={() => setSidePanelTab('lesson')}
            >
              Lição
            </button>
          </div>

          {sidePanelTab === 'truth' && (
            <div role="tabpanel">
              <div className="panel-header">
                {hasSequentialComponents || hasFeedback ? 'Estado do Circuito' : 'Tabela Verdade'}
              </div>
              <CircuitTruthTable
                circuit={circuit}
                evaluation={evaluation}
                unstable={simulationResult.unstable}
                hasFeedback={hasFeedback}
              />
            </div>
          )}
          {sidePanelTab === 'waveform' && (
            <div role="tabpanel">
              <div className="panel-header">Formas de onda</div>
              <WaveformPanel
                signals={waveformSignals}
                samples={waveformSamples}
                autoClockRunning={autoClockRunning}
                onClear={clearWaveformHistory}
              />
            </div>
          )}
          {sidePanelTab === 'lesson' && (
            <div role="tabpanel">
              <div className="panel-header">Lição</div>
              <LessonPanel
                example={currentExample}
                examples={CIRCUIT_EXAMPLES}
                onLoadExample={loadExample}
              />
            </div>
          )}
        </aside>
      </section>

      <footer className="statusbar app-footer">
        <span>{message}</span>
        <span>
          {circuit.components.length} componentes · {circuit.wires.length} fios
        </span>
      </footer>

      {pendingCloseDocument && (
        <ConfirmCloseDialog
          documentName={pendingCloseDocument.name}
          onSave={savePendingCloseDocument}
          onDiscard={discardPendingCloseDocument}
          onCancel={cancelPendingClose}
        />
      )}

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
