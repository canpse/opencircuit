import { COMPONENT_DEFINITIONS } from '../../core/catalog';
import type { GateType } from '../../core/types';
import andGateAsset from '../../assets/components/and_gate.png';
import clockSourceAsset from '../../assets/components/clock_source.png';
import inputSwitchOffAsset from '../../assets/components/input_switch_off.png';
import ledOffAsset from '../../assets/components/led_off.png';
import nandGateAsset from '../../assets/components/nand_gate.png';
import norGateAsset from '../../assets/components/nor_gate.png';
import notGateAsset from '../../assets/components/not_gate.png';
import orGateAsset from '../../assets/components/or_gate.png';
import outputPortAsset from '../../assets/components/output_port.png';
import xnorGateAsset from '../../assets/components/xnor_gate.png';
import xorGateAsset from '../../assets/components/xor_gate.png';

type EditorTool = GateType | 'select' | 'wire' | 'pan';

const COMPONENT_TOOL_ASSETS: Partial<Record<GateType, string>> = {
  input: inputSwitchOffAsset,
  button: outputPortAsset,
  led: ledOffAsset,
  and: andGateAsset,
  nand: nandGateAsset,
  or: orGateAsset,
  nor: norGateAsset,
  xor: xorGateAsset,
  xnor: xnorGateAsset,
  not: notGateAsset,
  clock: clockSourceAsset,
};

export const TOOL_GROUPS: Array<{ title: string; tools: GateType[] }> = [
  { title: 'Entradas', tools: ['input', 'button'] },
  { title: 'Saídas', tools: ['led'] },
  { title: 'Portas Lógicas', tools: ['and', 'nand', 'or', 'nor', 'xor', 'xnor', 'not'] },
  {
    title: 'Blocos Combinacionais',
    tools: ['half-adder', 'full-adder', 'mux-2-1', 'mux-4-1', 'decoder-2-4', 'comparator-1-bit', 'encoder-4-2', 'odd-parity-3', 'majority-3', 'half-subtractor', 'full-subtractor'],
  },
  { title: 'Sequenciais', tools: ['clock', 'd-latch', 'd-flip-flop', 'register-4'] },
  { title: 'Anotações', tools: ['text'] },
];

export const LOGIC_COMPONENT_TOOLS: GateType[] = TOOL_GROUPS.flatMap((group) => group.tools);

interface ComponentLibraryProps {
  selectedTool: EditorTool;
  onSelectTool: (tool: EditorTool) => void;
}

export function ComponentLibrary({ selectedTool, onSelectTool }: ComponentLibraryProps) {
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
                  onDragStart={(event) => event.dataTransfer.setData('application/opencircuit-gate', type)}
                >
                  <ToolButtonContent type={type} />
                </button>
              ))}
            </div>
          </section>
        ))}
      </div>
    </aside>
  );
}

export function ToolButtonContent({ type }: { type: GateType }) {
  const asset = COMPONENT_TOOL_ASSETS[type];
  return (
    <span className="tool-button-content">
      {asset && <img className="tool-icon" src={asset} alt="" aria-hidden="true" />}
      <span>{COMPONENT_DEFINITIONS[type].label}</span>
    </span>
  );
}
