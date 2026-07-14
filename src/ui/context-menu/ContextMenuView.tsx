import type { GateType, Point } from '../../core/types';
import { LOGIC_COMPONENT_TOOLS, ToolButtonContent } from '../library/ComponentLibrary';

export type Selection = { componentIds: string[]; wireIds: string[] };
export type ContextMenu =
  | { kind: 'canvas'; x: number; y: number; point: Point }
  | { kind: 'component'; x: number; y: number; componentId: string }
  | { kind: 'wire'; x: number; y: number; wireId: string }
  | null;

export function ContextMenuView({
  menu,
  selection,
  onAddComponent,
  onRename,
  onRemove,
}: {
  menu: NonNullable<ContextMenu>;
  selection: Selection;
  onAddComponent: (type: GateType) => void;
  onRename: () => void;
  onRemove: () => void;
}) {
  const selectedCount = selection.componentIds.length + selection.wireIds.length;
  const canRemove = menu.kind !== 'canvas';

  return (
    <div
      className="context-menu"
      style={{ left: menu.x, top: menu.y }}
      onClick={(event) => event.stopPropagation()}
      onMouseDown={(event) => event.stopPropagation()}
      role="menu"
    >
      {menu.kind === 'canvas' ? (
        <>
          <div className="context-menu-title">Adicionar</div>
          {LOGIC_COMPONENT_TOOLS.map((type) => (
            <button key={type} onClick={() => onAddComponent(type)} role="menuitem">
              <ToolButtonContent type={type} />
            </button>
          ))}
        </>
      ) : (
        <>
          {menu.kind === 'component' && (
            <button onClick={onRename} role="menuitem">
              Renomear
            </button>
          )}
          <button disabled={!canRemove} onClick={onRemove} role="menuitem">
            {selectedCount > 1 ? `Excluir seleção (${selectedCount})` : 'Excluir'}
          </button>
        </>
      )}
    </div>
  );
}
