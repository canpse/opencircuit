import { getPins } from '../catalog';
import type {
  CircuitDocument,
  EvaluationResult,
  LogicComponent,
  SimulationResult,
  SimulationState,
  SimulationStatus,
} from '../types';
import { measureProfile } from '../../performance/measure';
import { evaluateComponent } from './gates';
import { buildEvaluationPlan, type EvaluationGroup } from './graph';
import {
  buildIncomingWireIndex,
  initializeValues,
  readPin,
  simulationResult,
  writePin,
} from './signals';

const DEFAULT_MAX_FEEDBACK_EVALUATIONS = 1_000_000;
const MIN_FEEDBACK_PASSES = 64;
const PASSES_PER_COMPONENT = 4;

export interface SimulationOptions {
  maxFeedbackEvaluations?: number;
}

export function evaluateCircuit(circuit: CircuitDocument): EvaluationResult {
  return simulateCircuit(circuit).values;
}

export function simulateCircuit(
  circuit: CircuitDocument,
  previousState?: SimulationState,
  options: SimulationOptions = {},
): SimulationResult {
  return measureProfile(
    'simulation.total',
    { components: circuit.components.length, wires: circuit.wires.length },
    () => {
      const values = initializeValues(circuit, previousState?.values);
      measureProfile(
        'simulation.index',
        { components: circuit.components.length, wires: circuit.wires.length },
        () => buildIncomingWireIndex(circuit),
      );
      const plan = measureProfile(
        'simulation.plan',
        { components: circuit.components.length, wires: circuit.wires.length },
        () => buildEvaluationPlan(circuit),
      );
      const componentById = new Map<string, LogicComponent>(
        circuit.components.map((component) => [component.id, component]),
      );
      let status: SimulationStatus = 'stable';
      let iterations = 1;
      let remainingFeedbackEvaluations = normalizeEvaluationBudget(options.maxFeedbackEvaluations);

      for (const group of plan.groups) {
        if (!group.cyclic) {
          for (const componentId of group.componentIds) {
            const component = componentById.get(componentId);
            if (component) evaluateComponent(component, circuit, values, componentById);
          }
          continue;
        }

        const outcome = settleFeedbackGroup(
          group,
          circuit,
          values,
          componentById,
          remainingFeedbackEvaluations,
        );
        remainingFeedbackEvaluations -= outcome.evaluations;
        iterations = Math.max(iterations, outcome.iterations);
        status = mergeStatus(status, outcome.status);
      }

      // Gate inputs read their source pins directly during evaluation. Copying wires
      // once at the end preserves observable target-pin values without allowing the
      // document's wire order to affect convergence.
      for (const wire of circuit.wires) {
        writePin(values, wire.to, readPin(values, wire.from));
      }

      return simulationResult(values, status, iterations);
    },
  );
}

function settleFeedbackGroup(
  group: EvaluationGroup,
  circuit: CircuitDocument,
  values: EvaluationResult,
  componentById: Map<string, LogicComponent>,
  evaluationBudget: number,
): { status: SimulationStatus; iterations: number; evaluations: number } {
  const groupSize = group.componentIds.length;
  const passLimit = Math.min(
    Math.max(MIN_FEEDBACK_PASSES, groupSize * PASSES_PER_COMPONENT),
    Math.floor(evaluationBudget / groupSize),
  );
  const signatures = new Set([feedbackSignature(group, values, componentById)]);

  for (let iteration = 1; iteration <= passLimit; iteration += 1) {
    let changed = false;
    for (const componentId of group.componentIds) {
      const component = componentById.get(componentId);
      if (component) {
        changed = evaluateComponent(component, circuit, values, componentById) || changed;
      }
    }

    if (!changed) {
      return { status: 'stable', iterations: iteration, evaluations: iteration * groupSize };
    }

    const signature = feedbackSignature(group, values, componentById);
    if (signatures.has(signature)) {
      return { status: 'oscillating', iterations: iteration, evaluations: iteration * groupSize };
    }
    signatures.add(signature);
  }

  return {
    status: 'iteration-limit',
    iterations: passLimit,
    evaluations: passLimit * groupSize,
  };
}

function feedbackSignature(
  group: EvaluationGroup,
  values: EvaluationResult,
  componentById: ReadonlyMap<string, LogicComponent>,
): string {
  return JSON.stringify(
    group.componentIds.map((componentId) => {
      const component = componentById.get(componentId);
      if (!component) return [componentId];
      return [
        componentId,
        ...getPins(component)
          .filter((pin) => pin.kind === 'output')
          .map((pin) => [pin.id, values[componentId]?.[pin.id] ?? false]),
      ];
    }),
  );
}

function normalizeEvaluationBudget(configuredBudget: number | undefined): number {
  if (configuredBudget === undefined || !Number.isFinite(configuredBudget)) {
    return DEFAULT_MAX_FEEDBACK_EVALUATIONS;
  }
  return Math.max(0, Math.floor(configuredBudget));
}

function mergeStatus(current: SimulationStatus, next: SimulationStatus): SimulationStatus {
  if (current === 'oscillating' || next === 'oscillating') return 'oscillating';
  if (current === 'iteration-limit' || next === 'iteration-limit') return 'iteration-limit';
  return 'stable';
}
