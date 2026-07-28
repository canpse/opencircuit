// @vitest-environment jsdom

import { act, cleanup, renderHook, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { simulateCircuit } from '../../src/core/simulation/simulate';
import type {
  SimulationRequest,
  SimulationResponse,
} from '../../src/core/simulation/simulationSession';
import type { CircuitDocument } from '../../src/core/types';
import { useSimulationRuntime } from '../../src/ui/hooks/useSimulationRuntime';

class ControlledWorker {
  static instances: ControlledWorker[] = [];

  readonly requests: SimulationRequest[] = [];
  private readonly messageListeners = new Set<(event: MessageEvent<SimulationResponse>) => void>();

  constructor() {
    ControlledWorker.instances.push(this);
  }

  addEventListener(type: string, listener: (event: MessageEvent<SimulationResponse>) => void) {
    if (type === 'message') this.messageListeners.add(listener);
  }

  removeEventListener(type: string, listener: (event: MessageEvent<SimulationResponse>) => void) {
    if (type === 'message') this.messageListeners.delete(listener);
  }

  postMessage(request: SimulationRequest) {
    this.requests.push(request);
  }

  emit(response: SimulationResponse) {
    const event = { data: response } as MessageEvent<SimulationResponse>;
    for (const listener of this.messageListeners) listener(event);
  }

  terminate() {}
}

const circuit: CircuitDocument = {
  version: 1,
  components: [
    {
      id: 'input-1',
      type: 'input',
      x: 100,
      y: 100,
      state: false,
    },
    {
      id: 'output-1',
      type: 'led',
      x: 300,
      y: 100,
    },
  ],
  wires: [
    {
      id: 'wire-1',
      from: { componentId: 'input-1', pinId: 'out' },
      to: { componentId: 'output-1', pinId: 'in' },
    },
  ],
};

describe('useSimulationRuntime', () => {
  beforeEach(() => {
    ControlledWorker.instances = [];
    vi.stubGlobal('Worker', ControlledWorker);
  });

  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
  });

  it('ignores stale Worker replies and applies the newest simulation', async () => {
    const { result, rerender } = renderHook(
      ({ document, tick }: { document: CircuitDocument; tick: number }) =>
        useSimulationRuntime(document, tick, []),
      { initialProps: { document: circuit, tick: 1 } },
    );

    await waitFor(() => {
      expect(ControlledWorker.instances).toHaveLength(1);
      expect(ControlledWorker.instances[0].requests).toHaveLength(1);
    });

    const worker = ControlledWorker.instances[0];
    const firstRequest = worker.requests[0];
    if (firstRequest.type !== 'simulate') {
      throw new Error('Expected a simulation request');
    }
    const updatedCircuit: CircuitDocument = {
      ...circuit,
      components: circuit.components.map((component) =>
        component.id === 'input-1' ? { ...component, state: true } : component,
      ),
    };

    rerender({ document: updatedCircuit, tick: 2 });
    await waitFor(() => {
      expect(worker.requests).toHaveLength(2);
    });
    const secondRequest = worker.requests[1];
    if (secondRequest.type !== 'simulate') {
      throw new Error('Expected a simulation request');
    }

    act(() => {
      worker.emit({
        id: firstRequest.id,
        result: simulateCircuit(firstRequest.circuit),
      });
    });
    expect(result.current.simulationTick).toBe(1);
    expect(result.current.evaluation).toEqual({});

    act(() => {
      worker.emit({
        id: secondRequest.id,
        result: simulateCircuit(secondRequest.circuit),
      });
    });
    await waitFor(() => {
      expect(result.current.simulationTick).toBe(2);
      expect(result.current.evaluation['output-1']?.in).toBe(true);
    });
  });
});
