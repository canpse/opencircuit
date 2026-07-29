import { VersionedJsonRepository } from './versioned-json-repository.mjs';

export class LibraryRepository extends VersionedJsonRepository {
  constructor(filename) {
    super(filename, {
      table: 'library_components',
      jsonColumn: 'definition_json',
      valueField: 'definition',
      resultField: 'entry',
      migrationNamespace: 'library',
    });
  }
}
