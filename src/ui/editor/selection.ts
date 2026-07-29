import type { CircuitDocument } from '../../core/types';
import type { Selection } from './editorTypes';

export type SelectionTarget = { kind: 'component'; id: string } | { kind: 'wire'; id: string };

export function toggleSelectionTarget(selection: Selection, target: SelectionTarget): Selection {
  if (target.kind === 'component') {
    return {
      componentIds: toggleId(selection.componentIds, target.id),
      wireIds: selection.wireIds,
    };
  }
  return {
    componentIds: selection.componentIds,
    wireIds: toggleId(selection.wireIds, target.id),
  };
}

export function selectAllInCircuit(circuit: CircuitDocument): Selection {
  return {
    componentIds: circuit.components.map((component) => component.id),
    wireIds: circuit.wires.map((wire) => wire.id),
  };
}

export function selectionMessage(selection: Selection): string {
  const componentCount = selection.componentIds.length;
  const wireCount = selection.wireIds.length;
  if (componentCount === 0 && wireCount === 0) return 'Nada selecionado.';

  const parts: string[] = [];
  if (componentCount > 0) {
    parts.push(`${componentCount} ${componentCount === 1 ? 'componente' : 'componentes'}`);
  }
  if (wireCount > 0) {
    parts.push(`${wireCount} ${wireCount === 1 ? 'fio' : 'fios'}`);
  }

  const subject = parts.join(' e ');
  const singular = componentCount + wireCount === 1;
  return `${subject} ${singular ? 'selecionado' : 'selecionados'}.`;
}

function toggleId(ids: readonly string[], id: string): string[] {
  return ids.includes(id) ? ids.filter((candidate) => candidate !== id) : [...ids, id];
}
