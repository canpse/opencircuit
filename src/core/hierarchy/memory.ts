import type { CircuitDocument, LogicComponent } from '../types';

/**
 * Copies post-tick sequential state from a flattened, stepped CircuitDocument back onto
 * the original (non-flattened) scope that was passed to flattenCircuit -- both `.memory`
 * (d-latch/d-flip-flop/register-4) and `.state` (clock: stepCircuit toggles a clock's own
 * `.state` every call, and that toggle has to survive to the next tick, or the clock
 * "resets" to its original phase on every single step and never produces a second real
 * rising edge).
 *
 * A flattened component id is either a bare local id (a component declared directly in
 * `scope`) or a dotted path "ownerId.relativePath" (a component that lives inside one of
 * `scope`'s subcircuit instances, possibly several levels deep). For the bare case, state
 * is written straight onto that component. For the dotted case, only `.memory` applies --
 * flattenCircuit always treats a non-top-level `clock` as a boundary marker spliced from
 * outside (see flatten.ts), so a `clock` never appears past the first dot and `.state`
 * never needs an `instanceMemory`-style per-instance home. Memory is written onto the
 * owning instance's `instanceMemory[relativePath]` -- never onto the shared definition
 * template -- so that two instances of the same definition never leak sequential state
 * into each other.
 */
export function writeBackMemory(
  scope: CircuitDocument,
  steppedFlat: CircuitDocument,
): CircuitDocument {
  const byId = new Map(scope.components.map((component) => [component.id, component]));
  const patches = new Map<string, LogicComponent>();

  for (const flatComponent of steppedFlat.components) {
    const dotIndex = flatComponent.id.indexOf('.');

    if (dotIndex === -1) {
      if (flatComponent.memory === undefined && flatComponent.state === undefined) continue;
      const owner = byId.get(flatComponent.id);
      if (!owner) continue;
      const patch = patches.get(owner.id) ?? owner;
      patches.set(owner.id, {
        ...patch,
        ...(flatComponent.memory !== undefined ? { memory: { ...flatComponent.memory } } : {}),
        ...(flatComponent.state !== undefined ? { state: flatComponent.state } : {}),
      });
      continue;
    }

    if (flatComponent.memory === undefined) continue;
    const ownerId = flatComponent.id.slice(0, dotIndex);
    const relativePath = flatComponent.id.slice(dotIndex + 1);
    const owner = byId.get(ownerId);
    if (!owner || owner.type !== 'subcircuit') continue;
    const patch = patches.get(ownerId) ?? owner;
    patches.set(ownerId, {
      ...patch,
      instanceMemory: { ...patch.instanceMemory, [relativePath]: { ...flatComponent.memory } },
    });
  }

  if (patches.size === 0) return scope;
  return {
    ...scope,
    components: scope.components.map((component) => patches.get(component.id) ?? component),
  };
}
