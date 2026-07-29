import { COMPONENT_DEFINITIONS } from '../../core/catalog';
import { isSequentialType } from '../../core/evaluateCircuit';
import { busValueToNumber, formatBusHex } from '../../core/simulation/signals';
import { buildCircuitTruthRows, sameBooleanValues } from '../../core/simulation/truthTable';
import type {
  CircuitDefinition,
  CircuitDocument,
  EvaluationResult,
  LogicComponent,
  LogicValue,
  SimulationStatus,
} from '../../core/types';

export function CircuitTruthTable({
  circuit,
  evaluation,
  simulationStatus,
  hasFeedback,
  definitions = [],
  scopeName,
}: {
  circuit: CircuitDocument;
  evaluation: EvaluationResult;
  simulationStatus: SimulationStatus;
  hasFeedback: boolean;
  definitions?: CircuitDefinition[];
  /** Name of the subcircuit definition currently being viewed, if any -- shown in the panel title so it's clear the table reflects just that definition, not the whole document. */
  scopeName?: string;
}) {
  const sequentialComponents = circuit.components.filter((component) =>
    isSequentialType(component.type),
  );
  if (sequentialComponents.length > 0 || hasFeedback) {
    return (
      <SequentialStatePanel
        circuit={circuit}
        components={sequentialComponents}
        evaluation={evaluation}
        simulationStatus={simulationStatus}
        hasFeedback={hasFeedback}
        scopeName={scopeName}
      />
    );
  }

  const inputs = circuit.components.filter((component) => component.type === 'input');
  const outputs = circuit.components.filter(
    (component) => component.type === 'led' || component.type === 'display-4',
  );
  const maxInputs = 6;

  if (inputs.length === 0) {
    return (
      <div className="properties-card muted-card">
        Adicione componentes Input para gerar a tabela verdade do circuito.
      </div>
    );
  }

  if (outputs.length === 0) {
    return (
      <div className="properties-card muted-card">
        Adicione LEDs ou Displays para observar as saídas do circuito.
      </div>
    );
  }

  if (inputs.length > maxInputs) {
    return (
      <div className="properties-card muted-card">
        Este circuito tem {inputs.length} entradas, gerando {2 ** inputs.length} combinações. O
        limite atual é {maxInputs} entradas.
      </div>
    );
  }

  const rows = buildCircuitTruthRows(circuit, inputs, outputs, definitions);
  const currentInputValues = inputs.map((input) => Boolean(input.state));

  return (
    <div className="properties-card truth-table-card">
      <span className="property-subtitle">
        {scopeName ? `Definição: ${scopeName}` : 'Circuito inteiro'}
      </span>
      <div className="truth-table-wrap">
        <table className="truth-table circuit-truth-table">
          <thead>
            <tr>
              {inputs.map((input) => (
                <th key={input.id}>{input.label ?? input.id}</th>
              ))}
              {outputs.map((output) => (
                <th key={output.id}>{output.label ?? output.id}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => {
              const isCurrent = sameBooleanValues(row.inputs, currentInputValues);
              return (
                <tr
                  key={row.inputs.map(bit).join('')}
                  className={isCurrent ? 'current-truth-row' : undefined}
                >
                  {row.inputs.map((value, index) => (
                    <td key={inputs[index].id}>{bit(value)}</td>
                  ))}
                  {row.outputs.map((value, index) => (
                    <td key={outputs[index].id} className={truthOutputClass(value)}>
                      {Array.isArray(value) ? formatBusHex(value) : bit(value)}
                    </td>
                  ))}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function bit(value: boolean): 0 | 1 {
  return value ? 1 : 0;
}

function truthOutputClass(value: LogicValue): string {
  return busValueToNumber(value) > 0 ? 'truth-output on' : 'truth-output';
}

function SequentialStatePanel({
  circuit,
  components,
  evaluation,
  simulationStatus,
  hasFeedback,
  scopeName,
}: {
  circuit: CircuitDocument;
  components: LogicComponent[];
  evaluation: EvaluationResult;
  simulationStatus: SimulationStatus;
  hasFeedback: boolean;
  scopeName?: string;
}) {
  const observedComponents =
    components.length > 0
      ? components
      : circuit.components.filter((component) =>
          ['and', 'nand', 'or', 'nor', 'xor', 'xnor', 'not'].includes(component.type),
        );
  const subtitle = hasFeedback ? 'Realimentação / memória' : 'Circuito sequencial';
  return (
    <div className="properties-card sequential-state-card">
      <span className="property-subtitle">
        {scopeName ? `${subtitle} — ${scopeName}` : subtitle}
      </span>
      <p className="muted-card">
        {hasFeedback ? (
          'Este circuito tem caminho de realimentação. O simulador usa o último estado estável dos sinais como ponto de partida, permitindo latches feitos com portas comuns.'
        ) : (
          <>
            Este circuito tem memória. Use <strong>Tick</strong> para avançar o tempo e observe os
            estados internos.
          </>
        )}
      </p>
      {simulationStatus !== 'stable' && (
        <p className="simulation-warning">
          {simulationStatus === 'oscillating'
            ? 'O circuito entrou em oscilação: os sinais estão repetindo estados sem estabilizar.'
            : 'O simulador atingiu o limite computacional antes de confirmar a estabilização.'}
        </p>
      )}
      <div className="sequential-state-list">
        {observedComponents.map((component) => {
          const label = component.label ?? COMPONENT_DEFINITIONS[component.type].label;
          if (component.type === 'clock') {
            return (
              <div className="state-row" key={component.id}>
                <span>{label}.CLK</span>
                <strong>{bit(Boolean(evaluation[component.id]?.CLK))}</strong>
              </div>
            );
          }
          if (component.type === 'd-latch' || component.type === 'd-flip-flop') {
            return (
              <div className="state-row" key={component.id}>
                <span>{label}.Q</span>
                <strong>{bit(Boolean(evaluation[component.id]?.Q))}</strong>
              </div>
            );
          }
          if (component.type === 'register-4') {
            const q = ['Q3', 'Q2', 'Q1', 'Q0']
              .map((pin) => bit(Boolean(evaluation[component.id]?.[pin])))
              .join('');
            return (
              <div className="state-row" key={component.id}>
                <span>{label}.Q3..Q0</span>
                <strong>{q}</strong>
              </div>
            );
          }
          return (
            <div className="state-row" key={component.id}>
              <span>{label}.out</span>
              <strong>{bit(Boolean(evaluation[component.id]?.out))}</strong>
            </div>
          );
        })}
      </div>
    </div>
  );
}
