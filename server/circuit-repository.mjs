import { VersionedJsonRepository } from './versioned-json-repository.mjs';

/** @extends {VersionedJsonRepository<import('../src/core/types.js').CircuitDocument, import('./contracts.mjs').StoredCircuit>} */
export class CircuitRepository extends VersionedJsonRepository {
  /** @param {string} filename */
  constructor(filename) {
    super(filename, {
      table: 'circuits',
      jsonColumn: 'circuit_json',
      valueField: 'circuit',
      migrationNamespace: 'circuits',
    });
  }
}
