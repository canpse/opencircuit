import type { CircuitDocument, EvaluationResult, LogicComponent } from '../types';
import { inputValue, writeMany, writePin } from './signals';

export function evaluateComponent(
  component: LogicComponent,
  circuit: CircuitDocument,
  values: EvaluationResult,
  componentById: Map<string, LogicComponent>,
): boolean {
  switch (component.type) {
    case 'input':
    case 'button':
      return writePin(
        values,
        { componentId: component.id, pinId: 'out' },
        Boolean(component.state),
      );
    case 'clock':
      return writePin(
        values,
        { componentId: component.id, pinId: 'CLK' },
        Boolean(component.state),
      );
    case 'd-latch':
    case 'd-flip-flop':
      return writePin(
        values,
        { componentId: component.id, pinId: 'Q' },
        Boolean(component.memory?.q),
      );
    case 'register-4':
      return writeMany(values, component.id, {
        Q0: Boolean(component.memory?.q0),
        Q1: Boolean(component.memory?.q1),
        Q2: Boolean(component.memory?.q2),
        Q3: Boolean(component.memory?.q3),
      });
    case 'led':
    case 'text':
      return false;
    case 'not':
      return writePin(
        values,
        { componentId: component.id, pinId: 'out' },
        !inputValue(circuit, values, componentById, component.id, 'in'),
      );
    case 'and': {
      const a = inputValue(circuit, values, componentById, component.id, 'a');
      const b = inputValue(circuit, values, componentById, component.id, 'b');
      return writePin(values, { componentId: component.id, pinId: 'out' }, a && b);
    }
    case 'nand': {
      const a = inputValue(circuit, values, componentById, component.id, 'a');
      const b = inputValue(circuit, values, componentById, component.id, 'b');
      return writePin(values, { componentId: component.id, pinId: 'out' }, !(a && b));
    }
    case 'or': {
      const a = inputValue(circuit, values, componentById, component.id, 'a');
      const b = inputValue(circuit, values, componentById, component.id, 'b');
      return writePin(values, { componentId: component.id, pinId: 'out' }, a || b);
    }
    case 'nor': {
      const a = inputValue(circuit, values, componentById, component.id, 'a');
      const b = inputValue(circuit, values, componentById, component.id, 'b');
      return writePin(values, { componentId: component.id, pinId: 'out' }, !(a || b));
    }
    case 'xor': {
      const a = inputValue(circuit, values, componentById, component.id, 'a');
      const b = inputValue(circuit, values, componentById, component.id, 'b');
      return writePin(values, { componentId: component.id, pinId: 'out' }, a !== b);
    }
    case 'xnor': {
      const a = inputValue(circuit, values, componentById, component.id, 'a');
      const b = inputValue(circuit, values, componentById, component.id, 'b');
      return writePin(values, { componentId: component.id, pinId: 'out' }, a === b);
    }
    case 'half-adder': {
      const a = inputValue(circuit, values, componentById, component.id, 'A');
      const b = inputValue(circuit, values, componentById, component.id, 'B');
      return writeMany(values, component.id, { SUM: a !== b, CARRY: a && b });
    }
    case 'full-adder': {
      const a = inputValue(circuit, values, componentById, component.id, 'A');
      const b = inputValue(circuit, values, componentById, component.id, 'B');
      const cin = inputValue(circuit, values, componentById, component.id, 'Cin');
      return writeMany(values, component.id, {
        SUM: (a !== b) !== cin,
        Cout: (a && b) || (cin && a !== b),
      });
    }
    case 'mux-2-1': {
      const a = inputValue(circuit, values, componentById, component.id, 'A');
      const b = inputValue(circuit, values, componentById, component.id, 'B');
      const sel = inputValue(circuit, values, componentById, component.id, 'Sel');
      return writePin(values, { componentId: component.id, pinId: 'OUT' }, sel ? b : a);
    }
    case 'mux-4-1': {
      const d0 = inputValue(circuit, values, componentById, component.id, 'D0');
      const d1 = inputValue(circuit, values, componentById, component.id, 'D1');
      const d2 = inputValue(circuit, values, componentById, component.id, 'D2');
      const d3 = inputValue(circuit, values, componentById, component.id, 'D3');
      const s0 = inputValue(circuit, values, componentById, component.id, 'S0');
      const s1 = inputValue(circuit, values, componentById, component.id, 'S1');
      return writePin(
        values,
        { componentId: component.id, pinId: 'OUT' },
        s1 ? (s0 ? d3 : d2) : s0 ? d1 : d0,
      );
    }
    case 'decoder-2-4': {
      const a = inputValue(circuit, values, componentById, component.id, 'A');
      const b = inputValue(circuit, values, componentById, component.id, 'B');
      return writeMany(values, component.id, {
        Y0: !a && !b,
        Y1: !a && b,
        Y2: a && !b,
        Y3: a && b,
      });
    }
    case 'comparator-1-bit': {
      const a = inputValue(circuit, values, componentById, component.id, 'A');
      const b = inputValue(circuit, values, componentById, component.id, 'B');
      return writeMany(values, component.id, { GT: a && !b, EQ: a === b, LT: !a && b });
    }
    case 'encoder-4-2': {
      const d1 = inputValue(circuit, values, componentById, component.id, 'D1');
      const d2 = inputValue(circuit, values, componentById, component.id, 'D2');
      const d3 = inputValue(circuit, values, componentById, component.id, 'D3');
      return writeMany(values, component.id, { Y0: d1 || d3, Y1: d2 || d3 });
    }
    case 'odd-parity-3': {
      const a = inputValue(circuit, values, componentById, component.id, 'A');
      const b = inputValue(circuit, values, componentById, component.id, 'B');
      const c = inputValue(circuit, values, componentById, component.id, 'C');
      return writePin(values, { componentId: component.id, pinId: 'OUT' }, (a !== b) !== c);
    }
    case 'majority-3': {
      const a = inputValue(circuit, values, componentById, component.id, 'A');
      const b = inputValue(circuit, values, componentById, component.id, 'B');
      const c = inputValue(circuit, values, componentById, component.id, 'C');
      return writePin(
        values,
        { componentId: component.id, pinId: 'OUT' },
        (a && b) || (a && c) || (b && c),
      );
    }
    case 'half-subtractor': {
      const a = inputValue(circuit, values, componentById, component.id, 'A');
      const b = inputValue(circuit, values, componentById, component.id, 'B');
      return writeMany(values, component.id, { DIFF: a !== b, BORROW: !a && b });
    }
    case 'full-subtractor': {
      const a = inputValue(circuit, values, componentById, component.id, 'A');
      const b = inputValue(circuit, values, componentById, component.id, 'B');
      const bin = inputValue(circuit, values, componentById, component.id, 'Bin');
      return writeMany(values, component.id, {
        DIFF: (a !== b) !== bin,
        Bout: (!a && b) || (bin && !(a !== b)),
      });
    }
  }
}
