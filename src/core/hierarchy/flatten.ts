import type { CircuitDefinition, CircuitDocument, LogicComponent, PinRef, Wire } from '../types';
import { assertHierarchyExpansionAllowed } from './expansion.mjs';

export interface FlattenPinSource {
  componentId: string;
  pinId: string;
}

export interface FlattenNode {
  /** Flattened component-id prefix for this instance, e.g. "ULA1" or "ULA1.SUB2". */
  instancePath: string;
  /** Id as it appears in its containing components array, e.g. "ULA1" or "SUB2". */
  localId: string;
  /** instancePath of the containing instance, or null when declared directly in the scope passed to flattenCircuit. */
  parentScopePath: string | null;
  definitionId: string;
  isDangling: boolean;
  /** Derived pin id (input or output) -> the real flattened component/pin backing it. Used to lift evaluation results back to instance-local pin ids for canvas display. */
  pinSources: Record<string, FlattenPinSource>;
}

export interface FlattenResult {
  flat: CircuitDocument;
  nodes: FlattenNode[];
}

const flattenCache = new WeakMap<CircuitDocument, WeakMap<CircuitDefinition[], FlattenResult>>();

type LocalResolution =
  | { kind: 'component'; flatId: string }
  | { kind: 'marker-input' }
  | { kind: 'marker-output' }
  | {
      kind: 'instance';
      outputs: Record<string, BoundarySource>;
      inputSinks: Record<string, FlattenPinSource[]>;
    }
  | { kind: 'dangling-instance' };

type BoundarySource =
  { kind: 'component'; source: FlattenPinSource } | { kind: 'input'; pinId: string };

function prefixedId(instancePath: string, localId: string): string {
  return instancePath ? `${instancePath}.${localId}` : localId;
}

interface ExpandParams {
  components: LogicComponent[];
  wires: Wire[];
  instancePath: string;
  isTopLevel: boolean;
  visiting: ReadonlySet<string>;
  ownerInstanceMemory: Record<string, Record<string, boolean>> | undefined;
  relativePathPrefix: string;
}

interface Boundary {
  inputSinks: Record<string, FlattenPinSource[]>;
  outputSources: Record<string, BoundarySource>;
}

/**
 * Flattens a hierarchical CircuitDocument (a root document or a standalone definition
 * preview, plus its `definitions`) into a single flat CircuitDocument with every
 * subcircuit instance expanded, so the existing (unmodified) simulation engine can run
 * on it. Component ids are prefixed by instance path ("ULA1.G3") to stay globally
 * unique and deterministic across ticks for the same logical instance.
 *
 * Marker components are never copied into the flattened graph, only used to route
 * wiring (see catalog.ts's deriveSubcircuitPins for the same rule from the pin-listing
 * side): `input`/`clock` markers are spliced through to whatever drives the enclosing
 * instance's corresponding input pin, and `led` markers are aliased directly to
 * whatever drives their `in` pin internally, exposed as the instance's output pin. See
 * tests/core/hierarchy/flatten.test.ts for worked examples.
 */
