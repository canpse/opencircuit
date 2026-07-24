import { useRef, useState, type KeyboardEvent } from 'react';
import { COMPONENT_DEFINITIONS } from '../../core/catalog';
import type { GateType, Point } from '../../core/types';
import { LOGIC_COMPONENT_TOOLS, TOOL_GROUPS, ToolButtonContent } from '../library/ComponentLibrary';

export type Selection = { componentIds: string[]; wireIds: string[] };
export type ContextMenu =
  | { kind: 'canvas'; x: number; y: number; point: Point }
  | { kind: 'component'; x: number; y: number; componentId: string }
  | { kind: 'wire'; x: number; y: number; wireId: string }
  | { kind: 'waypoint'; x: number; y: number; wireId: string; waypointIndex: number }
  | null;

const RECENT_COMPONENTS_KEY = 'opencircuit-recent-context-components';
const MAX_RECENT_COMPONENTS = 4;
const DEFAULT_QUICK_COMPONENTS: GateType[] = ['input', 'and', 'led', 'clock'];
const CANVAS_MENU_WIDTH = 300;
const CANVAS_MENU_HEIGHT = 452;
const SIMPLE_MENU_WIDTH = 190;
const SIMPLE_MENU_HEIGHT = 150;
const SUBMENU_WIDTH = 340;
const VIEWPORT_MARGIN = 8;

export function ContextMenuView({
  menu,
  selection,
  onAddComponent,
  onRename,
  onToggleWireDisplay,
  wireIsTunnel,
  onToggleWatchedSignal,
  wireSignalWatched,
  onRemove,
  onClose,
}: {
  menu: NonNullable<ContextMenu>;
  selection: Selection;
  onAddComponent: (type: GateType) => void;
  onRename: () => void;
  onToggleWireDisplay: () => void;
  wireIsTunnel: boolean;
  onToggleWatchedSignal: () => void;
  wireSignalWatched: boolean;
  onRemove: () => void;
  onClose: () => void;
}) {
  const selectedCount = selection.componentIds.length + selection.wireIds.length;
  const canRemove = menu.kind !== 'canvas';
  const position = contextMenuPosition(
    menu.x,
    menu.y,
    menu.kind === 'canvas' ? CANVAS_MENU_WIDTH : SIMPLE_MENU_WIDTH,
    menu.kind === 'canvas' ? CANVAS_MENU_HEIGHT : SIMPLE_MENU_HEIGHT,
    window.innerWidth,
    window.innerHeight,
  );

  return (
    <div
      className={`context-menu ${menu.kind === 'canvas' ? 'canvas-context-menu' : ''}`}
      style={{ left: position.x, top: position.y }}
      onClick={(event) => event.stopPropagation()}
      onMouseDown={(event) => event.stopPropagation()}
      role="menu"
    >
      {menu.kind === 'canvas' ? (
        <CanvasComponentMenu
          openSubmenuToLeft={
            position.x + CANVAS_MENU_WIDTH + SUBMENU_WIDTH + VIEWPORT_MARGIN > window.innerWidth
          }
          onAddComponent={onAddComponent}
          onClose={onClose}
        />
      ) : (
        <>
          {menu.kind === 'component' && (
            <button onClick={onRename} role="menuitem">
              Renomear
            </button>
          )}
          {menu.kind === 'wire' && (
            <button onClick={onToggleWireDisplay} role="menuitem">
              {wireIsTunnel ? 'Mostrar como fio' : 'Converter em túnel'}
            </button>
          )}
          {menu.kind === 'wire' && (
            <button onClick={onToggleWatchedSignal} role="menuitem">
              {wireSignalWatched ? 'Remover da forma de onda' : 'Adicionar à forma de onda'}
            </button>
          )}
          <button disabled={!canRemove} onClick={onRemove} role="menuitem">
            {contextRemoveLabel(menu, selectedCount)}
          </button>
        </>
      )}
    </div>
  );
}

