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
import { DeleteLibraryEntryDialog } from './library/DeleteLibraryEntryDialog';
import { PublishLibraryDefinitionDialog } from './library/PublishLibraryDefinitionDialog';
import { SubcircuitPlacementBanner } from './library/SubcircuitPlacementBanner';
import { useWorkspaceManager } from './hooks/useWorkspaceManager';
import { useCircuitEditor } from './hooks/useCircuitEditor';
import { useSimulationController } from './hooks/useSimulationController';
import { useContextMenuManager } from './hooks/useContextMenu';
import { useResizableBottomPanel } from './hooks/useResizableBottomPanel';
import type { EditorTool } from './editor/editorTypes';
import { useDefinitionWorkspace } from './hooks/useDefinitionWorkspace';
import { LocalAutosaveWarning } from './banners/LocalAutosaveWarning';
import { createEditorCommands, type EditorCommandBindings } from './commands/editorCommands';
import { EditorCommandProvider } from './commands/EditorCommandContext';
import { ShortcutHelpDialog } from './dialogs/ShortcutHelpDialog';
import type { CanvasCameraCommands } from './editor/CanvasViewport';
import { useEventCallback } from './hooks/useEventCallback';
import {
  DefinitionNameDialog,
  type DefinitionNameDialogMode,
} from './definitions/DefinitionNameDialog';
import { DeleteDefinitionDialog } from './definitions/DeleteDefinitionDialog';
import { DefinitionBar } from './definitions/DefinitionBar';
import { EmptyDefinitionGuide } from './definitions/EmptyDefinitionGuide';
import {
  closePersistencePresentation,
  copyCommandPresentation,
  localProtectionLabel,
  persistencePresentation,
  saveCommandPresentation,
} from './persistence/documentPersistence';
import { PersistenceIndicator } from './persistence/PersistenceIndicator';
import { PersistenceNameDialog } from './persistence/PersistenceNameDialog';

const HISTORY_LIMIT = 100;
const WIRE_STYLE_STORAGE_KEY = 'opencircuit-wire-style';
type DefinitionNameDialogState = {
  mode: DefinitionNameDialogMode;
  definitionId?: string;
  componentIds?: string[];
};

