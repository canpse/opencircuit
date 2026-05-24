import type { ChangeEvent, RefObject } from 'react';
import type { GateType } from '../../core/types';
import type { WireStyle } from '../editor/CircuitCanvas';

type EditorTool = GateType | 'select' | 'wire' | 'pan';

type ExampleOption = { id: string; name: string };

interface Props {
  selectedTool: EditorTool;
  wireStyle: WireStyle;
  examples: ExampleOption[];
  canUndo: boolean;
  canRedo: boolean;
  fileInputRef: RefObject<HTMLInputElement | null>;
  onOpen: () => void;
  onSave: () => void;
  onLoadExample: (exampleId: string) => void;
  onUndo: () => void;
  onRedo: () => void;
  onSelectTool: (tool: EditorTool) => void;
  onTick: () => void;
  onResetSimulation: () => void;
  onWireStyleChange: (style: WireStyle) => void;
  onImportJson: (event: ChangeEvent<HTMLInputElement>) => void;
}

export function CommandBar({
  selectedTool,
  wireStyle,
  examples,
  canUndo,
  canRedo,
  fileInputRef,
  onOpen,
  onSave,
  onLoadExample,
  onUndo,
  onRedo,
  onSelectTool,
  onTick,
  onResetSimulation,
  onWireStyleChange,
  onImportJson,
}: Props) {
  return (
    <div className="commandbar">
      <button onClick={onOpen}>Abrir</button>
      <button onClick={onSave}>Salvar</button>
      <select
        className="examples-select"
        value=""
        onChange={(event) => {
          onLoadExample(event.target.value);
          event.target.value = '';
        }}
        aria-label="Exemplos"
      >
        <option value="" disabled>Exemplos</option>
        {examples.map((example) => (
          <option key={example.id} value={example.id}>{example.name}</option>
        ))}
      </select>
      <span className="command-separator" />
      <button onClick={onUndo} disabled={!canUndo}>Desfazer</button>
      <button onClick={onRedo} disabled={!canRedo}>Refazer</button>
      <span className="command-separator" />
      <button onClick={() => onSelectTool('pan')} className={selectedTool === 'pan' ? 'active' : ''}>Mão</button>
      <button onClick={() => onSelectTool('select')} className={selectedTool === 'select' ? 'active' : ''}>Selecionar</button>
      <button onClick={onTick}>Tick</button>
      <button onClick={onResetSimulation}>Resetar simulação</button>
      <label className="wire-style-control">
        Fios
        <select value={wireStyle} onChange={(event) => onWireStyleChange(event.target.value as WireStyle)}>
          <option value="orthogonal">Ortogonal</option>
          <option value="bezier">Curvo</option>
        </select>
      </label>
      <input ref={fileInputRef} type="file" accept="application/json" onChange={onImportJson} hidden />
    </div>
  );
}
