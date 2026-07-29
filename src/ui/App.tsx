import { Profiler, useEffect, useMemo, useRef, useState } from 'react';
import type { CircuitDocument } from '../core/types';
import { flattenCircuit } from '../core/hierarchy/flatten';
import {
  formatHierarchyExpansionViolation,
  inspectCircuitHierarchy,
} from '../core/hierarchy/expansion.mjs';
import { CircuitCanvas } from './editor/CircuitCanvas';
import { exportCircuitImage, type CircuitImageFormat } from './editor/exportCircuitImage';
import { recordReactProfile } from '../performance/profiling';
import { CIRCUIT_EXAMPLES, CIRCUIT_LESSONS } from '../examples/circuitExamples';
import { CircuitTruthTable } from './panels/CircuitTruthTable';
import { LessonPanel } from './panels/LessonPanel';
import { WaveformPanel } from './panels/WaveformPanel';
import { circuitHasFeedback } from '../core/simulation/graph';
import { effectiveWatchedSignalKeys, signalKey } from '../core/simulation/waveform';
import { CommandBar } from './commandbar/CommandBar';
import { useAutoSaveWorkspace } from './hooks/useAutoSaveWorkspace';
import { useCircuitHistory } from './hooks/useCircuitHistory';
import { useCommandShortcuts } from './hooks/useCommandShortcuts';
import { useReleaseMomentaryButtons } from './hooks/useReleaseMomentaryButtons';
import { useResizableSidePanel } from './hooks/useResizableSidePanel';
import { useWireStylePreference } from './hooks/useWireStylePreference';
import { hasSelection, normalizeCircuitForEditor } from './app/editorUtils';
import { DefinitionBreadcrumb } from './panels/DefinitionBreadcrumb';
import { ContextMenuView } from './context-menu/ContextMenuView';
import { ConfirmCloseDialog } from './dialogs/ConfirmCloseDialog';
import { RemoteCircuitsDialog } from './dialogs/RemoteCircuitsDialog';
import { LibraryDialog } from './dialogs/LibraryDialog';
import { ConflictDialog } from './dialogs/ConflictDialog';
import { DocumentTabs } from './tabs/DocumentTabs';
import { ComponentLibrary } from './library/ComponentLibrary';
import { useWorkspaceManager } from './hooks/useWorkspaceManager';
import { useCircuitEditor } from './hooks/useCircuitEditor';
import { useSimulationController } from './hooks/useSimulationController';
import { useContextMenuManager } from './hooks/useContextMenu';
import { useResizableBottomPanel } from './hooks/useResizableBottomPanel';
import type { EditorTool } from './editor/editorTypes';
import { useDefinitionWorkspace } from './hooks/useDefinitionWorkspace';
import { LocalAutosaveWarning } from './banners/LocalAutosaveWarning';
import type { LocalAutosaveStatus } from './hooks/localAutosaveState';
import { createEditorCommands, type EditorCommandBindings } from './commands/editorCommands';
import { EditorCommandProvider } from './commands/EditorCommandContext';
import { ShortcutHelpDialog } from './dialogs/ShortcutHelpDialog';
import type { CanvasCameraCommands } from './editor/CanvasViewport';
import { useEventCallback } from './hooks/useEventCallback';

