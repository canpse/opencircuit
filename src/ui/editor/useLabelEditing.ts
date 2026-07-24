import { KeyboardEvent as ReactKeyboardEvent, useEffect, useRef, useState } from 'react';
import { resolveComponentDefinition } from '../../core/catalog';
import type { CircuitDefinition, LogicComponent } from '../../core/types';

type EditingLabel = { componentId: string; value: string } | null;

export function useLabelEditing(
  componentById: Map<string, LogicComponent>,
  onSelectComponent: (componentId: string) => void,
  onRenameComponent: (componentId: string, label: string) => void,
  onBeforeEdit?: () => void,
  definitions: CircuitDefinition[] = [],
) {
  const [editingLabel, setEditingLabel] = useState<EditingLabel>(null);
  const labelInputRef = useRef<HTMLInputElement>(null);
  const editingComponentId = editingLabel?.componentId;

  useEffect(() => {
    if (!editingComponentId) return;
    labelInputRef.current?.focus();
    labelInputRef.current?.select();
  }, [editingComponentId]);

  function startRename(component: LogicComponent) {
    const definition = resolveComponentDefinition(component, definitions);
    onSelectComponent(component.id);
    onBeforeEdit?.();
    setEditingLabel({ componentId: component.id, value: component.label ?? definition.label });
  }

  function commitRename() {
    if (!editingLabel) return;
    const component = componentById.get(editingLabel.componentId);
    if (!component) {
      setEditingLabel(null);
      return;
    }
    const label = editingLabel.value.trim();
    if (label) onRenameComponent(component.id, label);
    setEditingLabel(null);
  }

  function onLabelEditorKeyDown(event: ReactKeyboardEvent<HTMLInputElement>) {
    if (event.key === 'Enter') {
      event.preventDefault();
      commitRename();
    } else if (event.key === 'Escape') {
      event.preventDefault();
      setEditingLabel(null);
    }
  }

  return {
    editingLabel,
    setEditingLabel,
    labelInputRef,
    startRename,
    commitRename,
    onLabelEditorKeyDown,
  };
}