export function App() {
  const [message, setMessage] = useState('Pronto para testar lógica.');
  const [sidePanelTab, setSidePanelTab] = useState<'truth' | 'lesson'>('truth');
  const [waveformPanelOpen, setWaveformPanelOpen] = useState(false);
  const [selectedTool, setSelectedTool] = useState<EditorTool>('select');
  const [shortcutHelpOpen, setShortcutHelpOpen] = useState(false);
  const [definitionNameDialog, setDefinitionNameDialog] =
    useState<DefinitionNameDialogState | null>(null);
  const [deleteDefinitionId, setDeleteDefinitionId] = useState<string | null>(null);
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
    pendingPersistenceSave,
    confirmPersistenceSave,
    cancelPersistenceSave,
    downloadActiveDocument,
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
    libraryEntries,
    libraryDialogOpen,
    libraryLoading,
    openLibraryDialog,
    closeLibraryDialog,
    refreshLibraryEntries,
    openLibraryEntryForEditing,
    requestDeleteLibraryEntry,
    pendingDeleteLibraryEntry,
    deletingLibraryEntry,
    confirmDeleteLibraryEntry,
    cancelDeleteLibraryEntry,
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
    pendingLibraryPublication,
    confirmDefinitionPublication,
    cancelDefinitionPublication,
    pendingLibraryInsertId,
    enterDefinitionDirect,
    enterInstance,
    goToBreadcrumbIndex,
    createDefinition,
    transformSelectionIntoSubcircuit: transformDefinitionSelection,
    renameDefinition,
    deleteUnusedDefinition,
    getDefinitionUsages,
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
  const activePersistence = persistencePresentation(activeDocument, activeSyncState);
  const activeSaveCommand = saveCommandPresentation(activeDocument, activeSyncState);
  const activeCopyCommand = copyCommandPresentation(activeDocument, activeSyncState);
  const pendingClosePersistence = pendingCloseDocument
    ? closePersistencePresentation(pendingCloseDocument)
    : null;
  const pendingPlacementDefinition =
    definitions.find((definition) => definition.id === pendingSubcircuitDefinitionId) ?? null;

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
    clearSelectionWithMessage,
    selectComponent,
    toggleComponentSelection,
    selectWire,
    toggleWireSelection,
    selectItems,
    selectAll,
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

  function requestTransformSelection(componentIds: string[]) {
    if (componentIds.length === 0) {
      setMessage('Selecione ao menos um componente para transformar em subcircuito.');
      return;
    }
    if (hierarchyBlocked) {
      setMessage('Corrija o limite de hierarquia antes de criar outro subcircuito.');
      return;
    }
    setDefinitionNameDialog({ mode: 'transform', componentIds });
  }

  function confirmDefinitionName(name: string): boolean {
    if (!definitionNameDialog) return false;

    let succeeded = false;
    if (definitionNameDialog.mode === 'create') {
      succeeded = createDefinition(name) !== null;
    } else if (definitionNameDialog.mode === 'transform') {
      const instanceId = transformDefinitionSelection(
        definitionNameDialog.componentIds ?? [],
        name,
      );
      if (instanceId) {
        setSelection({ componentIds: [instanceId], wireIds: [] });
        succeeded = true;
      }
    } else if (definitionNameDialog.definitionId) {
      succeeded = renameDefinition(definitionNameDialog.definitionId, name);
    }

    if (succeeded) setDefinitionNameDialog(null);
    return succeeded;
  }

  function confirmDeleteDefinition() {
    if (!deleteDefinitionId) return;
    if (deleteUnusedDefinition(deleteDefinitionId)) setDeleteDefinitionId(null);
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
    editSubcircuitContextTarget,
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
    transformSelection: requestTransformSelection,
    enterSubcircuit: enterInstance,
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
    if (pendingWire) {
      cancelPendingWire();
      return;
    }
    if (selectedTool !== 'select') {
      cancelSubcircuitPlacement();
      return;
    }
    if (hasSelection(selection)) {
      clearSelectionWithMessage();
    }
  }

  function cancelSubcircuitPlacement() {
    setSelectedTool('select');
    setPendingSubcircuitDefinitionId(null);
    setMessage('Modo selecionar.');
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
    shortcutHelpOpen ||
    definitionNameDialog !== null ||
    deleteDefinitionId !== null ||
    pendingPersistenceSave !== null ||
    pendingLibraryPublication !== null ||
    pendingDeleteLibraryEntry !== null;

  const transformSelectionDescription = hierarchyBlocked
    ? 'Indisponível no modo de recuperação: corrija o limite de hierarquia primeiro.'
    : selection.componentIds.length === 0
      ? 'Selecione ao menos um componente para criar um subcircuito.'
      : `Transforma ${
          selection.componentIds.length === 1
            ? 'o componente selecionado'
            : `${selection.componentIds.length} componentes selecionados`
        } em uma definição reutilizável.`;

  const commandBindings: EditorCommandBindings = {
    'file.new': { run: createNewDocument },
    'file.openCircuits': { run: openRemoteBrowser },
    'file.openLibrary': { run: openLibraryDialog },
    'file.save': {
      run: () => void saveActiveDocument(),
      enabled: !hierarchyBlocked && activeSaveCommand.enabled,
      label: activeSaveCommand.label,
      description: hierarchyBlocked
        ? 'Indisponível no modo de recuperação: corrija o limite de hierarquia primeiro.'
        : activeSaveCommand.description,
    },
    'file.saveAs': {
      run: () => void saveActiveDocumentAs(),
      enabled: !hierarchyBlocked && activeCopyCommand.enabled,
      label: activeCopyCommand.label,
      description: hierarchyBlocked
        ? 'Indisponível no modo de recuperação: corrija o limite de hierarquia primeiro.'
        : activeCopyCommand.description,
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
    'edit.selectAll': {
      run: selectAll,
      enabled: scopedCircuit.components.length > 0 || scopedCircuit.wires.length > 0,
    },
    'edit.transformSelection': {
      run: () => requestTransformSelection(selection.componentIds),
      enabled: selection.componentIds.length > 0 && !hierarchyBlocked,
      description: transformSelectionDescription,
    },
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
          <PersistenceIndicator presentation={activePersistence} />
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
            const definition = definitions.find((candidate) => candidate.id === definitionId);
            setMessage(
              `Subcircuito "${definition?.name ?? 'selecionado'}" pronto para posicionar. Clique no canvas; Escape cancela.`,
            );
          }}
          onSaveDefinitionToLibrary={saveDefinitionByIdToLibrary}
        />

        <div className="center-panel">
          <EditorCommandProvider commands={commands}>
            <DocumentTabs
              documents={documents}
              activeDocumentId={activeDocumentId}
              onSelect={selectDocument}
              onRequestClose={requestCloseDocument}
              onRename={renameDocument}
            />
          </EditorCommandProvider>
          <DefinitionBar
            circuit={circuit}
            definitions={definitions}
            activeDefinitionId={activeDefinitionId}
            transformCommand={commands['edit.transformSelection']}
            onEnter={enterDefinitionDirect}
            onCreate={() => setDefinitionNameDialog({ mode: 'create' })}
            onRename={(definitionId) => setDefinitionNameDialog({ mode: 'rename', definitionId })}
            onDelete={setDeleteDefinitionId}
            onSaveToLibrary={saveDefinitionByIdToLibrary}
          />
          <div className="editor-panel">
            {localAutosaveStatus === 'failed' && (
              <LocalAutosaveWarning onDownload={downloadActiveDocument} />
            )}
            <DefinitionBreadcrumb
              navigationPath={navigationPath}
              definitions={definitions}
              onNavigate={goToBreadcrumbIndex}
            />
            {pendingPlacementDefinition ? (
              <SubcircuitPlacementBanner
                name={pendingPlacementDefinition.name}
                onCancel={cancelSubcircuitPlacement}
              />
            ) : null}
            {activeDefinition && activeDefinition.components.length === 0 && (
              <EmptyDefinitionGuide
                definition={activeDefinition}
                onReturnToRoot={() => goToBreadcrumbIndex(-1)}
              />
            )}
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
                  onToggleComponentSelection={toggleComponentSelection}
                  onSelectWire={selectWire}
                  onToggleWireSelection={toggleWireSelection}
                  onSelectItems={selectItems}
                  onClearSelection={clearSelectionWithMessage}
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
          {localProtectionLabel(localAutosaveStatus)} · {activePersistence.footerLabel} ·{' '}
          {circuit.components.length} componentes · {circuit.wires.length} fios
        </span>
      </footer>

      {pendingCloseDocument &&
        pendingClosePersistence &&
        !pendingPersistenceSave &&
        !conflict &&
        !libraryConflict && (
          <ConfirmCloseDialog
            documentName={pendingCloseDocument.name}
            description={pendingClosePersistence.description}
            saveLabel={pendingClosePersistence.saveLabel}
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
          destination="remote"
          onReload={reloadConflict}
          onSaveCopy={saveConflictAsCopy}
          onClose={closeConflict}
        />
      )}

      {libraryDialogOpen && !pendingDeleteLibraryEntry && (
        <LibraryDialog
          entries={libraryEntries}
          loading={libraryLoading}
          pendingInsertId={pendingLibraryInsertId}
          onInsert={(id) => void insertLibraryDefinition(id)}
          onEdit={openLibraryEntryForEditing}
          onDelete={requestDeleteLibraryEntry}
          onRefresh={refreshLibraryEntries}
          onClose={closeLibraryDialog}
        />
      )}

      {pendingDeleteLibraryEntry && (
        <DeleteLibraryEntryDialog
          entry={pendingDeleteLibraryEntry}
          linkedDocumentCount={
            documents.filter((document) => document.libraryId === pendingDeleteLibraryEntry.id)
              .length
          }
          deleting={deletingLibraryEntry}
          onCancel={cancelDeleteLibraryEntry}
          onConfirm={confirmDeleteLibraryEntry}
        />
      )}

      {libraryConflict && (
        <ConflictDialog
          documentName={
            documents.find((item) => item.id === libraryConflict.documentId)?.name ?? 'componente'
          }
          destination="library"
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

      {pendingPersistenceSave && (
        <PersistenceNameDialog
          request={pendingPersistenceSave}
          onCancel={cancelPersistenceSave}
          onConfirm={confirmPersistenceSave}
        />
      )}

      {pendingLibraryPublication && (
        <PublishLibraryDefinitionDialog
          definition={pendingLibraryPublication}
          definitions={definitions}
          onCancel={cancelDefinitionPublication}
          onConfirm={confirmDefinitionPublication}
        />
      )}

      {definitionNameDialog && (
        <DefinitionNameDialog
          mode={definitionNameDialog.mode}
          definitions={definitions}
          definitionId={definitionNameDialog.definitionId}
          initialName={
            definitionNameDialog.mode === 'rename'
              ? definitions.find(
                  (definition) => definition.id === definitionNameDialog.definitionId,
                )?.name
              : ''
          }
          selectedComponentCount={definitionNameDialog.componentIds?.length}
          onCancel={() => setDefinitionNameDialog(null)}
          onConfirm={confirmDefinitionName}
        />
      )}

      {deleteDefinitionId &&
        (() => {
          const definition = definitions.find((candidate) => candidate.id === deleteDefinitionId);
          if (!definition) return null;
          return (
            <DeleteDefinitionDialog
              definition={definition}
              usages={getDefinitionUsages(definition.id)}
              onCancel={() => setDeleteDefinitionId(null)}
              onConfirm={confirmDeleteDefinition}
            />
          );
        })()}

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
          onEditSubcircuit={editSubcircuitContextTarget}
          onSaveToLibrary={saveToLibraryContextTarget}
          onRemove={removeContextTarget}
          onClose={closeContextMenu}
        />
      )}
    </main>
  );
}
