import type { CircuitDocument, LogicComponent } from '../types';
import { evaluateCircuit } from './simulate';
import { inputValue } from './signals';

export const SEQUENTIAL_TYPES = ['clock', 'd-latch', 'd-flip-flop', 'register-4'] as const;

export function isSequentialType(type: LogicComponent['type']): boolean {
  return SEQUENTIAL_TYPES.includes(type as (typeof SEQUENTIAL_TYPES)[number]);
}

function memoryHasBooleans(memory: Record<string, boolean> | undefined, keys: string[]): boolean {
  return Boolean(memory) && keys.every((key) => typeof memory?.[key] === 'boolean');
}

// Componentes já normalizados são devolvidos como estão: preservar a
// identidade referencial evita re-renderizações desnecessárias na UI.
export function withSequentialDefaults(component: LogicComponent): LogicComponent {
  if (component.type === 'clock') {
    if (typeof component.state === 'boolean') return component;
    return { ...component, state: Boolean(component.state) };
  }
  if (component.type === 'd-latch' || component.type === 'd-flip-flop') {
    if (memoryHasBooleans(component.memory, ['q', 'previousClk'])) return component;
    return {
      ...component,
      memory: {
        q: Boolean(component.memory?.q),
        previousClk: Boolean(component.memory?.previousClk),
      },
    };
  }
  if (component.type === 'register-4') {
    if (memoryHasBooleans(component.memory, ['q0', 'q1', 'q2', 'q3', 'previousClk'])) {
      return component;
    }
    return {
      ...component,
      memory: {
        q0: Boolean(component.memory?.q0),
        q1: Boolean(component.memory?.q1),
        q2: Boolean(component.memory?.q2),
        q3: Boolean(component.memory?.q3),
        previousClk: Boolean(component.memory?.previousClk),
      },
    };
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
  const componentById = new Map(
    clockedCircuit.components.map((component) => [component.id, component]),
  );

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
      if (component.type === 'register-4') {
        const clk = inputValue(clockedCircuit, values, componentById, component.id, 'CLK');
        const previousClk = Boolean(component.memory?.previousClk);
        if (!previousClk && clk) {
          return {
            ...component,
            memory: {
              ...component.memory,
              q0: inputValue(clockedCircuit, values, componentById, component.id, 'D0'),
              q1: inputValue(clockedCircuit, values, componentById, component.id, 'D1'),
              q2: inputValue(clockedCircuit, values, componentById, component.id, 'D2'),
              q3: inputValue(clockedCircuit, values, componentById, component.id, 'D3'),
              previousClk: clk,
            },
          };
        }
        return { ...component, memory: { ...component.memory, previousClk: clk } };
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
