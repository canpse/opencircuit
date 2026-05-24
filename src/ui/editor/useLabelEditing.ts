import { KeyboardEvent as ReactKeyboardEvent, useEffect, useRef, useState } from 'react';
import { COMPONENT_DEFINITIONS } from '../../core/catalog';
import type { LogicComponent } from '../../core/types';

type EditingLabel = { componentId: string; value: string } | null;

export function useLabelEditing(
  componentById: Map<string, LogicComponent>,
  onSelectComponent: (componentId: string) => void,
  onRenameComponent: (componentId: string, label: string) => void,
  onBeforeEdit?: () => void,
) {
  const [editingLabel, setEditingLabel] = useState<EditingLabel>(null);
  const labelInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!editingLabel) return;
    labelInputRef.current?.focus();
    labelInputRef.current?.select();
  }, [editingLabel?.componentId]);

  function startRename(component: LogicComponent) {
    const definition = COMPONENT_DEFINITIONS[component.type];
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
