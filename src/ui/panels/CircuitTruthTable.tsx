import { COMPONENT_DEFINITIONS } from '../../core/catalog';
import { evaluateCircuit, isSequentialType } from '../../core/evaluateCircuit';
import type { CircuitDocument, EvaluationResult, LogicComponent } from '../../core/types';

export function CircuitTruthTable({ circuit, evaluation, unstable, hasFeedback }: { circuit: CircuitDocument; evaluation: EvaluationResult; unstable: boolean; hasFeedback: boolean }) {
  const sequentialComponents = circuit.components.filter((component) => isSequentialType(component.type));
  if (sequentialComponents.length > 0 || hasFeedback) {
    return <SequentialStatePanel circuit={circuit} components={sequentialComponents} evaluation={evaluation} unstable={unstable} hasFeedback={hasFeedback} />;
  }

  const inputs = circuit.components.filter((component) => component.type === 'input');
  const outputs = circuit.components.filter((component) => component.type === 'led');
  const maxInputs = 6;

  if (inputs.length === 0) {
    return <div className="properties-card muted-card">Adicione componentes Input para gerar a tabela verdade do circuito.</div>;
  }

  if (outputs.length === 0) {
    return <div className="properties-card muted-card">Adicione LEDs para observar as saídas do circuito.</div>;
  }

  if (inputs.length > maxInputs) {
    return (
      <div className="properties-card muted-card">
        Este circuito tem {inputs.length} entradas, gerando {2 ** inputs.length} combinações. O limite atual é {maxInputs} entradas.
      </div>
    );
  }

  const rows = buildCircuitTruthRows(circuit, inputs, outputs);
  const currentInputValues = inputs.map((input) => Boolean(input.state));

  return (
    <div className="properties-card truth-table-card">
      <span className="property-subtitle">Circuito inteiro</span>
      <div className="truth-table-wrap">
        <table className="truth-table circuit-truth-table">
          <thead>
            <tr>
              {inputs.map((input) => <th key={input.id}>{input.label ?? input.id}</th>)}
              {outputs.map((output) => <th key={output.id}>{output.label ?? output.id}</th>)}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, rowIndex) => {
              const isCurrent = sameBooleanValues(row.inputs, currentInputValues);
              return (
                <tr key={rowIndex} className={isCurrent ? 'current-truth-row' : undefined}>
                  {row.inputs.map((value, index) => <td key={`i-${index}`}>{bit(value)}</td>)}
                  {row.outputs.map((value, index) => <td key={`o-${index}`} className={truthOutputClass(value)}>{bit(value)}</td>)}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function buildCircuitTruthRows(circuit: CircuitDocument, inputs: LogicComponent[], outputs: LogicComponent[]) {
  const rowCount = 2 ** inputs.length;
  return Array.from({ length: rowCount }, (_, rowIndex) => {
    const inputValues = inputs.map((_, inputIndex) => {
      const bitIndex = inputs.length - inputIndex - 1;
      return Boolean((rowIndex >> bitIndex) & 1);
    });
    const inputValueById = new Map(inputs.map((input, index) => [input.id, inputValues[index]]));
    const testCircuit: CircuitDocument = {
      ...circuit,
      components: circuit.components.map((component) =>
        component.type === 'input'
          ? { ...component, state: inputValueById.get(component.id) ?? false }
          : component,
      ),
    };
    const result = evaluateCircuit(testCircuit);
    return {
      inputs: inputValues,
      outputs: outputs.map((output) => Boolean(result[output.id]?.in)),
    };
  });
}

function sameBooleanValues(left: boolean[], right: boolean[]): boolean {
  return left.length === right.length && left.every((value, index) => value === right[index]);
}

function bit(value: boolean): 0 | 1 {
  return value ? 1 : 0;
}

function truthOutputClass(value: boolean): string {
  return value ? 'truth-output on' : 'truth-output';
}

function SequentialStatePanel({ circuit, components, evaluation, unstable, hasFeedback }: { circuit: CircuitDocument; components: LogicComponent[]; evaluation: EvaluationResult; unstable: boolean; hasFeedback: boolean }) {
  const observedComponents = components.length > 0
    ? components
    : circuit.components.filter((component) => ['and', 'nand', 'or', 'nor', 'xor', 'xnor', 'not'].includes(component.type));
  return (
    <div className="properties-card sequential-state-card">
      <span className="property-subtitle">{hasFeedback ? 'Realimentação / memória' : 'Circuito sequencial'}</span>
      <p className="muted-card">
        {hasFeedback
          ? 'Este circuito tem caminho de realimentação. O simulador usa o último estado estável dos sinais como ponto de partida, permitindo latches feitos com portas comuns.'
          : <>Este circuito tem memória. Use <strong>Tick</strong> para avançar o tempo e observe os estados internos.</>}
      </p>
      {unstable && <p className="simulation-warning">O circuito não estabilizou. Pode haver oscilação ou realimentação inválida.</p>}
      <div className="sequential-state-list">
        {observedComponents.map((component) => {
          const label = component.label ?? COMPONENT_DEFINITIONS[component.type].label;
          if (component.type === 'clock') {
            return <div className="state-row" key={component.id}><span>{label}.CLK</span><strong>{bit(Boolean(evaluation[component.id]?.CLK))}</strong></div>;
          }
          if (component.type === 'd-latch' || component.type === 'd-flip-flop') {
            return <div className="state-row" key={component.id}><span>{label}.Q</span><strong>{bit(Boolean(evaluation[component.id]?.Q))}</strong></div>;
          }
          return <div className="state-row" key={component.id}><span>{label}.out</span><strong>{bit(Boolean(evaluation[component.id]?.out))}</strong></div>;
        })}
      </div>
    </div>
  );
}

