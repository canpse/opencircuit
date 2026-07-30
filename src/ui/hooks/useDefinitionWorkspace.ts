import { useCallback, useEffect, useMemo, useState, type SetStateAction } from 'react';
import { nextDefinitionId } from '../../core/hierarchy/scope';
import {
  formatHierarchyExpansionViolation,
  inspectCircuitHierarchy,
} from '../../core/hierarchy/expansion.mjs';
import type { CircuitDefinition, CircuitDocument } from '../../core/types';
import { libraryApi, type LibraryComponentDefinition } from '../../state/libraryApi';
import {
  extractSelectionIntoDefinition,
  GRID,
  pushDefinitionPath,
  truncateDefinitionPath,
} from '../app/editorUtils';
import type { EditorTool } from '../editor/editorTypes';
import {
  definitionNameError,
  definitionUsages,
  deleteUnusedDefinitionFromCircuit,
  normalizedDefinitionName,
  renameDefinitionInCircuit,
} from '../definitions/definitionManagement';

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

  function createDefinition(name: string): string | null {
    const error = definitionNameError(name, definitions);
    if (error) {
      onMessage(error);
      return null;
    }
    const id = nextDefinitionId(definitions);
    const normalizedName = normalizedDefinitionName(name);
    rememberCircuit();
    setCircuit((current) => ({
      ...current,
      definitions: [
        ...(current.definitions ?? []),
        { id, name: normalizedName, components: [], wires: [] },
      ],
    }));
    enterDefinitionDirect(id);
    onMessage(
      `Subcircuito "${normalizedName}" criado. Adicione entradas e saídas para expor pinos.`,
    );
    return id;
  }

  function transformSelectionIntoSubcircuit(componentIds: string[], name: string): string | null {
    if (componentIds.length === 0) {
      onMessage('Selecione ao menos um componente para transformar em subcircuito.');
      return null;
    }
    const error = definitionNameError(name, definitions);
    if (error) {
      onMessage(error);
      return null;
    }
    const normalizedName = normalizedDefinitionName(name);

    const result = extractSelectionIntoDefinition(
      scopedCircuit,
      componentIds,
      nextDefinitionId(definitions),
      normalizedName,
      GRID,
      definitions,
    );
    if (!result) return null;

    const currentDefinitions = circuit.definitions ?? [];
    const nextCircuit = !activeDefinitionId
      ? {
          ...circuit,
          components: result.scope.components,
          wires: result.scope.wires,
          definitions: [...currentDefinitions, result.definition],
        }
      : {
          ...circuit,
          definitions: [
            ...currentDefinitions.map((definition) =>
              definition.id === activeDefinitionId
                ? { ...definition, components: result.scope.components, wires: result.scope.wires }
                : definition,
            ),
            result.definition,
          ],
        };
    const hierarchy = inspectCircuitHierarchy(nextCircuit);
    if (!hierarchy.ok) {
      onMessage(
        `${formatHierarchyExpansionViolation(hierarchy.violation)} A transformação foi cancelada.`,
      );
      return null;
    }

    rememberCircuit();
    setCircuit(nextCircuit);
    onMessage(`Subcircuito "${normalizedName}" criado; a seleção virou uma instância.`);
    return result.instanceId;
  }

  function renameDefinition(definitionId: string, name: string): boolean {
    const definition = definitions.find((candidate) => candidate.id === definitionId);
    if (!definition) return false;
    const error = definitionNameError(name, definitions, definitionId);
    if (error) {
      onMessage(error);
      return false;
    }
    const normalizedName = normalizedDefinitionName(name);
    if (definition.name === normalizedName) return true;
    rememberCircuit();
    setCircuit((current) => renameDefinitionInCircuit(current, definitionId, normalizedName));
    onMessage(`Subcircuito renomeado para "${normalizedName}".`);
    return true;
  }

  function deleteUnusedDefinition(definitionId: string): boolean {
    const definition = definitions.find((candidate) => candidate.id === definitionId);
    if (!definition) return false;
    const nextCircuit = deleteUnusedDefinitionFromCircuit(circuit, definitionId);
    if (!nextCircuit) {
      onMessage(`"${definition.name}" ainda possui instâncias e não pode ser excluído.`);
      return false;
    }
    rememberCircuit();
    setCircuit(nextCircuit);
    if (navigationPath.includes(definitionId)) setNavigationPath([]);
    if (pendingSubcircuitDefinitionId === definitionId) {
      setPendingSubcircuitDefinitionId(null);
      onSelectTool('select');
    }
    onMessage(`Subcircuito "${definition.name}" excluído. Use Desfazer para restaurar.`);
    return true;
  }

  function getDefinitionUsages(definitionId: string) {
    return definitionUsages(circuit, definitionId);
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
    renameDefinition,
    deleteUnusedDefinition,
    getDefinitionUsages,
    saveActiveDefinitionToLibrary,
    saveDefinitionByIdToLibrary,
    saveComponentDefinitionToLibrary,
    insertLibraryDefinition,
  };
}
