import { Profiler, useEffect, useMemo, useRef, useState, type SetStateAction } from 'react';
import type { CircuitDefinition, CircuitDocument, GateType } from '../core/types';
import { flattenCircuit } from '../core/hierarchy/flatten';
import { nextDefinitionId } from '../core/hierarchy/scope';
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
import { useEditorKeyboardShortcuts } from './hooks/useEditorKeyboardShortcuts';
import { useReleaseMomentaryButtons } from './hooks/useReleaseMomentaryButtons';
import { useResizableSidePanel } from './hooks/useResizableSidePanel';
import { useWireStylePreference } from './hooks/useWireStylePreference';
import {
  extractSelectionIntoDefinition,
  GRID,
  hasSelection,
  normalizeCircuitForEditor,
  pushDefinitionPath,
  truncateDefinitionPath,
} from './app/editorUtils';
import { DefinitionBreadcrumb } from './panels/DefinitionBreadcrumb';
import { ContextMenuView } from './context-menu/ContextMenuView';
import { ConfirmCloseDialog } from './dialogs/ConfirmCloseDialog';
import { RemoteCircuitsDialog } from './dialogs/RemoteCircuitsDialog';
import { LibraryDialog } from './dialogs/LibraryDialog';
import { ConflictDialog } from './dialogs/ConflictDialog';
import { libraryApi } from '../state/libraryApi';
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

  // Fase 1-3 (subcircuitos, issue #18): editar a raiz ou uma definição usa o mesmo par
  // circuit/setCircuit (useCircuitEditor não precisa saber a diferença), só trocando qual
  // "fatia" do documento é exposta. navigationPath é uma pilha de ids de definição --
  // duplo-clique numa instância empilha (Fase 3), a barra "Subcircuitos" salta direto
  // (substitui a pilha). scopedCircuit/setScopedCircuit só enxergam o topo da pilha
  // (activeDefinitionId, derivado), nunca o caminho inteiro -- não precisam mudar entre
  // navegação plana (Fase 1) e aninhada (Fase 3).
  const definitions = useMemo(() => circuit.definitions ?? [], [circuit.definitions]);
  const [navigationPath, setNavigationPath] = useState<string[]>([]);
  const [pendingSubcircuitDefinitionId, setPendingSubcircuitDefinitionId] = useState<string | null>(
    null,
  );
  const activeDefinitionId = navigationPath[navigationPath.length - 1] ?? null;
  const activeDefinition = activeDefinitionId
    ? (definitions.find((definition) => definition.id === activeDefinitionId) ?? null)
    : null;

  const scopedCircuit = useMemo<CircuitDocument>(
    () =>
      activeDefinition
        ? { version: 1, components: activeDefinition.components, wires: activeDefinition.wires }
        : circuit,
    [activeDefinition, circuit],
  );

  function setScopedCircuit(action: SetStateAction<CircuitDocument>) {
    setCircuit((previousFull) => {
      if (!activeDefinitionId) {
        return typeof action === 'function' ? action(previousFull) : action;
      }
      const previousDefinitions = previousFull.definitions ?? [];
      const previousDefinition = previousDefinitions.find(
        (definition) => definition.id === activeDefinitionId,
      );
      if (!previousDefinition) return previousFull;
      const previousScoped: CircuitDocument = {
        version: 1,
        components: previousDefinition.components,
        wires: previousDefinition.wires,
      };
      const nextScoped = typeof action === 'function' ? action(previousScoped) : action;
      return {
        ...previousFull,
        definitions: previousDefinitions.map((definition) =>
          definition.id === activeDefinitionId
            ? { ...definition, components: nextScoped.components, wires: nextScoped.wires }
            : definition,
        ),
      };
    });
  }

  function enterDefinitionDirect(definitionId: string) {
    // Barra "Subcircuitos" e "+ Nova definição": salto direto, descarta qualquer
    // caminho aninhado atual (diferente de enterInstance, que empilha).
    setNavigationPath([definitionId]);
    setMessage('Editando definição de subcircuito.');
  }

  function enterInstance(componentId: string) {
    // Duplo-clique numa instância de subcircuito: empilha sobre o caminho atual.
    const component = scopedCircuit.components.find((candidate) => candidate.id === componentId);
    if (!component || component.type !== 'subcircuit' || !component.definitionId) return;
    if (!definitions.some((definition) => definition.id === component.definitionId)) return;
    setNavigationPath((path) => pushDefinitionPath(path, component.definitionId!));
    setMessage('Editando definição de subcircuito.');
  }

  function goToBreadcrumbIndex(index: number) {
    setNavigationPath((path) => truncateDefinitionPath(path, index));
    setMessage(
      index === -1 ? 'De volta ao circuito principal.' : 'Editando definição de subcircuito.',
    );
  }

  function createDefinition() {
    const name = window.prompt('Nome do novo subcircuito:', 'Novo subcircuito');
    if (!name || !name.trim()) return;
    const id = nextDefinitionId(definitions);
    rememberCircuit();
    setCircuit((current) => ({
      ...current,
      definitions: [
        ...(current.definitions ?? []),
        { id, name: name.trim(), components: [], wires: [] },
      ],
    }));
    enterDefinitionDirect(id);
  }

  function transformSelectionIntoSubcircuit(componentIds: string[]) {
    if (componentIds.length === 0) {
      setMessage('Selecione ao menos um componente para transformar em subcircuito.');
      return;
    }
    const name = window.prompt('Nome do novo subcircuito:', 'Novo subcircuito');
    if (!name || !name.trim()) return;

    const definitionId = nextDefinitionId(definitions);
    const result = extractSelectionIntoDefinition(
      scopedCircuit,
      componentIds,
      definitionId,
      name.trim(),
      GRID,
    );
    if (!result) return;

    rememberCircuit();
    setCircuit((current) => {
      const currentDefinitions = current.definitions ?? [];
      if (!activeDefinition) {
        return {
          ...current,
          components: result.scope.components,
          wires: result.scope.wires,
          definitions: [...currentDefinitions, result.definition],
        };
      }
      return {
        ...current,
        definitions: [
          ...currentDefinitions.map((definition) =>
            definition.id === activeDefinition.id
              ? { ...definition, components: result.scope.components, wires: result.scope.wires }
              : definition,
          ),
          result.definition,
        ],
      };
    });
    setSelection({ componentIds: [result.instanceId], wireIds: [] });
    setMessage(`Subcircuito "${name.trim()}" criado.`);
  }

  async function saveDefinitionToLibraryFlow(definition: CircuitDefinition) {
    if (definition.components.some((component) => component.type === 'subcircuit')) {
      setMessage(
        'Não é possível salvar na biblioteca: essa definição referencia outro subcircuito, e a biblioteca ainda não suporta aninhamento.',
      );
      return;
    }
    const name = window.prompt('Nome do componente na biblioteca:', definition.name)?.trim();
    if (!name) return;
    await saveDefinitionToLibrary(name, {
      components: definition.components,
      wires: definition.wires,
    });
  }

  async function saveActiveDefinitionToLibrary() {
    if (!activeDefinition) return;
    await saveDefinitionToLibraryFlow(activeDefinition);
  }

  function saveDefinitionByIdToLibrary(definitionId: string) {
    const definition = definitions.find((item) => item.id === definitionId);
    if (!definition) return;
    void saveDefinitionToLibraryFlow(definition);
  }

  function saveComponentDefinitionToLibrary(componentId: string) {
    const component = scopedCircuit.components.find((item) => item.id === componentId);
    if (!component || component.type !== 'subcircuit' || !component.definitionId) return;
    const definition = definitions.find((item) => item.id === component.definitionId);
    if (!definition) {
      setMessage('Definição do subcircuito não encontrada.');
      return;
    }
    void saveDefinitionToLibraryFlow(definition);
  }

  async function insertLibraryDefinition(id: string) {
    try {
      const stored = await libraryApi.get(id);
      const freshId = nextDefinitionId(definitions);
      rememberCircuit();
      setCircuit((current) => ({
        ...current,
        definitions: [
          ...(current.definitions ?? []),
          {
            id: freshId,
            name: stored.name,
            components: stored.definition.components,
            wires: stored.definition.wires,
          },
        ],
      }));
      closeLibraryDialog();
      setPendingSubcircuitDefinitionId(freshId);
      setSelectedTool('subcircuit');
      setMessage(`Componente "${stored.name}" pronto para posicionar no canvas.`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Não foi possível inserir o componente.');
    }
  }

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
  });

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
  } = useSimulationController({
    circuit: scopedCircuit,
    setCircuit: setScopedCircuit,
    definitions,
    watchedSignals: activeDocument.watchedSignals,
    setWatchedSignals,
    rememberCircuit,
    onMessage: setMessage,
    // Root document scope has no activeDefinitionId; keep the separator so a document
    // id can never collide with a "documentId + definitionId" pair from another one.
    scopeKey: `${activeDocumentId}:${activeDefinitionId ?? ''}`,
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
    () => flattenCircuit(scopedCircuit, definitions),
    [scopedCircuit, definitions],
  );
  const hasFeedback = circuitHasFeedback(flattenedScope.flat);
  const currentExample =
    CIRCUIT_EXAMPLES.find((example) => example.id === currentExampleId) ?? null;

  useAutoSaveWorkspace(workspace);
  useReleaseMomentaryButtons(setCircuit);

  useEditorKeyboardShortcuts({
    selection,
    pendingWire,
    contextMenu,
    dialogOpen:
      pendingCloseDocument !== null ||
      remoteBrowserOpen ||
      conflict !== null ||
      libraryDialogOpen ||
      libraryConflict !== null,
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

  // Separate from the effect above (which already re-fires on every navigationPath
  // change, since activeDefinitionId derives from it): switching documents must not
  // leave you N levels deep in a definition from the PREVIOUS document. This can't
  // live in the same effect -- keying it on navigationPath there would zero out the
  // path you just pushed via enterInstance, fighting the navigation itself.
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setNavigationPath([]);
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
        onOpenLibrary={openLibraryDialog}
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
          <DocumentTabs
            documents={documents}
            activeDocumentId={activeDocumentId}
            remoteDocumentIds={remoteDocumentIds}
            libraryDocumentIds={libraryDocumentIds}
            onSelect={selectDocument}
            onRequestClose={requestCloseDocument}
            onRename={renameDocument}
            onCreate={createNewDocument}
          />
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
            <DefinitionBreadcrumb
              navigationPath={navigationPath}
              definitions={definitions}
              onNavigate={goToBreadcrumbIndex}
            />
            {!activeDefinition && historyTick !== null && (
              <div className="history-view-banner">
                <span>
                  Visualizando tick <strong>{historyTick}</strong> (histórico)
                </span>
                <button onClick={() => selectHistoryTick(null)}>Voltar ao vivo</button>
              </div>
            )}
            <Profiler id="CircuitCanvas" onRender={recordReactProfile}>
              <CircuitCanvas
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
              <CircuitTruthTable
                circuit={scopedCircuit}
                evaluation={canvasEvaluation}
                unstable={simulationResult.unstable}
                hasFeedback={hasFeedback}
                definitions={definitions}
                scopeName={activeDefinition?.name}
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
    idle: 'rascunho local',
    saving: 'salvando…',
    saved: 'salvo',
    offline: 'offline',
    error: 'erro ao salvar',
    conflict: 'conflito',
  }[state];
}
