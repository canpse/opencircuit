import { VersionedJsonRepository } from './versioned-json-repository.mjs';

/** @extends {VersionedJsonRepository<import('./contracts.mjs').LibraryComponentDefinition, import('./contracts.mjs').StoredLibraryEntry>} */
export class LibraryRepository extends VersionedJsonRepository {
  /** @param {string} filename */
  constructor(filename) {
    super(filename, {
      table: 'library_components',
      jsonColumn: 'definition_json',
      valueField: 'definition',
      migrationNamespace: 'library',
    });
  }
}
