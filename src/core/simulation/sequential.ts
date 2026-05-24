import type { CircuitDocument, LogicComponent } from '../types';
import { evaluateCircuit } from './simulate';
import { inputValue } from './signals';

export const SEQUENTIAL_TYPES = ['clock', 'd-latch', 'd-flip-flop'] as const;

export function isSequentialType(type: LogicComponent['type']): boolean {
  return SEQUENTIAL_TYPES.includes(type as (typeof SEQUENTIAL_TYPES)[number]);
}

export function withSequentialDefaults(component: LogicComponent): LogicComponent {
  if (component.type === 'clock') return { ...component, state: Boolean(component.state) };
  if (component.type === 'd-latch' || component.type === 'd-flip-flop') {
    return { ...component, memory: { q: Boolean(component.memory?.q), previousClk: Boolean(component.memory?.previousClk) } };
  }
  return component;
}

export function settleSequentialCircuit(circuit: CircuitDocument): CircuitDocument {
  const normalized = normalizeSequentialCircuit(circuit);
  const values = evaluateCircuit(normalized);
  const componentById = new Map(normalized.components.map((item) => [item.id, item]));

  return {
    ...normalized,
    components: normalized.components.map((component) => {
      if (component.type !== 'd-latch') return component;
      const enabled = inputValue(normalized, values, componentById, component.id, 'EN');
      if (!enabled) return component;
      const d = inputValue(normalized, values, componentById, component.id, 'D');
      return { ...component, memory: { ...component.memory, q: d } };
    }),
  };
}

export function stepCircuit(circuit: CircuitDocument): CircuitDocument {
  const toggledClocks = normalizeSequentialCircuit(circuit);
  const clockedCircuit: CircuitDocument = {
    ...toggledClocks,
    components: toggledClocks.components.map((component) =>
      component.type === 'clock' ? { ...component, state: !component.state } : component,
    ),
  };
  const values = evaluateCircuit(clockedCircuit);
  const componentById = new Map(clockedCircuit.components.map((component) => [component.id, component]));

  return {
    ...clockedCircuit,
    components: clockedCircuit.components.map((component) => {
      if (component.type === 'd-latch') {
        const enabled = inputValue(clockedCircuit, values, componentById, component.id, 'EN');
        if (!enabled) return component;
        const d = inputValue(clockedCircuit, values, componentById, component.id, 'D');
        return { ...component, memory: { ...component.memory, q: d } };
      }
      if (component.type === 'd-flip-flop') {
        const clk = inputValue(clockedCircuit, values, componentById, component.id, 'CLK');
        const previousClk = Boolean(component.memory?.previousClk);
        const d = inputValue(clockedCircuit, values, componentById, component.id, 'D');
        return {
          ...component,
          memory: {
            ...component.memory,
            q: !previousClk && clk ? d : Boolean(component.memory?.q),
            previousClk: clk,
          },
        };
      }
      return component;
    }),
  };
}

function normalizeSequentialCircuit(circuit: CircuitDocument): CircuitDocument {
  return {
    ...circuit,
    components: circuit.components.map(withSequentialDefaults),
  };
}