export function flattenCircuit(
  scope: CircuitDocument,
  definitions: CircuitDefinition[],
): FlattenResult {
  const cached = flattenCache.get(scope)?.get(definitions);
  if (cached) return cached;

  // This preflight is intentionally before the output arrays are created/populated:
  // hierarchical growth can be multiplicative even when every individual definition
  // respects the per-scope document limits.
  assertHierarchyExpansionAllowed(scope, definitions);

  const definitionsById = new Map(
    definitions.map((definition) => [definition.id, definition] as const),
  );
  const flatComponents: LogicComponent[] = [];
  const flatWires: Wire[] = [];
  const nodes: FlattenNode[] = [];
  let nextWireId = 0;

  function expand(params: ExpandParams): Boundary {
    const {
      components,
      wires,
      instancePath,
      isTopLevel,
      visiting,
      ownerInstanceMemory,
      relativePathPrefix,
    } = params;
    const resolutions = new Map<string, LocalResolution>();
    const instanceNodes: Array<{
      componentId: string;
      node: FlattenNode;
      inputPinIds: string[];
      outputPinIds: string[];
    }> = [];

    for (const component of components) {
      if (
        !isTopLevel &&
        (component.type === 'input' || component.type === 'clock' || component.type === 'bus-in-4')
      ) {
        resolutions.set(component.id, { kind: 'marker-input' });
        continue;
      }

      if (!isTopLevel && (component.type === 'led' || component.type === 'display-4')) {
        resolutions.set(component.id, { kind: 'marker-output' });
        continue;
      }

      if (component.type === 'subcircuit') {
        const definition = component.definitionId
          ? definitionsById.get(component.definitionId)
          : undefined;
        const childInstancePath = prefixedId(instancePath, component.id);

        if (!definition || visiting.has(definition.id)) {
          resolutions.set(component.id, { kind: 'dangling-instance' });
          nodes.push({
            instancePath: childInstancePath,
            localId: component.id,
            parentScopePath: instancePath || null,
            definitionId: component.definitionId ?? '',
            isDangling: true,
            pinSources: {},
          });
          continue;
        }

        const childOwnerInstanceMemory = isTopLevel
          ? component.instanceMemory
          : ownerInstanceMemory;
        const childRelativePathPrefix = isTopLevel
          ? ''
          : relativePathPrefix
            ? `${relativePathPrefix}.${component.id}`
            : component.id;

        const childBoundary = expand({
          components: definition.components,
          wires: definition.wires,
          instancePath: childInstancePath,
          isTopLevel: false,
          visiting: new Set(visiting).add(definition.id),
          ownerInstanceMemory: childOwnerInstanceMemory,
          relativePathPrefix: childRelativePathPrefix,
        });

        resolutions.set(component.id, {
          kind: 'instance',
          outputs: childBoundary.outputSources,
          inputSinks: childBoundary.inputSinks,
        });

        const pinSources: Record<string, FlattenPinSource> = {};
        for (const [pinId, boundarySource] of Object.entries(childBoundary.outputSources)) {
          if (boundarySource.kind === 'component') pinSources[pinId] = boundarySource.source;
        }
        for (const [pinId, sinks] of Object.entries(childBoundary.inputSinks)) {
          if (sinks.length > 0) pinSources[pinId] = sinks[0];
        }
        const node: FlattenNode = {
          instancePath: childInstancePath,
          localId: component.id,
          parentScopePath: instancePath || null,
          definitionId: definition.id,
          isDangling: false,
          pinSources,
        };
        nodes.push(node);
        instanceNodes.push({
          componentId: component.id,
          node,
          inputPinIds: Object.keys(childBoundary.inputSinks),
          outputPinIds: Object.keys(childBoundary.outputSources),
        });
        continue;
      }

      // Regular leaf component (gate, block, or a literal top-level input/clock/button/etc).
      const flatId = prefixedId(instancePath, component.id);
      const relativePath = relativePathPrefix
        ? `${relativePathPrefix}.${component.id}`
        : component.id;
      const seededMemory =
        component.memory === undefined
          ? undefined
          : (ownerInstanceMemory?.[relativePath] ?? component.memory);
      flatComponents.push({ ...component, id: flatId, memory: seededMemory });
      resolutions.set(component.id, { kind: 'component', flatId });
    }

    const incomingByTarget = new Map<string, Wire>();
    for (const wire of wires) {
      const key = `${wire.to.componentId}\0${wire.to.pinId}`;
      if (!incomingByTarget.has(key)) incomingByTarget.set(key, wire);
    }
    const sourceCache = new Map<string, BoundarySource | null>();

    function resolveBoundarySource(
      ref: PinRef,
      resolving = new Set<string>(),
    ): BoundarySource | null {
      const resolutionKey = `${ref.componentId}\0${ref.pinId}`;
      if (sourceCache.has(resolutionKey)) return sourceCache.get(resolutionKey) ?? null;
      if (resolving.has(resolutionKey)) return null;

      const resolution = resolutions.get(ref.componentId);
      if (!resolution) return null;
      let source: BoundarySource | null = null;
      if (resolution.kind === 'component') {
        source = {
          kind: 'component',
          source: { componentId: resolution.flatId, pinId: ref.pinId },
        };
      } else if (resolution.kind === 'marker-input') {
        source = { kind: 'input', pinId: ref.componentId };
      } else if (resolution.kind === 'instance') {
        const output = resolution.outputs[ref.pinId];
        if (output?.kind === 'component') {
          source = output;
        } else if (output?.kind === 'input') {
          const feedingWire = incomingByTarget.get(`${ref.componentId}\0${output.pinId}`);
          if (feedingWire) {
            const nextResolving = new Set(resolving);
            nextResolving.add(resolutionKey);
            source = resolveBoundarySource(feedingWire.from, nextResolving);
          }
        }
      }
      sourceCache.set(resolutionKey, source);
      return source;
    }
    function resolveSinks(ref: PinRef): FlattenPinSource[] {
      const resolution = resolutions.get(ref.componentId);
      if (!resolution) return [];
      if (resolution.kind === 'component')
        return [{ componentId: resolution.flatId, pinId: ref.pinId }];
      if (resolution.kind === 'instance') return resolution.inputSinks[ref.pinId] ?? [];
      // marker-output (LED) is dropped from the flattened graph; its exposed value is
      // read directly from whatever drives it (see outputSources below), not by
      // routing a real wire into it.
      return [];
    }

    // Once every component in this scope has a resolution, aliases that cross a
    // child boundary can be followed to their real source in this scope. Besides
    // preserving the flattened wire, this keeps the instance pins shown on the
    // canvas tied to the value that actually drives them.
    for (const instanceNode of instanceNodes) {
      for (const pinId of instanceNode.inputPinIds) {
        if (instanceNode.node.pinSources[pinId]) continue;
        const feedingWire = incomingByTarget.get(`${instanceNode.componentId}\0${pinId}`);
        const source = feedingWire ? resolveBoundarySource(feedingWire.from) : null;
        if (source?.kind === 'component') {
          instanceNode.node.pinSources[pinId] = source.source;
        }
      }
      for (const pinId of instanceNode.outputPinIds) {
        if (instanceNode.node.pinSources[pinId]) continue;
        const source = resolveBoundarySource({ componentId: instanceNode.componentId, pinId });
        if (source?.kind === 'component') {
          instanceNode.node.pinSources[pinId] = source.source;
        }
      }
    }

    const pendingInputSinks = new Map<string, FlattenPinSource[]>();

    for (const wire of wires) {
      const sinks = resolveSinks(wire.to);
      if (sinks.length === 0) continue;

      const source = resolveBoundarySource(wire.from);
      if (source?.kind === 'input') {
        const existing = pendingInputSinks.get(source.pinId);
        if (existing) existing.push(...sinks);
        else pendingInputSinks.set(source.pinId, [...sinks]);
        continue;
      }

      if (!source) continue;
      for (const sink of sinks) {
        flatWires.push({ id: `w${nextWireId++}`, from: source.source, to: sink });
      }
    }

    const inputSinks: Record<string, FlattenPinSource[]> = {};
    for (const component of components) {
      if (
        component.type === 'input' ||
        component.type === 'clock' ||
        component.type === 'bus-in-4'
      ) {
        inputSinks[component.id] = pendingInputSinks.get(component.id) ?? [];
      }
    }

    const outputSources: Record<string, BoundarySource> = {};
    for (const component of components) {
      if (component.type !== 'led' && component.type !== 'display-4') continue;
      const feedingWire = incomingByTarget.get(
        `${component.id}\0${component.type === 'led' ? 'in' : 'IN'}`,
      );
      if (!feedingWire) continue;
      const source = resolveBoundarySource(feedingWire.from);
      if (source) outputSources[component.id] = source;
    }

    return { inputSinks, outputSources };
  }

  expand({
    components: scope.components,
    wires: scope.wires,
    instancePath: '',
    isTopLevel: true,
    visiting: new Set<string>(),
    ownerInstanceMemory: undefined,
    relativePathPrefix: '',
  });

  const result: FlattenResult = {
    flat: { version: 1, components: flatComponents, wires: flatWires },
    nodes,
  };
  let byDefinitions = flattenCache.get(scope);
  if (!byDefinitions) {
    byDefinitions = new WeakMap();
    flattenCache.set(scope, byDefinitions);
  }
  byDefinitions.set(definitions, result);
  return result;
}
