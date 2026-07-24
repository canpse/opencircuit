import type { CircuitDefinition, CircuitDocument, LogicComponent, PinRef, Wire } from '../types';

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

type LocalResolution =
  | { kind: 'component'; flatId: string }
  | { kind: 'marker-input' }
  | { kind: 'marker-output' }
  | {
      kind: 'instance';
      outputs: Record<string, FlattenPinSource>;
      inputSinks: Record<string, FlattenPinSource[]>;
    }
  | { kind: 'dangling-instance' };

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
  outputSources: Record<string, FlattenPinSource>;
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

    for (const component of components) {
      if (!isTopLevel && (component.type === 'input' || component.type === 'clock')) {
        resolutions.set(component.id, { kind: 'marker-input' });
        continue;
      }

      if (!isTopLevel && component.type === 'led') {
        resolutions.set(component.id, { kind: 'marker-output' });
        continue;
      }

      if (component.type === 'subcircuit') {
        const definition = component.definitionId
          ? definitions.find((candidate) => candidate.id === component.definitionId)
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

        const pinSources: Record<string, FlattenPinSource> = { ...childBoundary.outputSources };
        for (const [pinId, sinks] of Object.entries(childBoundary.inputSinks)) {
          if (sinks.length > 0) pinSources[pinId] = sinks[0];
        }
        nodes.push({
          instancePath: childInstancePath,
          localId: component.id,
          parentScopePath: instancePath || null,
          definitionId: definition.id,
          isDangling: false,
          pinSources,
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

    function resolveSource(ref: PinRef): FlattenPinSource | null {
      const resolution = resolutions.get(ref.componentId);
      if (!resolution) return null;
      if (resolution.kind === 'component')
        return { componentId: resolution.flatId, pinId: ref.pinId };
      if (resolution.kind === 'instance') return resolution.outputs[ref.pinId] ?? null;
      return null;
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

    const pendingInputSinks = new Map<string, FlattenPinSource[]>();

    for (const wire of wires) {
      const sinks = resolveSinks(wire.to);
      if (sinks.length === 0) continue;

      const fromResolution = resolutions.get(wire.from.componentId);
      if (fromResolution?.kind === 'marker-input') {
        const existing = pendingInputSinks.get(wire.from.componentId) ?? [];
        pendingInputSinks.set(wire.from.componentId, [...existing, ...sinks]);
        continue;
      }

      const source = resolveSource(wire.from);
      if (!source) continue;
      for (const sink of sinks) {
        flatWires.push({ id: `w${nextWireId++}`, from: source, to: sink });
      }
    }

    const inputSinks: Record<string, FlattenPinSource[]> = {};
    for (const component of components) {
      if (component.type === 'input' || component.type === 'clock') {
        inputSinks[component.id] = pendingInputSinks.get(component.id) ?? [];
      }
    }

    const outputSources: Record<string, FlattenPinSource> = {};
    for (const component of components) {
      if (component.type !== 'led') continue;
      const feedingWire = wires.find((wire) => wire.to.componentId === component.id);
      if (!feedingWire) continue;
      const source = resolveSource(feedingWire.from);
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

  return { flat: { version: 1, components: flatComponents, wires: flatWires }, nodes };
}
