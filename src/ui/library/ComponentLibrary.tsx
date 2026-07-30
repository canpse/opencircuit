import { COMPONENT_DEFINITIONS } from '../../core/catalog';
import {
  COMPONENT_REGISTRY,
  INSERTABLE_COMPONENT_TYPES,
  type ComponentCategory,
} from '../../core/componentRegistry';
import type { CircuitDefinition, GateType } from '../../core/types';
import type { EditorTool } from '../editor/editorTypes';
import { COMPONENT_ASSETS } from '../editor/componentAssets';

const CATEGORY_LABELS: Array<{ category: ComponentCategory; title: string }> = [
  { category: 'inputs', title: 'Entradas' },
  { category: 'outputs', title: 'Saídas' },
  { category: 'gates', title: 'Portas Lógicas' },
  { category: 'combinational', title: 'Blocos Combinacionais' },
  { category: 'sequential', title: 'Sequenciais' },
  { category: 'buses', title: 'Barramentos' },
  { category: 'annotations', title: 'Anotações' },
];

export const TOOL_GROUPS: Array<{ title: string; tools: GateType[] }> = CATEGORY_LABELS.map(
  ({ category, title }) => ({
    title,
    tools: INSERTABLE_COMPONENT_TYPES.filter(
      (type) => COMPONENT_REGISTRY[type].category === category,
    ),
  }),
);

export const LOGIC_COMPONENT_TOOLS: GateType[] = TOOL_GROUPS.flatMap((group) => group.tools);

interface ComponentLibraryProps {
  selectedTool: EditorTool;
  onSelectTool: (tool: EditorTool) => void;
  definitions?: CircuitDefinition[];
  /** Every definition currently on the navigation path (the one being edited plus any ancestor it was reached through) -- excluded from the placeable list as a cheap deterrent against an instance containing one of its own ancestors (the authoritative cycle guard lives in flattenCircuit). */
  excludeDefinitionIds?: string[];
  selectedSubcircuitDefinitionId?: string | null;
  onSelectSubcircuit?: (definitionId: string) => void;
  onSaveDefinitionToLibrary?: (definitionId: string) => void;
}

export function ComponentLibrary({
  selectedTool,
  onSelectTool,
  definitions = [],
  excludeDefinitionIds = [],
  selectedSubcircuitDefinitionId = null,
  onSelectSubcircuit,
  onSaveDefinitionToLibrary,
}: ComponentLibraryProps) {
  const placeableDefinitions = definitions.filter(
    (definition) => !excludeDefinitionIds.includes(definition.id),
  );

  return (
    <aside className="library-panel" aria-label="Biblioteca de componentes">
      <div className="panel-header">Biblioteca</div>
      <div className="tool-groups">
        {TOOL_GROUPS.map((group) => (
          <section className="tool-group" key={group.title}>
            <h2>{group.title}</h2>
            <div className="tool-grid">
              {group.tools.map((type) => (
                <button
                  key={type}
                  className={`tool-card ${selectedTool === type ? 'active' : ''}`}
                  draggable
                  onClick={() => onSelectTool(type)}
                  onDragStart={(event) =>
                    event.dataTransfer.setData('application/opencircuit-gate', type)
                  }
                >
                  <ToolButtonContent type={type} />
                </button>
              ))}
            </div>
          </section>
        ))}
        {placeableDefinitions.length > 0 && (
          <section className="tool-group" key="subcircuits">
            <h2>Subcircuitos</h2>
            <div className="tool-grid">
              {placeableDefinitions.map((definition) => (
                <button
                  key={definition.id}
                  className={`tool-card ${
                    selectedTool === 'subcircuit' &&
                    selectedSubcircuitDefinitionId === definition.id
                      ? 'active'
                      : ''
                  }`}
                  draggable
                  onClick={() => onSelectSubcircuit?.(definition.id)}
                  onDragStart={(event) => {
                    event.dataTransfer.setData('application/opencircuit-gate', 'subcircuit');
                    event.dataTransfer.setData(
                      'application/opencircuit-subcircuit-definition',
                      definition.id,
                    );
                  }}
                  onContextMenu={(event) => {
                    event.preventDefault();
                    onSaveDefinitionToLibrary?.(definition.id);
                  }}
                  title="Clique ou arraste para posicionar. Botão direito: publicar na biblioteca."
                >
                  <span className="tool-button-content">
                    <span>{definition.name}</span>
                  </span>
                </button>
              ))}
            </div>
          </section>
        )}
      </div>
    </aside>
  );
}

export function ToolButtonContent({ type }: { type: GateType }) {
  const asset = COMPONENT_ASSETS[type]?.library;
  return (
    <span className="tool-button-content">
      {asset && <img className="tool-icon" src={asset} alt="" aria-hidden="true" />}
      <span>{COMPONENT_DEFINITIONS[type].label}</span>
    </span>
  );
}
