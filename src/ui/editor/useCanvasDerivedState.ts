import { useMemo } from 'react';
import type { CircuitDefinition, CircuitDocument } from '../../core/types';
import { measureProfile } from '../../performance/profiling';
import { useCanvasLayoutComponents } from './canvasMemo';
import type { Selection, WireStyle } from './editorTypes';
import { computeTunnelFromOffsets, routeCircuitWires, type WireTrunk } from './wireRouting';

interface Options {
  circuit: CircuitDocument;
  definitions: CircuitDefinition[];
  wireStyle: WireStyle;
  changedSignals: ReadonlyMap<string, number>;
  selection: Selection;
}

export function useCanvasDerivedState({
  circuit,
  definitions,
  wireStyle,
  changedSignals,
  selection,
}: Options) {
  // Layout identity remains stable across clock ticks that change only state/memory.
  const layoutComponents = useCanvasLayoutComponents(circuit.components);
  const componentById = useMemo(
    () => new Map(layoutComponents.map((component) => [component.id, component])),
    [layoutComponents],
  );
  const routing = useMemo(() => {
    const routedWires = wireStyle === 'orthogonal' ? circuit.wires : [];
    if (routedWires.length === 0) return { routes: [], trunks: [] };
    return measureProfile(
      'routing.orthogonal',
      { components: layoutComponents.length, wires: routedWires.length },
      () => routeCircuitWires(routedWires, componentById, layoutComponents, definitions),
    );
  }, [wireStyle, circuit.wires, componentById, layoutComponents, definitions]);
  const routeByWireId = useMemo(
    () => new Map(routing.routes.map((route) => [route.wireId, route])),
    [routing],
  );
  const wireTrunks = routing.trunks;
  const branchTrunkByWireId = useMemo(() => {
    const map = new Map<string, WireTrunk>();
    for (const trunk of wireTrunks) {
      for (const wireId of trunk.branchWireIds) map.set(wireId, trunk);
    }
    return map;
  }, [wireTrunks]);
  const tunnelFromOffsetByWireId = useMemo(
    () => computeTunnelFromOffsets(circuit.wires),
    [circuit.wires],
  );
  const changedPinsByComponentId = useMemo(() => {
    const map = new Map<string, Map<string, number>>();
    for (const [key, generation] of changedSignals) {
      const [componentId, pinId] = key.split(':');
      const forComponent = map.get(componentId) ?? new Map<string, number>();
      forComponent.set(pinId, generation);
      map.set(componentId, forComponent);
    }
    return map;
  }, [changedSignals]);
  const selectedComponentIds = useMemo(
    () => new Set(selection.componentIds),
    [selection.componentIds],
  );
  const selectedWireIds = useMemo(() => new Set(selection.wireIds), [selection.wireIds]);

  return {
    layoutComponents,
    componentById,
    routeByWireId,
    wireTrunks,
    branchTrunkByWireId,
    tunnelFromOffsetByWireId,
    changedPinsByComponentId,
    selectedComponentIds,
    selectedWireIds,
  };
}
