import { useCallback, useEffect, useMemo, useState, type SetStateAction } from 'react';
import { nextDefinitionId } from '../../core/hierarchy/scope';
import type { CircuitDefinition, CircuitDocument } from '../../core/types';
import { libraryApi, type LibraryComponentDefinition } from '../../state/libraryApi';
import {
  extractSelectionIntoDefinition,
  GRID,
  pushDefinitionPath,
  truncateDefinitionPath,
} from '../app/editorUtils';
import type { EditorTool } from '../editor/editorTypes';

interface Options {
  circuit: CircuitDocument;
  setCircuit: (action: SetStateAction<CircuitDocument>) => void;
  activeDocumentId: string;
  rememberCircuit: () => void;
  onMessage: (message: string) => void;
  saveDefinitionToLibrary: (
    name: string,
    definition: LibraryComponentDefinition,
  ) => Promise<boolean>;
  closeLibraryDialog: () => void;
  onSelectTool: (tool: EditorTool) => void;
}

export function useDefinitionWorkspace({
  circuit,
  setCircuit,
  activeDocumentId,
  rememberCircuit,
  onMessage,
  saveDefinitionToLibrary,
  closeLibraryDialog,
  onSelectTool,
}: Options) {
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

  const setScopedCircuit = useCallback(
    (action: SetStateAction<CircuitDocument>) => {
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
    },
    [activeDefinitionId, setCircuit],
  );

  const enterDefinitionDirect = useCallback(
    (definitionId: string) => {
      setNavigationPath([definitionId]);
      onMessage('Editando definição de subcircuito.');
    },
    [onMessage],
  );

  function enterInstance(componentId: string) {
    const component = scopedCircuit.components.find((candidate) => candidate.id === componentId);
    if (!component || component.type !== 'subcircuit' || !component.definitionId) return;
    if (!definitions.some((definition) => definition.id === component.definitionId)) return;
    setNavigationPath((path) => pushDefinitionPath(path, component.definitionId!));
    onMessage('Editando definição de subcircuito.');
  }

  function goToBreadcrumbIndex(index: number) {
    setNavigationPath((path) => truncateDefinitionPath(path, index));
    onMessage(
      index === -1 ? 'De volta ao circuito principal.' : 'Editando definição de subcircuito.',
    );
  }

  function createDefinition() {
    const name = window.prompt('Nome do novo subcircuito:', 'Novo subcircuito');
    if (!name?.trim()) return;
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

  function transformSelectionIntoSubcircuit(componentIds: string[]): string | null {
    if (componentIds.length === 0) {
      onMessage('Selecione ao menos um componente para transformar em subcircuito.');
      return null;
    }
    const name = window.prompt('Nome do novo subcircuito:', 'Novo subcircuito');
    if (!name?.trim()) return null;

    const result = extractSelectionIntoDefinition(
      scopedCircuit,
      componentIds,
      nextDefinitionId(definitions),
      name.trim(),
      GRID,
    );
    if (!result) return null;

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
    onMessage(`Subcircuito "${name.trim()}" criado.`);
    return result.instanceId;
  }

  async function saveDefinitionToLibraryFlow(definition: CircuitDefinition) {
    if (definition.components.some((component) => component.type === 'subcircuit')) {
      onMessage(
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

  function saveActiveDefinitionToLibrary() {
    if (activeDefinition) void saveDefinitionToLibraryFlow(activeDefinition);
  }

  function saveDefinitionByIdToLibrary(definitionId: string) {
    const definition = definitions.find((item) => item.id === definitionId);
    if (definition) void saveDefinitionToLibraryFlow(definition);
  }

  function saveComponentDefinitionToLibrary(componentId: string) {
    const component = scopedCircuit.components.find((item) => item.id === componentId);
    if (!component || component.type !== 'subcircuit' || !component.definitionId) return;
    const definition = definitions.find((item) => item.id === component.definitionId);
    if (!definition) {
      onMessage('Definição do subcircuito não encontrada.');
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
      onSelectTool('subcircuit');
      onMessage(`Componente "${stored.name}" pronto para posicionar no canvas.`);
    } catch (error) {
      onMessage(error instanceof Error ? error.message : 'Não foi possível inserir o componente.');
    }
  }

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setNavigationPath([]);
  }, [activeDocumentId]);

  return {
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
    transformSelectionIntoSubcircuit,
    saveActiveDefinitionToLibrary,
    saveDefinitionByIdToLibrary,
    saveComponentDefinitionToLibrary,
    insertLibraryDefinition,
  };
}
