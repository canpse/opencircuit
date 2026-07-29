import documentLimits from '../document-limits.json' with { type: 'json' };

export const DEFAULT_HIERARCHY_LIMITS = Object.freeze({
  maxDepth: documentLimits.maxHierarchyDepth,
  maxComponents: documentLimits.maxFlattenedComponents,
  maxWires: documentLimits.maxFlattenedWires,
  maxInstances: documentLimits.maxExpandedInstances,
  maxPathLength: documentLimits.maxFlattenedPathLength,
  maxIdCharacters: documentLimits.maxFlattenedIdCharacters,
  maxWork: documentLimits.maxHierarchyWork,
});

const LIMIT_SPECS = {
  components: ['maxComponents', 'max-components'],
  wires: ['maxWires', 'max-wires'],
  instances: ['maxInstances', 'max-instances'],
  maxDepth: ['maxDepth', 'max-depth'],
  maxPathLength: ['maxPathLength', 'max-path-length'],
  totalIdCharacters: ['maxIdCharacters', 'max-id-characters'],
  work: ['maxWork', 'max-work'],
};

export class HierarchyExpansionError extends Error {
  constructor(result) {
    const { violation } = result;
    super(formatHierarchyExpansionViolation(violation));
    this.name = 'HierarchyExpansionError';
    this.code = 'HIERARCHY_EXPANSION_LIMIT';
    this.violation = violation;
    this.stats = result.stats;
    this.scopeId = result.scopeId;
  }
}

export function formatHierarchyExpansionViolation(violation) {
  const scope = violation.scopeId ? ` no escopo "${violation.scopeId}"` : '';
  return `Expansão hierárquica excede ${violation.metric}${scope}: ${violation.actual} > ${violation.limit}.`;
}

