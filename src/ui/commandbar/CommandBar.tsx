import { useEffect, useRef, useState } from 'react';
import type { ChangeEvent, RefObject } from 'react';
import type { GateType } from '../../core/types';
import type { WireStyle } from '../editor/CircuitCanvas';
import type { CircuitImageFormat } from '../editor/exportCircuitImage';

type EditorTool = GateType | 'select' | 'wire' | 'pan';
type OpenMenu = 'file' | 'export' | null;

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
  const [openMenu, setOpenMenu] = useState<OpenMenu>(null);
  const commandbarRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!openMenu) return;

    function closeOnOutsideClick(event: PointerEvent) {
      if (!commandbarRef.current?.contains(event.target as Node)) setOpenMenu(null);
    }

    function closeOnEscape(event: KeyboardEvent) {
      if (event.key === 'Escape') setOpenMenu(null);
    }

    document.addEventListener('pointerdown', closeOnOutsideClick);
    document.addEventListener('keydown', closeOnEscape);
    return () => {
      document.removeEventListener('pointerdown', closeOnOutsideClick);
      document.removeEventListener('keydown', closeOnEscape);
    };
  }, [openMenu]);

  function runMenuAction(action: () => void) {
    setOpenMenu(null);
    action();
  }

  return (
    <div className="commandbar" ref={commandbarRef}>
      <div className="toolbar-menu">
        <button
          className={openMenu === 'file' ? 'active' : ''}
          aria-haspopup="menu"
          aria-expanded={openMenu === 'file'}
          onClick={() => setOpenMenu((current) => (current === 'file' ? null : 'file'))}
        >
          Arquivo <span className="toolbar-menu-chevron">⌄</span>
        </button>
        {openMenu === 'file' && (
          <div className="toolbar-menu-popover" role="menu" aria-label="Arquivo">
            <button role="menuitem" onClick={() => runMenuAction(onOpen)}>
              <span>Meus circuitos</span>
              <kbd>Ctrl+O</kbd>
            </button>
            <span className="toolbar-menu-divider" />
            <button role="menuitem" onClick={() => runMenuAction(onSave)}>
              <span>Salvar</span>
              <kbd>Ctrl+S</kbd>
            </button>
            <button role="menuitem" onClick={() => runMenuAction(onSaveAs)}>
              <span>Salvar como…</span>
              <kbd>Ctrl+Shift+S</kbd>
            </button>
            <span className="toolbar-menu-divider" />
            <button role="menuitem" onClick={() => runMenuAction(onImportClick)}>
              Importar JSON…
            </button>
          </div>
        )}
      </div>
      <div className="toolbar-menu">
        <button
          className={openMenu === 'export' ? 'active' : ''}
          aria-haspopup="menu"
          aria-expanded={openMenu === 'export'}
          onClick={() => setOpenMenu((current) => (current === 'export' ? null : 'export'))}
        >
          Exportar <span className="toolbar-menu-chevron">⌄</span>
        </button>
        {openMenu === 'export' && (
          <div className="toolbar-menu-popover" role="menu" aria-label="Exportar">
            <button role="menuitem" onClick={() => runMenuAction(onDownloadJson)}>
              <span>Baixar JSON</span>
              <small>Cópia editável</small>
            </button>
            <span className="toolbar-menu-divider" />
            <button role="menuitem" onClick={() => runMenuAction(() => onExportImage('png'))}>
              <span>Baixar imagem PNG</span>
              <small>Alta resolução</small>
            </button>
            <button role="menuitem" onClick={() => runMenuAction(() => onExportImage('svg'))}>
              <span>Baixar imagem SVG</span>
              <small>Formato vetorial</small>
            </button>
          </div>
        )}
      </div>
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
