import { useEffect, useRef, useState } from 'react';
import type { ChangeEvent, KeyboardEvent, RefObject } from 'react';
import {
  COMMAND_MENU_GROUPS,
  commandShortcutLabel,
  type CommandMenuGroup,
  type EditorCommandId,
} from '../commands/editorCommands';
import { useEditorCommand, useEditorCommands } from '../commands/EditorCommandContext';
import type { WireStyle } from '../editor/editorTypes';

type ExampleOption = { id: string; name: string; description?: string };
type LessonOption = { id: string; title: string; description: string; examples: ExampleOption[] };

interface Props {
  wireStyle: WireStyle;
  lessons: LessonOption[];
  autoClockRunning: boolean;
  autoClockIntervalMs: number;
  fileInputRef: RefObject<HTMLInputElement | null>;
  onLoadExample: (exampleId: string) => void;
  onTick: () => void;
  onToggleAutoClock: () => void;
  onAutoClockIntervalChange: (intervalMs: number) => void;
  onResetSimulation: () => void;
  onWireStyleChange: (style: WireStyle) => void;
  onImportJson: (event: ChangeEvent<HTMLInputElement>) => void;
}

export function CommandBar({
  wireStyle,
  lessons,
  autoClockRunning,
  autoClockIntervalMs,
  fileInputRef,
  onLoadExample,
  onTick,
  onToggleAutoClock,
  onAutoClockIntervalChange,
  onResetSimulation,
  onWireStyleChange,
  onImportJson,
}: Props) {
  const [openMenu, setOpenMenu] = useState<CommandMenuGroup | null>(null);
  const commandbarRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!openMenu) return;

    function closeOnOutsideClick(event: PointerEvent) {
      if (!commandbarRef.current?.contains(event.target as Node)) setOpenMenu(null);
    }

    document.addEventListener('pointerdown', closeOnOutsideClick);
    return () => document.removeEventListener('pointerdown', closeOnOutsideClick);
  }, [openMenu]);

  return (
    <div className="commandbar" ref={commandbarRef} aria-label="Comandos do editor">
      <nav className="command-menu-strip" aria-label="Menu principal">
        {COMMAND_MENU_GROUPS.map((group) => (
          <CommandMenu
            key={group.id}
            group={group}
            open={openMenu === group.id}
            onToggle={() => setOpenMenu((current) => (current === group.id ? null : group.id))}
            onClose={() => setOpenMenu(null)}
          />
        ))}
      </nav>

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
      <CommandButton id="edit.undo" />
      <CommandButton id="edit.redo" />
      <span className="command-separator" />
      <CommandButton id="view.toggleHand" label="Mão" />
      <CommandButton id="view.selectTool" label="Selecionar" />
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

function CommandMenu({
  group,
  open,
  onToggle,
  onClose,
}: {
  group: (typeof COMMAND_MENU_GROUPS)[number];
  open: boolean;
  onToggle: () => void;
  onClose: () => void;
}) {
  const commands = useEditorCommands();
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const initialFocusRef = useRef<'first' | 'last'>('first');

  useEffect(() => {
    if (!open) return;
    const items = enabledMenuItems(menuRef.current);
    const index = initialFocusRef.current === 'last' ? items.length - 1 : 0;
    items[index]?.focus();
  }, [open]);

  function closeAndRestoreFocus() {
    onClose();
    triggerRef.current?.focus();
  }

  function handleTriggerKeyDown(event: KeyboardEvent<HTMLButtonElement>) {
    if (event.key !== 'ArrowDown' && event.key !== 'ArrowUp') return;
    event.preventDefault();
    initialFocusRef.current = event.key === 'ArrowUp' ? 'last' : 'first';
    if (!open) onToggle();
  }

  function handleMenuKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    if (event.key === 'Escape') {
      event.preventDefault();
      event.stopPropagation();
      closeAndRestoreFocus();
      return;
    }
    if (event.key === 'Tab') {
      onClose();
      return;
    }

    const items = enabledMenuItems(menuRef.current);
    if (items.length === 0) return;
    const currentIndex = items.indexOf(event.target as HTMLButtonElement);
    let nextIndex: number | null = null;
    if (event.key === 'ArrowDown') nextIndex = currentIndex < 0 ? 0 : currentIndex + 1;
    if (event.key === 'ArrowUp') nextIndex = currentIndex < 0 ? items.length - 1 : currentIndex - 1;
    if (event.key === 'Home') nextIndex = 0;
    if (event.key === 'End') nextIndex = items.length - 1;
    if (nextIndex === null) return;
    event.preventDefault();
    items[(nextIndex + items.length) % items.length]?.focus();
  }

  return (
    <div className="toolbar-menu">
      <button
        ref={triggerRef}
        className={open ? 'active' : ''}
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => {
          initialFocusRef.current = 'first';
          onToggle();
        }}
        onKeyDown={handleTriggerKeyDown}
      >
        {group.label} <span className="toolbar-menu-chevron">⌄</span>
      </button>
      {open && (
        <div
          ref={menuRef}
          className="toolbar-menu-popover"
          role="menu"
          aria-label={group.label}
          data-command-menu="true"
          onKeyDown={handleMenuKeyDown}
        >
          {group.entries.map((entry) => {
            if (isMenuSeparator(entry)) {
              return <span key={`${group.id}-${entry}`} className="toolbar-menu-divider" />;
            }
            const command = commands[entry];
            const shortcut = commandShortcutLabel(command);
            return (
              <button
                key={entry}
                role={command.checked === undefined ? 'menuitem' : 'menuitemcheckbox'}
                aria-checked={command.checked}
                disabled={!command.enabled}
                title={command.description}
                onClick={() => {
                  closeAndRestoreFocus();
                  command.run();
                }}
              >
                <span>{command.label}</span>
                {shortcut && <kbd>{shortcut}</kbd>}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

function CommandButton({ id, label }: { id: EditorCommandId; label?: string }) {
  const command = useEditorCommand(id);
  const shortcut = commandShortcutLabel(command);
  const title = shortcut ? `${command.description} (${shortcut})` : command.description;
  return (
    <button
      onClick={command.run}
      disabled={!command.enabled}
      className={command.checked ? 'active' : ''}
      title={title}
    >
      {label ?? command.label}
    </button>
  );
}

function enabledMenuItems(menu: HTMLDivElement | null): HTMLButtonElement[] {
  return Array.from(
    menu?.querySelectorAll<HTMLButtonElement>('[role^="menuitem"]:not(:disabled)') ?? [],
  );
}

function isMenuSeparator(
  entry: EditorCommandId | `separator:${string}`,
): entry is `separator:${string}` {
  return entry.startsWith('separator:');
}
