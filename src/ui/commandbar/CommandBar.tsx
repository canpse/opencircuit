import { useRef, type ChangeEvent, type RefObject } from 'react';
import type { GateType } from '../../core/types';
import type { WireStyle } from '../editor/CircuitCanvas';

type EditorTool = GateType | 'select' | 'wire' | 'pan';

type ExampleOption = { id: string; name: string };
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
  const lessonsMenuRef = useRef<HTMLDetailsElement>(null);

  function loadExampleAndClose(exampleId: string) {
    onLoadExample(exampleId);
    if (lessonsMenuRef.current) lessonsMenuRef.current.open = false;
  }

  return (
    <div className="commandbar">
      <button onClick={onOpen}>Abrir</button>
      <button onClick={onSave}>Salvar</button>
      <details className="lessons-menu" ref={lessonsMenuRef}>
        <summary>Aulas</summary>
        <div className="lessons-popover" role="menu" aria-label="Aulas e exemplos">
          <div className="lessons-popover-header">
            <strong>Aulas guiadas</strong>
            <span>Escolha um experimento para carregar no canvas.</span>
          </div>
          <div className="lesson-list">
            {lessons.map((lesson) => (
              <section className="lesson-card" key={lesson.id}>
                <div className="lesson-card-header">
                  <strong>{lesson.title}</strong>
                  <span>{lesson.description}</span>
                </div>
                <div className="lesson-example-grid">
                  {lesson.examples.map((example) => (
                    <button key={example.id} onClick={() => loadExampleAndClose(example.id)} role="menuitem">
                      {example.name}
                    </button>
                  ))}
                </div>
              </section>
            ))}
          </div>
        </div>
      </details>
      <span className="command-separator" />
      <button onClick={onUndo} disabled={!canUndo}>Desfazer</button>
      <button onClick={onRedo} disabled={!canRedo}>Refazer</button>
      <span className="command-separator" />
      <button onClick={() => onSelectTool('pan')} className={selectedTool === 'pan' ? 'active' : ''}>Mão</button>
      <button onClick={() => onSelectTool('select')} className={selectedTool === 'select' ? 'active' : ''}>Selecionar</button>
      <button onClick={onTick}>Tick</button>
      <button onClick={onToggleAutoClock} className={autoClockRunning ? 'active clock-running' : ''}>
        {autoClockRunning ? 'Pausar clock' : 'Rodar clock'}
      </button>
      <label className="clock-speed-control">
        Velocidade
        <select value={autoClockIntervalMs} onChange={(event) => onAutoClockIntervalChange(Number(event.target.value))}>
          <option value={1000}>1 Hz</option>
          <option value={500}>2 Hz</option>
          <option value={250}>4 Hz</option>
          <option value={100}>10 Hz</option>
        </select>
      </label>
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