export function inspectHierarchyExpansion(scope, definitions = [], options = {}) {
  const limits = { ...DEFAULT_HIERARCHY_LIMITS, ...(options.limits ?? {}) };
  const scopeId = options.scopeId ?? 'root';
  const definitionsById = new Map(definitions.map((definition) => [definition.id, definition]));
  const stats = {
    components: 0,
    wires: 0,
    instances: 0,
    maxDepth: 0,
    maxPathLength: 0,
    totalIdCharacters: 0,
    work: 0,
  };
  let violation = null;

  function exceed(metric, actual) {
    if (violation) return;
    const [limitKey, code] = LIMIT_SPECS[metric];
    const limit = limits[limitKey];
    if (actual > limit) {
      violation = { code, metric, limit, actual, scopeId };
    }
  }

  function increase(metric, amount = 1) {
    if (violation || amount <= 0) return;
    const [limitKey] = LIMIT_SPECS[metric];
    const limit = limits[limitKey];
    stats[metric] = Math.min(limit + 1, stats[metric] + amount);
    exceed(metric, stats[metric]);
  }

  function recordPath(path) {
    if (violation) return;
    stats.maxPathLength = Math.max(stats.maxPathLength, path.length);
    exceed('maxPathLength', stats.maxPathLength);
    increase('totalIdCharacters', path.length);
  }

  function prefixedId(prefix, localId) {
    return prefix ? `${prefix}.${localId}` : localId;
  }

  function expand(components, wires, instancePath, isTopLevel, visiting, depth) {
    const resolutions = new Map();

    for (const component of components) {
      increase('work');
      if (violation) return { inputSinkCounts: {}, outputSources: {} };

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

      if (component.type !== 'subcircuit') {
        increase('components');
        recordPath(prefixedId(instancePath, component.id));
        resolutions.set(component.id, { kind: 'component' });
        if (violation) return { inputSinkCounts: {}, outputSources: {} };
        continue;
      }

      increase('instances');
      const childPath = prefixedId(instancePath, component.id);
      recordPath(childPath);
      const childDepth = depth + 1;
      stats.maxDepth = Math.max(stats.maxDepth, childDepth);
      exceed('maxDepth', stats.maxDepth);
      if (violation) return { inputSinkCounts: {}, outputSources: {} };

      const definition = definitionsById.get(component.definitionId);
      if (!definition || visiting.has(definition.id)) {
        resolutions.set(component.id, { kind: 'dangling-instance' });
        continue;
      }

      const childBoundary = expand(
        definition.components,
        definition.wires,
        childPath,
        false,
        new Set(visiting).add(definition.id),
        childDepth,
      );
      resolutions.set(component.id, {
        kind: 'instance',
        outputs: childBoundary.outputSources,
        inputSinkCounts: childBoundary.inputSinkCounts,
      });
      if (violation) return { inputSinkCounts: {}, outputSources: {} };
    }

    const incomingByTarget = new Map();
    for (const wire of wires) {
      const key = `${wire.to.componentId}\0${wire.to.pinId}`;
      if (!incomingByTarget.has(key)) incomingByTarget.set(key, wire);
    }
    const sourceCache = new Map();

    function resolveSource(ref, resolving = new Set()) {
      const key = `${ref.componentId}\0${ref.pinId}`;
      if (sourceCache.has(key)) return sourceCache.get(key);
      if (resolving.has(key)) return null;
      increase('work');
      if (violation) return null;

      const resolution = resolutions.get(ref.componentId);
      let source = null;
      if (resolution?.kind === 'component') {
        source = { kind: 'component' };
      } else if (resolution?.kind === 'marker-input') {
        source = { kind: 'input', pinId: ref.componentId };
      } else if (resolution?.kind === 'instance') {
        const output = resolution.outputs[ref.pinId];
        if (output?.kind === 'component') {
          source = output;
        } else if (output?.kind === 'input') {
          const feedingWire = incomingByTarget.get(`${ref.componentId}\0${output.pinId}`);
          if (feedingWire) {
            const nextResolving = new Set(resolving);
            nextResolving.add(key);
            source = resolveSource(feedingWire.from, nextResolving);
          }
        }
      }
      sourceCache.set(key, source);
      return source;
    }

    function resolveSinkCount(ref) {
      const resolution = resolutions.get(ref.componentId);
      if (resolution?.kind === 'component') return 1;
      if (resolution?.kind === 'instance') return resolution.inputSinkCounts[ref.pinId] ?? 0;
      return 0;
    }

    const pendingInputSinkCounts = new Map();
    for (const wire of wires) {
      increase('work');
      if (violation) return { inputSinkCounts: {}, outputSources: {} };
      const sinkCount = resolveSinkCount(wire.to);
      if (sinkCount === 0) continue;
      const source = resolveSource(wire.from);
      if (source?.kind === 'input') {
        pendingInputSinkCounts.set(
          source.pinId,
          (pendingInputSinkCounts.get(source.pinId) ?? 0) + sinkCount,
        );
      } else if (source?.kind === 'component') {
        increase('wires', sinkCount);
      }
      if (violation) return { inputSinkCounts: {}, outputSources: {} };
    }

    const inputSinkCounts = {};
    const outputSources = {};
    for (const component of components) {
      if (
        component.type === 'input' ||
        component.type === 'clock' ||
        component.type === 'bus-in-4'
      ) {
        inputSinkCounts[component.id] = pendingInputSinkCounts.get(component.id) ?? 0;
      }
      if (component.type !== 'led' && component.type !== 'display-4') continue;
      const feedingWire = incomingByTarget.get(
        `${component.id}\0${component.type === 'led' ? 'in' : 'IN'}`,
      );
      if (!feedingWire) continue;
      const source = resolveSource(feedingWire.from);
      if (source) outputSources[component.id] = source;
      if (violation) return { inputSinkCounts: {}, outputSources: {} };
    }
    return { inputSinkCounts, outputSources };
  }

  expand(scope.components, scope.wires, '', true, new Set(), 0);
  return violation ? { ok: false, stats, violation, scopeId } : { ok: true, stats, scopeId };
}

export function inspectCircuitHierarchy(document, options = {}) {
  const definitions = document.definitions ?? [];
  const rootResult = inspectHierarchyExpansion(document, definitions, {
    ...options,
    scopeId: 'root',
  });
  if (!rootResult.ok) return rootResult;

  const scopes = [rootResult];
  for (const definition of definitions) {
    const result = inspectHierarchyExpansion(
      { version: 1, components: definition.components, wires: definition.wires },
      definitions,
      { ...options, scopeId: definition.id },
    );
    if (!result.ok) return result;
    scopes.push(result);
  }
  return { ok: true, stats: rootResult.stats, scopeId: 'root', scopes };
}

export function assertHierarchyExpansionAllowed(scope, definitions = [], options = {}) {
  const result = inspectHierarchyExpansion(scope, definitions, options);
  if (!result.ok) throw new HierarchyExpansionError(result);
  return result.stats;
}

export function assertCircuitHierarchyAllowed(document, options = {}) {
  const result = inspectCircuitHierarchy(document, options);
  if (!result.ok) throw new HierarchyExpansionError(result);
  return result;
}
