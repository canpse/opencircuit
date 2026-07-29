import { afterEach, beforeEach, describe, expect, test } from 'vitest';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { DatabaseSync } from 'node:sqlite';
import { CircuitRepository } from '../../server/circuit-repository.mjs';
import { LibraryRepository } from '../../server/library-repository.mjs';

const emptyCircuit = { version: 1, components: [], wires: [] };
const emptyDefinition = { components: [], wires: [] };

describe('migrations dos repositórios versionados', () => {
  let directory;
  let filename;
  let repositories;

  beforeEach(() => {
    directory = mkdtempSync(join(tmpdir(), 'opencircuit-migrations-'));
    filename = join(directory, 'test.sqlite');
    repositories = new Set();
  });

  afterEach(() => {
    closeRepositories();
    rmSync(directory, { recursive: true });
  });

  test.each([
    {
      name: 'circuitos antes da biblioteca',
      constructors: [CircuitRepository, LibraryRepository],
    },
    {
      name: 'biblioteca antes dos circuitos',
      constructors: [LibraryRepository, CircuitRepository],
    },
  ])('inicializa os dois recursos no mesmo banco: $name', ({ constructors }) => {
    const opened = constructors.map((Repository) => open(Repository));
    const circuitRepository = opened.find((repository) => repository instanceof CircuitRepository);
    const libraryRepository = opened.find((repository) => repository instanceof LibraryRepository);

    const circuit = circuitRepository.create('owner', 'Circuito', emptyCircuit);
    const entry = libraryRepository.create('owner', 'Componente', emptyDefinition);

    expect(circuitRepository.get('owner', circuit.id)?.circuit).toEqual(emptyCircuit);
    expect(libraryRepository.get('owner', entry.id)?.definition).toEqual(emptyDefinition);
    expect(readMigrationRows(circuitRepository.db)).toEqual([
      { namespace: 'circuits', version: 1 },
      { namespace: 'library', version: 1 },
    ]);
  });

  test('permanece idempotente após chamadas repetidas e reabertura do banco', () => {
    const circuits = open(CircuitRepository);
    const library = open(LibraryRepository);

    circuits.migrate();
    circuits.migrate();
    library.migrate();
    library.migrate();
    closeRepositories();

    const reopenedLibrary = open(LibraryRepository);
    const reopenedCircuits = open(CircuitRepository);

    expect(readMigrationRows(reopenedCircuits.db)).toEqual([
      { namespace: 'circuits', version: 1 },
      { namespace: 'library', version: 1 },
    ]);
    expect(
      reopenedLibrary.db
        .prepare(
          "SELECT name FROM sqlite_schema WHERE type = 'table' AND name IN ('circuits', 'library_components') ORDER BY name",
        )
        .all(),
    ).toEqual([{ name: 'circuits' }, { name: 'library_components' }]);
  });

  test.each([
    {
      name: 'circuitos',
      createLegacyResource: createLegacyCircuits,
      firstRepository: LibraryRepository,
      secondRepository: CircuitRepository,
      assertLegacyData(repository) {
        expect(repository.get('legacy-owner', 'legacy-id')).toMatchObject({
          id: 'legacy-id',
          name: 'Legado',
          circuit: emptyCircuit,
          revision: 1,
        });
      },
    },
    {
      name: 'biblioteca',
      createLegacyResource: createLegacyLibrary,
      firstRepository: CircuitRepository,
      secondRepository: LibraryRepository,
      assertLegacyData(repository) {
        expect(repository.get('legacy-owner', 'legacy-id')).toMatchObject({
          id: 'legacy-id',
          name: 'Legado',
          definition: emptyDefinition,
          revision: 1,
        });
      },
    },
  ])(
    'atualiza o ledger legado de $name sem perder os registros existentes',
    ({ createLegacyResource, firstRepository, secondRepository, assertLegacyData }) => {
      createLegacyDatabase(createLegacyResource);

      open(firstRepository);
      const legacyRepository = open(secondRepository);

      assertLegacyData(legacyRepository);
      expect(readMigrationRows(legacyRepository.db)).toEqual([
        { namespace: 'circuits', version: 1 },
        { namespace: 'library', version: 1 },
      ]);
      expect(
        legacyRepository.db.prepare('PRAGMA table_info(schema_migrations)').all().map(rowName),
      ).toEqual(['namespace', 'version', 'applied_at']);
    },
  );

  test('reverte o DDL e o registro quando uma migration falha', () => {
    const repository = open(CircuitRepository);

    expect(() =>
      repository.applyMigration(2, () => {
        repository.db.exec(`
          CREATE TABLE transient_migration_data (id TEXT PRIMARY KEY);
          SELECT * FROM missing_table;
        `);
      }),
    ).toThrow();

    expect(
      repository.db
        .prepare(
          "SELECT 1 FROM sqlite_schema WHERE type = 'table' AND name = 'transient_migration_data'",
        )
        .get(),
    ).toBeUndefined();
    expect(
      repository.db
        .prepare('SELECT 1 FROM schema_migrations WHERE namespace = ? AND version = ?')
        .get('circuits', 2),
    ).toBeUndefined();
  });

  test('recusa versão legada desconhecida sem alterar o ledger', () => {
    const database = new DatabaseSync(filename);
    database.exec(`
      CREATE TABLE schema_migrations (
        version INTEGER PRIMARY KEY,
        applied_at TEXT NOT NULL
      );
      INSERT INTO schema_migrations(version, applied_at)
      VALUES (2, '2026-01-01T00:00:00.000Z');
    `);
    database.close();

    expect(() => new CircuitRepository(filename)).toThrow(
      'Migration legada desconhecida: versão 2',
    );

    const inspectionDatabase = new DatabaseSync(filename);
    expect(
      inspectionDatabase.prepare('PRAGMA table_info(schema_migrations)').all().map(rowName),
    ).toEqual(['version', 'applied_at']);
    expect(inspectionDatabase.prepare('SELECT version FROM schema_migrations').all()).toEqual([
      { version: 2 },
    ]);
    inspectionDatabase.close();
  });

  function open(Repository) {
    const repository = new Repository(filename);
    repositories.add(repository);
    return repository;
  }

  function closeRepositories() {
    for (const repository of repositories) repository.close();
    repositories.clear();
  }

  function createLegacyDatabase(createResource) {
    const database = new DatabaseSync(filename);
    database.exec(`
      CREATE TABLE schema_migrations (
        version INTEGER PRIMARY KEY,
        applied_at TEXT NOT NULL
      );
      INSERT INTO schema_migrations(version, applied_at)
      VALUES (1, '2026-01-01T00:00:00.000Z');
    `);
    createResource(database);
    database.close();
  }
});

