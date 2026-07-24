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
import { RemoteCircuitsDialog } from './dialogs/RemoteCircuitsDialog';
import { ConflictDialog } from './dialogs/ConflictDialog';
import { DocumentTabs } from './tabs/DocumentTabs';
import { ComponentLibrary } from './library/ComponentLibrary';
import { useWorkspaceManager } from './hooks/useWorkspaceManager';
import { useCircuitEditor } from './hooks/useCircuitEditor';
import { useSimulationController } from './hooks/useSimulationController';
import { useContextMenuManager } from './hooks/useContextMenu';
import { useResizableBottomPanel } from './hooks/useResizableBottomPanel';

const HISTORY_LIMIT = 100;
const WIRE_STYLE_STORAGE_KEY = 'opencircuit-wire-style';
export function App() {
  const [message, setMessage] = useState('Pronto para testar lógica.');
  const [sidePanelTab, setSidePanelTab] = useState<'truth' | 'lesson'>('truth');
  const [waveformPanelOpen, setWaveformPanelOpen] = useState(false);
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
    saveActiveDocumentAs,
    downloadActiveDocument,
    remoteDocumentIds,
    renameDocument,
    loadExample,
    importJson,
    remoteCircuits,
    remoteBrowserOpen,
    remoteLoading,
    openRemoteBrowser,
    closeRemoteBrowser,
    refreshRemoteCircuits,
    openRemoteDocument,
    deleteRemoteDocument,
    activeSyncState,
    conflict,
    closeConflict,
    reloadConflict,
    saveConflictAsCopy,
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
    openWaypointMenu,
    addComponentFromContextMenu,
    renameContextTarget,
    toggleWireContextTarget,
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
    removeWireWaypoint,
    toggleWireDisplay,
    setRenameRequest,
  });

  const {
    autoClockRunning,
    autoClockIntervalMs,
    setAutoClockIntervalMs,
    simulationResult,
    evaluation,
    changedSignals,
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
  const waveformPanel = useResizableBottomPanel(260, 150, 520);

  const hasFeedback = circuitHasFeedback(circuit);
  const currentExample =
    CIRCUIT_EXAMPLES.find((example) => example.id === currentExampleId) ?? null;

  useAutoSaveWorkspace(workspace);
  useReleaseMomentaryButtons(setCircuit);

  useEditorKeyboardShortcuts({
    selection,
    pendingWire,
    contextMenu,
    dialogOpen: pendingCloseDocument !== null || remoteBrowserOpen || conflict !== null,
    hasSelection,
    onCancelContextMenu: closeContextMenu,
    onCancelPendingWire: () => setPendingWire(null),
    onSelectTool: setSelectedTool,
    onMessage: setMessage,
    onUndo: undo,
    onRedo: redo,
    onSave: saveActiveDocument,
    onSaveAs: saveActiveDocumentAs,
    onOpen: openRemoteBrowser,
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
        onOpen={openRemoteBrowser}
        onSave={saveActiveDocument}
        onSaveAs={saveActiveDocumentAs}
        onDownloadJson={downloadActiveDocument}
        onImportClick={() => fileInputRef.current?.click()}
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
            remoteDocumentIds={remoteDocumentIds}
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
                changedSignals={changedSignals}
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
                onRenameWire={renameWire}
                onAddWireWaypoint={addWireWaypoint}
                onBeginMoveWireWaypoint={beginMoveWireWaypoint}
                onMoveWireWaypoint={moveWireWaypoint}
                onRemoveWireWaypoint={removeWireWaypoint}
                onRemoveComponent={removeComponent}
                onRenameComponent={renameComponent}
                onCancelPendingWire={cancelPendingWire}
                onOpenCanvasMenu={openCanvasMenu}
                onOpenComponentMenu={openComponentMenu}
                onOpenWireMenu={openWireMenu}
                onOpenWaypointMenu={openWaypointMenu}
                onSelectComponent={selectComponent}
                onSelectWire={selectWire}
                onSelectItems={selectItems}
                onClearSelection={clearSelection}
                onSelectTool={setSelectedTool}
              />
            </Profiler>
          </div>
          <section
            className={`waveform-drawer ${waveformPanelOpen ? 'open' : 'closed'}`}
            style={{ height: waveformPanelOpen ? waveformPanel.height : 40 }}
            aria-label="Formas de onda"
          >
            {waveformPanelOpen && (
              <div
                className="waveform-drawer-resizer"
                role="separator"
                aria-orientation="horizontal"
                aria-label="Redimensionar painel de formas de onda"
                aria-valuemin={150}
                aria-valuemax={520}
                aria-valuenow={Math.round(waveformPanel.height)}
                tabIndex={0}
                title="Arraste para redimensionar"
                onMouseDown={(event) => {
                  event.preventDefault();
                  waveformPanel.startResizing(event.clientY);
                }}
                onKeyDown={(event) => {
                  if (event.key === 'ArrowUp') {
                    event.preventDefault();
                    waveformPanel.resizeBy(20);
                  }
                  if (event.key === 'ArrowDown') {
                    event.preventDefault();
                    waveformPanel.resizeBy(-20);
                  }
                }}
              />
            )}
            <div className="waveform-drawer-header">
              <button
                className="waveform-drawer-toggle"
                aria-expanded={waveformPanelOpen}
                aria-controls="waveform-bottom-content"
                onClick={() => setWaveformPanelOpen((open) => !open)}
              >
                <span className="waveform-drawer-chevron" aria-hidden="true">
                  {waveformPanelOpen ? '⌄' : '⌃'}
                </span>
                <strong>Formas de onda</strong>
                <span className="waveform-drawer-summary">
                  {waveformSignals.length} sinais · {waveformSamples.length} amostras
                </span>
              </button>
            </div>
            {waveformPanelOpen && (
              <div className="waveform-drawer-content" id="waveform-bottom-content">
                <WaveformPanel
                  signals={waveformSignals}
                  samples={waveformSamples}
                  autoClockRunning={autoClockRunning}
                  onClear={clearWaveformHistory}
                />
              </div>
            )}
          </section>
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
              <div className="analysis-guide-card">
                {hasSequentialComponents || hasFeedback ? (
                  <>
                    <span className="analysis-guide-eyebrow">Dica de análise</span>
                    <strong>Tabela verdade é uma fotografia; formas de onda são o filme.</strong>
                    <p>
                      Este circuito possui memória ou realimentação, então seu resultado também
                      depende do estado anterior. Use as formas de onda para acompanhar entradas,
                      clock, estados internos e saídas a cada Tick.
                    </p>
                    <button onClick={() => setWaveformPanelOpen(true)}>
                      Abrir Formas de onda <span aria-hidden="true">↓</span>
                    </button>
                    <small>A aba recolhível fica na parte inferior do canvas.</small>
                  </>
                ) : (
                  <>
                    <span className="analysis-guide-eyebrow">Como ler</span>
                    <strong>Cada linha representa uma combinação possível das entradas.</strong>
                    <p>
                      As primeiras colunas mostram os valores aplicados às entradas; as últimas
                      mostram as saídas produzidas pelo circuito. A linha amarela corresponde à
                      combinação que está ativa agora no canvas, e uma saída verde indica nível
                      lógico 1.
                    </p>
                  </>
                )}
              </div>
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
          {syncLabel(activeSyncState)} · {circuit.components.length} componentes ·{' '}
          {circuit.wires.length} fios
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

      {remoteBrowserOpen && (
        <RemoteCircuitsDialog
          circuits={remoteCircuits}
          loading={remoteLoading}
          onOpen={openRemoteDocument}
          onDelete={deleteRemoteDocument}
          onRefresh={refreshRemoteCircuits}
          onClose={closeRemoteBrowser}
        />
      )}

      {conflict && (
        <ConflictDialog
          documentName={
            documents.find((item) => item.id === conflict.documentId)?.name ?? 'circuito'
          }
          onReload={reloadConflict}
          onSaveCopy={saveConflictAsCopy}
          onClose={closeConflict}
        />
      )}

      {contextMenu && (
        <ContextMenuView
          key={`${contextMenu.kind}-${contextMenu.x}-${contextMenu.y}`}
          menu={contextMenu}
          selection={selection}
          onAddComponent={addComponentFromContextMenu}
          onRename={renameContextTarget}
          onToggleWireDisplay={toggleWireContextTarget}
          wireIsTunnel={
            contextMenu.kind === 'wire' &&
            circuit.wires.some(
              (wire) => wire.id === contextMenu.wireId && wire.display === 'tunnel',
            )
          }
          onRemove={removeContextTarget}
          onClose={closeContextMenu}
        />
      )}
    </main>
  );
}

function syncLabel(state: import('./hooks/useWorkspaceManager').RemoteSyncState): string {
  return {
    idle: 'rascunho local',
    saving: 'salvando…',
    saved: 'salvo',
    offline: 'offline',
    error: 'erro ao salvar',
    conflict: 'conflito',
  }[state];
}
