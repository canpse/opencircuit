import { VersionedJsonRepository } from './versioned-json-repository.mjs';

export class CircuitRepository extends VersionedJsonRepository {
  constructor(filename) {
    super(filename, {
      table: 'circuits',
      jsonColumn: 'circuit_json',
      valueField: 'circuit',
      resultField: 'circuit',
      migrationNamespace: 'circuits',
    });
  }
}
