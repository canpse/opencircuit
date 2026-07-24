import type { CircuitDefinition, CircuitDocument, LogicComponent } from '../types';
import { evaluateCircuit } from './simulate';
import { flattenCircuit } from '../hierarchy/flatten';

export interface TruthTableRow {
  inputs: boolean[];
  outputs: boolean[];
}

export function buildCircuitTruthRows(
  circuit: CircuitDocument,
  inputs: LogicComponent[],
  outputs: LogicComponent[],
  definitions: CircuitDefinition[] = [],
): TruthTableRow[] {
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
    // Flatten before evaluating: a subcircuit instance's output would otherwise
    // hit gates.ts's unreachable-in-practice 'subcircuit' case (always false),
    // since evaluateCircuit alone never expands instances -- only flattenCircuit does.
    const { flat } = flattenCircuit(testCircuit, definitions);
    const result = evaluateCircuit(flat);
    return {
      inputs: inputValues,
      outputs: outputs.map((output) => Boolean(result[output.id]?.in)),
    };
  });
}

export function sameBooleanValues(left: boolean[], right: boolean[]): boolean {
  return left.length === right.length && left.every((value, index) => value === right[index]);
}