export function contextRemoveLabel(menu: NonNullable<ContextMenu>, selectedCount: number): string {
  if (menu.kind === 'waypoint') return 'Excluir ponto de controle';
  return selectedCount > 1 ? `Excluir seleção (${selectedCount})` : 'Excluir';
}

function CanvasComponentMenu({
  openSubmenuToLeft,
  onAddComponent,
  onClose,
}: {
  openSubmenuToLeft: boolean;
  onAddComponent: (type: GateType) => void;
  onClose: () => void;
}) {
  const [query, setQuery] = useState('');
  const [activeGroup, setActiveGroup] = useState<string | null>(null);
  const [recentComponents, setRecentComponents] = useState(readRecentComponents);
  const rootRef = useRef<HTMLDivElement>(null);
  const normalizedQuery = normalizeComponentSearch(query);
  const searchResults = filterComponentTools(query);
  const quickComponents = recentComponents.length > 0 ? recentComponents : DEFAULT_QUICK_COMPONENTS;
  const activeToolGroup = TOOL_GROUPS.find((group) => group.title === activeGroup) ?? null;

  function addComponent(type: GateType) {
    const nextRecent = nextRecentComponents(recentComponents, type);
    setRecentComponents(nextRecent);
    saveRecentComponents(nextRecent);
    onAddComponent(type);
  }

  function handleKeyboardNavigation(event: KeyboardEvent<HTMLDivElement>) {
    if (event.key === 'Escape') {
      event.preventDefault();
      event.stopPropagation();
      onClose();
      return;
    }

    const target = event.target as HTMLElement;
    if (event.key === 'ArrowRight' && target.dataset.contextGroup) {
      event.preventDefault();
      setActiveGroup(target.dataset.contextGroup);
      requestAnimationFrame(() =>
        rootRef.current?.querySelector<HTMLElement>('.context-submenu [role="menuitem"]')?.focus(),
      );
      return;
    }

    if (event.key === 'ArrowLeft' && target.closest('.context-submenu')) {
      event.preventDefault();
      const groupTitle = activeGroup;
      setActiveGroup(null);
      requestAnimationFrame(() => {
        const groupButtons = rootRef.current?.querySelectorAll<HTMLElement>('[data-context-group]');
        Array.from(groupButtons ?? [])
          .find((button) => button.dataset.contextGroup === groupTitle)
          ?.focus();
      });
      return;
    }

    if (event.key !== 'ArrowDown' && event.key !== 'ArrowUp') return;
    event.preventDefault();
    const items = Array.from(
      rootRef.current?.querySelectorAll<HTMLElement>('[role="menuitem"]:not(:disabled)') ?? [],
    );
    if (items.length === 0) return;
    const currentIndex = items.indexOf(target);
    const direction = event.key === 'ArrowDown' ? 1 : -1;
    const nextIndex =
      currentIndex < 0 ? (direction > 0 ? 0 : items.length - 1) : currentIndex + direction;
    items[(nextIndex + items.length) % items.length]?.focus();
  }

  return (
    <div ref={rootRef} onKeyDown={handleKeyboardNavigation}>
      <label className="context-menu-search">
        <span aria-hidden="true">⌕</span>
        <input
          autoFocus
          value={query}
          onChange={(event) => {
            setQuery(event.target.value);
            setActiveGroup(null);
          }}
          placeholder="Buscar componente…"
          aria-label="Buscar componente para adicionar"
        />
        {query && (
          <button
            className="context-menu-search-clear"
            onClick={() => setQuery('')}
            aria-label="Limpar busca"
            type="button"
          >
            ×
          </button>
        )}
      </label>

      {normalizedQuery ? (
        <div className="context-menu-search-results" aria-label="Resultados da busca">
          <div className="context-menu-title">
            {searchResults.length === 1
              ? '1 componente encontrado'
              : `${searchResults.length} componentes encontrados`}
          </div>
          {searchResults.map((type) => (
            <button key={type} onClick={() => addComponent(type)} role="menuitem">
              <ToolButtonContent type={type} />
            </button>
          ))}
          {searchResults.length === 0 && (
            <div className="context-menu-empty">Nenhum componente encontrado.</div>
          )}
        </div>
      ) : (
        <>
          <div className="context-menu-title">
            {recentComponents.length > 0 ? 'Recentes' : 'Acesso rápido'}
          </div>
          <div className="context-menu-quick-grid">
            {quickComponents.map((type) => (
              <button key={type} onClick={() => addComponent(type)} role="menuitem">
                <ToolButtonContent type={type} />
              </button>
            ))}
          </div>

          <div className="context-menu-divider" />
          <div className="context-menu-title">Categorias</div>
          <div className="context-menu-categories">
            {TOOL_GROUPS.map((group) => (
              <button
                key={group.title}
                className={activeGroup === group.title ? 'submenu-active' : ''}
                data-context-group={group.title}
                onMouseEnter={() => setActiveGroup(group.title)}
                onFocus={() => setActiveGroup(group.title)}
                onClick={() =>
                  setActiveGroup((current) => (current === group.title ? null : group.title))
                }
                role="menuitem"
                aria-haspopup="menu"
                aria-expanded={activeGroup === group.title}
              >
                <span>{group.title}</span>
                <span className="context-menu-category-meta">
                  {group.tools.length} <span aria-hidden="true">›</span>
                </span>
              </button>
            ))}
          </div>
        </>
      )}

      {!normalizedQuery && activeToolGroup && (
        <div
          className={`context-submenu ${openSubmenuToLeft ? 'opens-left' : 'opens-right'}`}
          role="menu"
          aria-label={activeToolGroup.title}
        >
          <div className="context-menu-title">{activeToolGroup.title}</div>
          <div className="context-submenu-grid">
            {activeToolGroup.tools.map((type) => (
              <button key={type} onClick={() => addComponent(type)} role="menuitem">
                <ToolButtonContent type={type} />
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function readRecentComponents(): GateType[] {
  try {
    const parsed: unknown = JSON.parse(localStorage.getItem(RECENT_COMPONENTS_KEY) ?? '[]');
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter(
        (value): value is GateType =>
          typeof value === 'string' && LOGIC_COMPONENT_TOOLS.includes(value as GateType),
      )
      .slice(0, MAX_RECENT_COMPONENTS);
  } catch {
    return [];
  }
}

function saveRecentComponents(types: GateType[]) {
  try {
    localStorage.setItem(RECENT_COMPONENTS_KEY, JSON.stringify(types));
  } catch {
    // O menu continua funcional quando o armazenamento do navegador está indisponível.
  }
}

export function nextRecentComponents(current: GateType[], selected: GateType): GateType[] {
  return [selected, ...current.filter((type) => type !== selected)].slice(0, MAX_RECENT_COMPONENTS);
}

export function filterComponentTools(query: string): GateType[] {
  const normalizedQuery = normalizeComponentSearch(query);
  if (!normalizedQuery) return [];
  return LOGIC_COMPONENT_TOOLS.filter((type) =>
    normalizeComponentSearch(`${COMPONENT_DEFINITIONS[type].label} ${type}`).includes(
      normalizedQuery,
    ),
  );
}

function normalizeComponentSearch(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLocaleLowerCase('pt-BR')
    .trim();
}

export function contextMenuPosition(
  requestedX: number,
  requestedY: number,
  menuWidth: number,
  menuHeight: number,
  viewportWidth: number,
  viewportHeight: number,
): Point {
  const maxX = Math.max(VIEWPORT_MARGIN, viewportWidth - menuWidth - VIEWPORT_MARGIN);
  const maxY = Math.max(VIEWPORT_MARGIN, viewportHeight - menuHeight - VIEWPORT_MARGIN);
  return {
    x: Math.min(maxX, Math.max(VIEWPORT_MARGIN, requestedX)),
    y: Math.min(maxY, Math.max(VIEWPORT_MARGIN, requestedY)),
  };
}
