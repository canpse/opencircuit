import type { CircuitDocument, EvaluationResult, LogicComponent, SimulationResult, SimulationState } from '../types';
import { evaluateComponent } from './gates';
import { initializeValues, readPin, simulationResult, writePin } from './signals';

const MAX_ITERATIONS = 64;

export function evaluateCircuit(circuit: CircuitDocument): EvaluationResult {
  return simulateCircuit(circuit).values;
}

export function simulateCircuit(circuit: CircuitDocument, previousState?: SimulationState): SimulationResult {
  const values = initializeValues(circuit, previousState?.values);
  const componentById = new Map<string, LogicComponent>(circuit.components.map((component) => [component.id, component]));

  for (let iteration = 0; iteration < MAX_ITERATIONS; iteration += 1) {
    let changed = false;

    for (const component of circuit.components) {
      changed = evaluateComponent(component, circuit, values, componentById) || changed;
    }

    for (const wire of circuit.wires) {
      const sourceValue = readPin(values, wire.from);
      if (writePin(values, wire.to, sourceValue)) changed = true;
    }

    if (!changed) return simulationResult(values, false, iteration + 1);
  }

  return simulationResult(values, true, MAX_ITERATIONS);
}