const HISTORY_LIMIT = 100;
const WIRE_STYLE_STORAGE_KEY = 'opencircuit-wire-style';
export function App() {
  const [message, setMessage] = useState('Pronto para testar lógica.');
  const [sidePanelTab, setSidePanelTab] = useState<'truth' | 'lesson'>('truth');
  const [waveformPanelOpen, setWaveformPanelOpen] = useState(false);
  const [selectedTool, setSelectedTool] = useState<EditorTool>('select');
  const [shortcutHelpOpen, setShortcutHelpOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraCommandsRef = useRef<CanvasCameraCommands>(null);

  const {
    workspace,
    documents,
    activeDocument,
    activeDocumentId,
    circuit,
    currentExampleId,
    setCircuit,
    setWatchedSignals,
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
    libraryDocumentIds,
    libraryEntries,
    libraryDialogOpen,
    libraryLoading,
    openLibraryDialog,
    closeLibraryDialog,
    refreshLibraryEntries,
    openLibraryEntryForEditing,
    deleteLibraryEntry,
    saveDefinitionToLibrary,
    libraryConflict,
    closeLibraryConflict,
    reloadLibraryConflict,
    saveLibraryConflictAsCopy,
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
    definitions,
    navigationPath,
    activeDefinitionId,
    activeDefinition,
    scopedCircuit,
    setScopedCircuit,
    pendingSubcircuitDefinitionId,
    setPendingSubcircuitDefinitionId,
    enterDefinitionDirect,
    enterInstance,
    goToBreadcrumbIndex,
    createDefinition,
    transformSelectionIntoSubcircuit: transformDefinitionSelection,
    saveActiveDefinitionToLibrary,
    saveDefinitionByIdToLibrary,
    saveComponentDefinitionToLibrary,
    insertLibraryDefinition,
  } = useDefinitionWorkspace({
    circuit,
    setCircuit,
    activeDocumentId,
    rememberCircuit,
    onMessage: setMessage,
    saveDefinitionToLibrary,
    closeLibraryDialog,
    onSelectTool: setSelectedTool,
  });

  const hierarchyInspection = useMemo(() => inspectCircuitHierarchy(circuit), [circuit]);
  const hierarchyViolation = hierarchyInspection.ok ? null : hierarchyInspection.violation;
  const hierarchyBlocked = hierarchyViolation !== null;

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
    toggleWireDisplay,
    renameWire,
    addWireWaypoint,
    beginMoveWireWaypoint,
    moveWireWaypoint,
    removeWireWaypoint,
    removeComponent,
    renameComponent,
    resizeTextComponent,
    clipboard,
    onCopy,
    onPaste,
  } = useCircuitEditor({
    circuit: scopedCircuit,
    setCircuit: setScopedCircuit,
    definitions,
    mergeDefinitions: (newDefinitions) =>
      setCircuit((current) => ({
        ...current,
        definitions: [...(current.definitions ?? []), ...newDefinitions],
      })),
    rememberCircuit,
    onMessage: setMessage,
    onSelectTool: setSelectedTool,
    simulationBlocked: hierarchyBlocked,
  });

  function transformSelectionIntoSubcircuit(componentIds: string[]) {
    const instanceId = transformDefinitionSelection(componentIds);
    if (instanceId) setSelection({ componentIds: [instanceId], wireIds: [] });
  }

  const [renameRequest, setRenameRequest] = useState<{ componentId: string; nonce: number } | null>(
    null,
  );

  const {
    autoClockRunning,
    autoClockIntervalMs,
    setAutoClockIntervalMs,
    simulationResult,
    canvasEvaluation,
    canvasChangedSignals,
    historyTick,
    selectHistoryTick,
    hasSequentialComponents,
    waveformSamples,
    waveformSignals,
    clearWaveformHistory,
    toggleWatchedSignal,
    toggleWatchedSignalForWire,
    tickSequentialCircuit,
    toggleAutoClock,
    resetSimulation,
    pauseSimulationForHistoryRestore,
  } = useSimulationController({
    circuit: scopedCircuit,
    setCircuit: setScopedCircuit,
    definitions,
    watchedSignals: activeDocument.watchedSignals,
    setWatchedSignals,
    rememberCircuit,
    onMessage: setMessage,
    simulationBlocked: hierarchyBlocked,
    scopeKey: JSON.stringify([activeDocumentId, activeDefinitionId]),
  });

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
    toggleWatchedSignalContextTarget,
    removeContextTarget,
    transformContextTarget,
    saveToLibraryContextTarget,
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
    toggleWatchedSignalForWire,
    transformSelection: transformSelectionIntoSubcircuit,
    saveComponentToLibrary: saveComponentDefinitionToLibrary,
    setRenameRequest,
  });

  const [wireStyle, setWireStyle] = useWireStylePreference(WIRE_STYLE_STORAGE_KEY);
  const truthPanel = useResizableSidePanel(320, 260, 620);
  const waveformPanel = useResizableBottomPanel(260, 150, 520);

  // circuitHasFeedback roda sobre o grafo achatado (memoizado): uma realimentação que
  // atravessa a fronteira de uma instância de subcircuito só aparece depois de expandida.
  const flattenedScope = useMemo(
    () => (hierarchyBlocked ? null : flattenCircuit(scopedCircuit, definitions)),
    [scopedCircuit, definitions, hierarchyBlocked],
  );
  const hasFeedback = flattenedScope ? circuitHasFeedback(flattenedScope.flat) : false;
  const currentExample =
    CIRCUIT_EXAMPLES.find((example) => example.id === currentExampleId) ?? null;

  function openLessonExample(exampleId: string) {
    if (loadExample(exampleId)) setSidePanelTab('lesson');
  }

  const localAutosaveStatus = useAutoSaveWorkspace(workspace);
  useReleaseMomentaryButtons(setCircuit);

  // Reset editor state when switching documents, without emitting a status
  // message: the handler that switched the document already set its own.
  // Simulation state (tick count, waveform history) is NOT reset here anymore --
  // useSimulationController reacts to the same scopeKey on its own, restoring each
  // document/definition's own tick/waveform history instead of wiping it.
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setSelectedTool('select');
    setPendingWire(null);
    setPendingSubcircuitDefinitionId(null);
    clearSelection();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeDocumentId, activeDefinitionId]);

  function restoreCircuit(nextCircuit: CircuitDocument, nextMessage: string) {
    pauseSimulationForHistoryRestore();
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

  function toggleHandTool() {
    if (selectedTool === 'pan') {
      setSelectedTool('select');
      setMessage('Modo selecionar.');
      return;
    }
    setSelectedTool('pan');
    setMessage('Ferramenta Mão ativa.');
  }

  function cancelEditorInteraction() {
    if (contextMenu) {
      closeContextMenu();
      return;
    }
    const hadPendingWire = Boolean(pendingWire);
    setPendingWire(null);
    setSelectedTool('select');
    setMessage(hadPendingWire ? 'Conexão cancelada. Modo selecionar.' : 'Modo selecionar.');
  }

  const importJsonFromFile = useEventCallback(() => {
    fileInputRef.current?.click();
  });

  const zoomIn = useEventCallback(() => {
    cameraCommandsRef.current?.zoomIn();
  });

  const zoomOut = useEventCallback(() => {
    cameraCommandsRef.current?.zoomOut();
  });

  const resetZoom = useEventCallback(() => {
    cameraCommandsRef.current?.resetZoom();
  });

  const zoomToFit = useEventCallback(() => {
    cameraCommandsRef.current?.zoomToFit();
  });

  const dialogOpen =
    pendingCloseDocument !== null ||
    remoteBrowserOpen ||
    conflict !== null ||
    libraryDialogOpen ||
    libraryConflict !== null ||
    shortcutHelpOpen;

  const commandBindings: EditorCommandBindings = {
    'file.new': { run: createNewDocument },
    'file.openCircuits': { run: openRemoteBrowser },
    'file.openLibrary': { run: openLibraryDialog },
    'file.save': {
      run: () => void saveActiveDocument(),
      enabled: !hierarchyBlocked,
    },
    'file.saveAs': {
      run: () => void saveActiveDocumentAs(),
      enabled: !hierarchyBlocked,
    },
    'file.importJson': { run: importJsonFromFile },
    'file.downloadJson': { run: downloadActiveDocument },
    'file.exportPng': {
      run: () => void exportImage('png'),
      enabled: circuit.components.length > 0,
    },
    'file.exportSvg': {
      run: () => void exportImage('svg'),
      enabled: circuit.components.length > 0,
    },
    'edit.undo': { run: undo, enabled: canUndo },
    'edit.redo': { run: redo, enabled: canRedo },
    'edit.copy': { run: onCopy, enabled: hasSelection(selection) },
    'edit.paste': { run: onPaste, enabled: clipboard !== null },
    'edit.delete': { run: removeSelection, enabled: hasSelection(selection) },
    'view.zoomIn': { run: zoomIn },
    'view.zoomOut': { run: zoomOut },
    'view.zoomReset': { run: resetZoom },
    'view.zoomFit': { run: zoomToFit },
    'view.toggleHand': {
      run: toggleHandTool,
      checked: selectedTool === 'pan',
    },
    'view.selectTool': {
      run: () => {
        setSelectedTool('select');
        setMessage('Modo selecionar.');
      },
      checked: selectedTool === 'select',
    },
    'view.toggleWaveforms': {
      run: () => setWaveformPanelOpen((open) => !open),
      checked: waveformPanelOpen,
    },
    'help.shortcuts': { run: () => setShortcutHelpOpen(true) },
    'editor.cancel': { run: cancelEditorInteraction },
  };
  const commands = createEditorCommands(commandBindings);
  useCommandShortcuts(commands, { suspended: dialogOpen });

  return (
    <main className="app-shell">
      <header className="app-titlebar">
        <div className="brand-block">
          <span className="app-icon">OC</span>
          <strong>OpenCircuit</strong>
          <span className="project-name">Projeto: {activeDocument.name}</span>
        </div>
      </header>

      <EditorCommandProvider commands={commands}>
        <CommandBar
          wireStyle={wireStyle}
          lessons={CIRCUIT_LESSONS}
          autoClockRunning={autoClockRunning}
          autoClockIntervalMs={autoClockIntervalMs}
          fileInputRef={fileInputRef}
          onLoadExample={openLessonExample}
          onTick={tickSequentialCircuit}
          onToggleAutoClock={toggleAutoClock}
          onAutoClockIntervalChange={setAutoClockIntervalMs}
          onResetSimulation={resetSimulation}
          onWireStyleChange={setWireStyle}
          onImportJson={importJson}
        />
      </EditorCommandProvider>

      <section
        className="app-layout"
        style={{ gridTemplateColumns: `250px minmax(520px, 1fr) 8px ${truthPanel.width}px` }}
      >
        <ComponentLibrary
          selectedTool={selectedTool}
          onSelectTool={setSelectedTool}
          definitions={definitions}
          excludeDefinitionIds={navigationPath}
          selectedSubcircuitDefinitionId={pendingSubcircuitDefinitionId}
          onSelectSubcircuit={(definitionId) => {
            setPendingSubcircuitDefinitionId(definitionId);
            setSelectedTool('subcircuit');
          }}
          onSaveDefinitionToLibrary={saveDefinitionByIdToLibrary}
        />

        <div className="center-panel">
          <EditorCommandProvider commands={commands}>
            <DocumentTabs
              documents={documents}
              activeDocumentId={activeDocumentId}
              remoteDocumentIds={remoteDocumentIds}
              libraryDocumentIds={libraryDocumentIds}
              onSelect={selectDocument}
              onRequestClose={requestCloseDocument}
              onRename={renameDocument}
            />
          </EditorCommandProvider>
          <div className="definitions-bar">
            <span className="definitions-bar-label">Subcircuitos:</span>
            {definitions.length === 0 && (
              <span className="definitions-bar-empty">nenhum ainda</span>
            )}
            {definitions.map((definition) => (
              <button
                key={definition.id}
                className={activeDefinitionId === definition.id ? 'active' : ''}
                onClick={() => enterDefinitionDirect(definition.id)}
              >
                {definition.name}
              </button>
            ))}
            <button className="definitions-bar-create" onClick={createDefinition}>
              + Nova definição
            </button>
            {activeDefinition && (
              <button
                className="definitions-bar-save-library"
                onClick={() => void saveActiveDefinitionToLibrary()}
              >
                Salvar na biblioteca
              </button>
            )}
          </div>
          <div className="editor-panel">
            {localAutosaveStatus === 'failed' && (
              <LocalAutosaveWarning onDownload={downloadActiveDocument} />
            )}
            <DefinitionBreadcrumb
              navigationPath={navigationPath}
              definitions={definitions}
              onNavigate={goToBreadcrumbIndex}
            />
            {hierarchyViolation && (
              <div className="hierarchy-recovery-banner" role="alert">
                <strong>Modo de recuperação.</strong>{' '}
                {formatHierarchyExpansionViolation(hierarchyViolation)} A simulação, o clock, a
                tabela verdade e o salvamento remoto ficam bloqueados. Remova instâncias ou
                simplifique definições; o canvas e o download do JSON continuam disponíveis.
              </div>
            )}
            {!activeDefinition && historyTick !== null && (
              <div className="history-view-banner">
                <span>
                  Visualizando tick <strong>{historyTick}</strong> (histórico)
                </span>
                <button onClick={() => selectHistoryTick(null)}>Voltar ao vivo</button>
              </div>
            )}
            <Profiler id="CircuitCanvas" onRender={recordReactProfile}>
              <EditorCommandProvider commands={commands}>
                <CircuitCanvas
                  cameraCommandsRef={cameraCommandsRef}
                  circuit={scopedCircuit}
                  evaluation={canvasEvaluation}
                  changedSignals={canvasChangedSignals}
                  selectedTool={selectedTool}
                  wireStyle={wireStyle}
                  pendingWire={pendingWire}
                  selection={selection}
                  renameRequest={renameRequest}
                  onRenameRequestHandled={() => setRenameRequest(null)}
                  definitions={definitions}
                  pendingSubcircuitDefinitionId={pendingSubcircuitDefinitionId}
                  onCanvasAdd={addComponent}
                  onBeginMoveComponent={beginMoveComponent}
                  onMoveComponents={moveComponents}
                  onResizeTextComponent={resizeTextComponent}
                  onToggleInput={toggleInput}
                  onSetButtonPressed={setButtonPressed}
                  onPinClick={onPinClick}
                  onEnterInstance={enterInstance}
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
              </EditorCommandProvider>
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
                onClick={commands['view.toggleWaveforms'].run}
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
                  onRemoveSignal={toggleWatchedSignal}
                  historyTick={historyTick}
                  onSelectTick={selectHistoryTick}
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
                {historyTick !== null && ` (tick ${historyTick})`}
              </div>
              {hierarchyBlocked ? (
                <div className="properties-card muted-card">
                  Análise desativada enquanto o documento estiver no modo de recuperação.
                </div>
              ) : (
                <CircuitTruthTable
                  circuit={scopedCircuit}
                  evaluation={canvasEvaluation}
                  simulationStatus={simulationResult.status}
                  hasFeedback={hasFeedback}
                  definitions={definitions}
                  scopeName={activeDefinition?.name}
                />
              )}
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
                onLoadExample={openLessonExample}
              />
            </div>
          )}
        </aside>
      </section>

      <footer className="statusbar app-footer">
        <span>{message}</span>
        <span>
          {localAutosaveLabel(localAutosaveStatus)} · servidor: {syncLabel(activeSyncState)} ·{' '}
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

      {libraryDialogOpen && (
        <LibraryDialog
          entries={libraryEntries}
          loading={libraryLoading}
          onInsert={(id) => void insertLibraryDefinition(id)}
          onEdit={openLibraryEntryForEditing}
          onDelete={deleteLibraryEntry}
          onRefresh={refreshLibraryEntries}
          onClose={closeLibraryDialog}
        />
      )}

      {libraryConflict && (
        <ConflictDialog
          documentName={
            documents.find((item) => item.id === libraryConflict.documentId)?.name ?? 'componente'
          }
          onReload={reloadLibraryConflict}
          onSaveCopy={saveLibraryConflictAsCopy}
          onClose={closeLibraryConflict}
        />
      )}

      {shortcutHelpOpen && (
        <EditorCommandProvider commands={commands}>
          <ShortcutHelpDialog onClose={() => setShortcutHelpOpen(false)} />
        </EditorCommandProvider>
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
          onToggleWatchedSignal={toggleWatchedSignalContextTarget}
          wireSignalWatched={(() => {
            if (contextMenu.kind !== 'wire') return false;
            const wire = circuit.wires.find((candidate) => candidate.id === contextMenu.wireId);
            if (!wire) return false;
            return effectiveWatchedSignalKeys(circuit, activeDocument.watchedSignals).includes(
              signalKey(wire.from.componentId, wire.from.pinId),
            );
          })()}
          onTransformSelection={transformContextTarget}
          componentIsSubcircuitInstance={
            contextMenu.kind === 'component' &&
            scopedCircuit.components.find((component) => component.id === contextMenu.componentId)
              ?.type === 'subcircuit'
          }
          onSaveToLibrary={saveToLibraryContextTarget}
          onRemove={removeContextTarget}
          onClose={closeContextMenu}
        />
      )}
    </main>
  );
}

function syncLabel(state: import('./hooks/useWorkspaceManager').RemoteSyncState): string {
  return {
    idle: 'não sincronizado',
    saving: 'salvando…',
    saved: 'salvo',
    offline: 'offline',
    error: 'erro ao salvar',
    conflict: 'conflito',
  }[state];
}

function localAutosaveLabel(status: LocalAutosaveStatus): string {
  return {
    saving: 'autosave local: salvando…',
    saved: 'autosave local: salvo',
    failed: 'autosave local: falhou',
    recovered: 'autosave local: recuperado',
  }[status];
}
