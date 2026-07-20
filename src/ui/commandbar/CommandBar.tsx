import type { ChangeEvent, RefObject } from 'react';
import type { GateType } from '../../core/types';
import type { WireStyle } from '../editor/CircuitCanvas';
import type { CircuitImageFormat } from '../editor/exportCircuitImage';

type EditorTool = GateType | 'select' | 'wire' | 'pan';

type ExampleOption = { id: string; name: string; description?: string };
type LessonOption = { id: string; title: string; description: string; examples: ExampleOption[] };

interface Props {
  selectedTool: EditorTool;
  wireStyle: WireStyle;
  lessons: LessonOption[];
  canUndo: boolean;
  canRedo: boolean;
  autoClockRunning: boolean;
  autoClockIntervalMs: number;
  fileInputRef: RefObject<HTMLInputElement | null>;
  onOpen: () => void;
  onSave: () => void;
  onSaveAs: () => void;
  onDownloadJson: () => void;
  onImportClick: () => void;
  onExportImage: (format: CircuitImageFormat) => void;
  onLoadExample: (exampleId: string) => void;
  onUndo: () => void;
  onRedo: () => void;
  onSelectTool: (tool: EditorTool) => void;
  onTick: () => void;
  onToggleAutoClock: () => void;
  onAutoClockIntervalChange: (intervalMs: number) => void;
  onResetSimulation: () => void;
  onWireStyleChange: (style: WireStyle) => void;
  onImportJson: (event: ChangeEvent<HTMLInputElement>) => void;
}

export function CommandBar({
  selectedTool,
  wireStyle,
  lessons,
  canUndo,
  canRedo,
  autoClockRunning,
  autoClockIntervalMs,
  fileInputRef,
  onOpen,
  onSave,
  onSaveAs,
  onDownloadJson,
  onImportClick,
  onExportImage,
  onLoadExample,
  onUndo,
  onRedo,
  onSelectTool,
  onTick,
  onToggleAutoClock,
  onAutoClockIntervalChange,
  onResetSimulation,
  onWireStyleChange,
  onImportJson,
}: Props) {
  return (
    <div className="commandbar">
      <button onClick={onOpen} title="Abrir arquivo (Ctrl+O)">
        Meus circuitos
      </button>
      <button onClick={onSave} title="Salvar (Ctrl+S)">
        Salvar
      </button>
      <button onClick={onSaveAs} title="Salvar como (Ctrl+Shift+S)">
        Salvar como
      </button>
      <button
        onClick={onDownloadJson}
        title="Exporta uma cópia local sem alterar o documento salvo"
      >
        Baixar JSON
      </button>
      <button onClick={onImportClick}>Importar JSON</button>
      <select
        className="examples-select"
        value=""
        onChange={(event) => {
          onExportImage(event.target.value as CircuitImageFormat);
          event.target.value = '';
        }}
        aria-label="Exportar imagem do circuito"
        title="Exporta o circuito inteiro como imagem, independente do zoom atual."
      >
        <option value="" disabled>
          Imagem
        </option>
        <option value="png">Exportar PNG (alta resolução)</option>
        <option value="svg">Exportar SVG (vetorial)</option>
      </select>
      <select
        className="examples-select"
        value=""
        onChange={(event) => {
          onLoadExample(event.target.value);
          event.target.value = '';
        }}
        aria-label="Aulas e exemplos"
        title="Passe o mouse sobre um exemplo para ver sua descrição."
      >
        <option value="" disabled>
          Aulas
        </option>
        {lessons.map((lesson) => (
          <optgroup key={lesson.id} label={lesson.title} title={lesson.description}>
            {lesson.examples.map((example) => (
              <option key={example.id} value={example.id} title={example.description}>
                {example.name}
              </option>
            ))}
          </optgroup>
        ))}
      </select>
      <span className="command-separator" />
      <button onClick={onUndo} disabled={!canUndo}>
        Desfazer
      </button>
      <button onClick={onRedo} disabled={!canRedo}>
        Refazer
      </button>
      <span className="command-separator" />
      <button
        onClick={() => onSelectTool('pan')}
        className={selectedTool === 'pan' ? 'active' : ''}
      >
        Mão
      </button>
      <button
        onClick={() => onSelectTool('select')}
        className={selectedTool === 'select' ? 'active' : ''}
      >
        Selecionar
      </button>
      <button onClick={onTick}>Tick</button>
      <button
        onClick={onToggleAutoClock}
        className={autoClockRunning ? 'active clock-running' : ''}
      >
        {autoClockRunning ? 'Pausar clock' : 'Rodar clock'}
      </button>
      <label className="clock-speed-control">
        Velocidade
        <select
          value={autoClockIntervalMs}
          onChange={(event) => onAutoClockIntervalChange(Number(event.target.value))}
        >
          <option value={1000}>1 Hz</option>
          <option value={500}>2 Hz</option>
          <option value={250}>4 Hz</option>
          <option value={100}>10 Hz</option>
        </select>
      </label>
      <button onClick={onResetSimulation}>Resetar simulação</button>
      <label className="wire-style-control">
        Fios
        <select
          value={wireStyle}
          onChange={(event) => onWireStyleChange(event.target.value as WireStyle)}
        >
          <option value="orthogonal">Ortogonal</option>
          <option value="bezier">Curvo</option>
        </select>
      </label>
      <input
        ref={fileInputRef}
        type="file"
        accept="application/json"
        onChange={onImportJson}
        hidden
      />
    </div>
  );
}
