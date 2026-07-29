import { useEffect, useRef } from 'react';
import {
  COMMAND_DEFINITIONS,
  COMMAND_MENU_GROUPS,
  EDITOR_GESTURES,
  commandShortcutLabel,
} from '../commands/editorCommands';
import { useEditorCommands } from '../commands/EditorCommandContext';
import { useEventCallback } from '../hooks/useEventCallback';

export function ShortcutHelpDialog({ onClose }: { onClose: () => void }) {
  const commands = useEditorCommands();
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);
  const handleClose = useEventCallback(onClose);

  useEffect(() => {
    previousFocusRef.current = document.activeElement as HTMLElement | null;
    closeButtonRef.current?.focus();
    return () => previousFocusRef.current?.focus();
  }, []);

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.key !== 'Escape') return;
      event.preventDefault();
      event.stopPropagation();
      handleClose();
    }
    window.addEventListener('keydown', onKeyDown, true);
    return () => window.removeEventListener('keydown', onKeyDown, true);
  }, [handleClose]);

  return (
    <div className="dialog-overlay" onMouseDown={onClose}>
      <div
        className="dialog shortcut-help-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="shortcut-help-title"
        onMouseDown={(event) => event.stopPropagation()}
        onKeyDown={(event) => {
          if (event.key !== 'Tab') return;
          event.preventDefault();
          closeButtonRef.current?.focus();
        }}
      >
        <h2 id="shortcut-help-title">Atalhos e gestos</h2>
        <p className="shortcut-help-intro">
          Os atalhos ficam suspensos enquanto você edita texto ou usa um diálogo.
        </p>
        <div className="shortcut-help-content">
          {COMMAND_MENU_GROUPS.map((group) => {
            const definitions = COMMAND_DEFINITIONS.filter(
              (definition) =>
                definition.group === group.id && commandShortcutLabel(definition).length > 0,
            );
            if (definitions.length === 0) return null;
            return (
              <section key={group.id} className="shortcut-help-section">
                <h3>{group.label}</h3>
                <dl>
                  {definitions.map((definition) => (
                    <div key={definition.id} className="shortcut-help-row">
                      <dt>
                        <strong>{commands[definition.id].label}</strong>
                        <span>{commands[definition.id].description}</span>
                      </dt>
                      <dd>
                        <kbd>{commandShortcutLabel(definition)}</kbd>
                      </dd>
                    </div>
                  ))}
                </dl>
              </section>
            );
          })}
          <section className="shortcut-help-section">
            <h3>Interação</h3>
            <dl>
              <div className="shortcut-help-row">
                <dt>
                  <strong>{commands['editor.cancel'].label}</strong>
                  <span>{commands['editor.cancel'].description}</span>
                </dt>
                <dd>
                  <kbd>{commandShortcutLabel(commands['editor.cancel'])}</kbd>
                </dd>
              </div>
              {EDITOR_GESTURES.map((item) => (
                <div key={item.gesture} className="shortcut-help-row">
                  <dt>
                    <strong>{item.gesture}</strong>
                    <span>{item.description}</span>
                  </dt>
                </div>
              ))}
            </dl>
          </section>
        </div>
        <div className="dialog-actions">
          <button ref={closeButtonRef} className="dialog-primary" onClick={onClose}>
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
}