function createLegacyCircuits(database) {
  database.exec(`
    CREATE TABLE circuits (
      id TEXT PRIMARY KEY,
      owner_id TEXT NOT NULL,
      name TEXT NOT NULL,
      circuit_json TEXT NOT NULL,
      revision INTEGER NOT NULL CHECK (revision > 0),
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );
    CREATE INDEX circuits_owner_updated ON circuits(owner_id, updated_at DESC);
  `);
  database
    .prepare(
      'INSERT INTO circuits(id, owner_id, name, circuit_json, revision, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)',
    )
    .run(
      'legacy-id',
      'legacy-owner',
      'Legado',
      JSON.stringify(emptyCircuit),
      1,
      '2026-01-01T00:00:00.000Z',
      '2026-01-01T00:00:00.000Z',
    );
}

function createLegacyLibrary(database) {
  database.exec(`
    CREATE TABLE library_components (
      id TEXT PRIMARY KEY,
      owner_id TEXT NOT NULL,
      name TEXT NOT NULL,
      definition_json TEXT NOT NULL,
      revision INTEGER NOT NULL CHECK (revision > 0),
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );
    CREATE INDEX library_components_owner_updated
      ON library_components(owner_id, updated_at DESC);
  `);
  database
    .prepare(
      'INSERT INTO library_components(id, owner_id, name, definition_json, revision, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)',
    )
    .run(
      'legacy-id',
      'legacy-owner',
      'Legado',
      JSON.stringify(emptyDefinition),
      1,
      '2026-01-01T00:00:00.000Z',
      '2026-01-01T00:00:00.000Z',
    );
}

function readMigrationRows(database) {
  return database
    .prepare('SELECT namespace, version FROM schema_migrations ORDER BY namespace, version')
    .all();
}

function rowName(row) {
  return row.name;
}
