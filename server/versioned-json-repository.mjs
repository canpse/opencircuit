import { randomUUID } from 'node:crypto';
import { DatabaseSync } from 'node:sqlite';

function sqlIdentifier(value) {
  if (!/^[a-z_][a-z0-9_]*$/i.test(value)) throw new Error(`Identificador SQL inválido: ${value}`);
  return value;
}

function repositoryNamespace(value) {
  if (typeof value !== 'string' || value.trim().length === 0) {
    throw new Error('Namespace de migrations inválido');
  }
  return value;
}

export class VersionedJsonRepository {
  constructor(
    filename,
    {
      table,
      jsonColumn,
      valueField,
      resultField,
      migrationNamespace,
      indexName = `${table}_owner_updated`,
    },
  ) {
    this.table = sqlIdentifier(table);
    this.jsonColumn = sqlIdentifier(jsonColumn);
    this.valueField = valueField;
    this.resultField = resultField;
    this.migrationNamespace = repositoryNamespace(migrationNamespace);
    this.indexName = sqlIdentifier(indexName);
    this.db = new DatabaseSync(filename);
    try {
      this.db.exec('PRAGMA foreign_keys = ON; PRAGMA journal_mode = WAL;');
      this.migrate();
    } catch (error) {
      try {
        this.db.close();
      } catch {
        // Preserva o erro original da migration.
      }
      throw error;
    }
  }

  migrate() {
    this.ensureMigrationLedger();
    this.applyMigration(1, () => {
      this.db.exec(`
        CREATE TABLE IF NOT EXISTS ${this.table} (
          id TEXT PRIMARY KEY,
          owner_id TEXT NOT NULL,
          name TEXT NOT NULL,
          ${this.jsonColumn} TEXT NOT NULL,
          revision INTEGER NOT NULL CHECK (revision > 0),
          created_at TEXT NOT NULL,
          updated_at TEXT NOT NULL
        );
        CREATE INDEX IF NOT EXISTS ${this.indexName}
          ON ${this.table}(owner_id, updated_at DESC);
      `);
    });
  }

  ensureMigrationLedger() {
    this.runInTransaction(() => {
      const columns = this.db.prepare('PRAGMA table_info(schema_migrations)').all();
      if (columns.length === 0) {
        this.createMigrationLedger();
        return;
      }

      const columnNames = columns.map(({ name }) => name);
      if (
        columnNames.length === 3 &&
        columnNames[0] === 'namespace' &&
        columnNames[1] === 'version' &&
        columnNames[2] === 'applied_at' &&
        columns[0].pk === 1 &&
        columns[1].pk === 2
      ) {
        return;
      }

      const legacyLedger =
        columnNames.length === 2 &&
        columnNames[0] === 'version' &&
        columnNames[1] === 'applied_at' &&
        columns[0].pk === 1;
      if (!legacyLedger) {
        throw new Error('Formato desconhecido da tabela schema_migrations');
      }

      const unknownMigration = this.db
        .prepare('SELECT version FROM schema_migrations WHERE version <> 1 LIMIT 1')
        .get();
      if (unknownMigration) {
        throw new Error(
          `Migration legada desconhecida: versão ${String(unknownMigration.version)}`,
        );
      }

      this.db.exec('ALTER TABLE schema_migrations RENAME TO schema_migrations_legacy;');
      this.createMigrationLedger();
      this.db.exec('DROP TABLE schema_migrations_legacy;');
    });
  }

  createMigrationLedger() {
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS schema_migrations (
        namespace TEXT NOT NULL,
        version INTEGER NOT NULL CHECK (version > 0),
        applied_at TEXT NOT NULL,
        PRIMARY KEY (namespace, version)
      );
    `);
  }

  applyMigration(version, migrate) {
    this.runInTransaction(() => {
      const migrated = this.db
        .prepare('SELECT 1 FROM schema_migrations WHERE namespace = ? AND version = ?')
        .get(this.migrationNamespace, version);
      if (migrated) return;

      migrate();
      this.db
        .prepare('INSERT INTO schema_migrations(namespace, version, applied_at) VALUES (?, ?, ?)')
        .run(this.migrationNamespace, version, new Date().toISOString());
    });
  }

  runInTransaction(operation) {
    this.db.exec('BEGIN IMMEDIATE;');
    try {
      const result = operation();
      this.db.exec('COMMIT;');
      return result;
    } catch (error) {
      if (this.db.isTransaction) this.db.exec('ROLLBACK;');
      throw error;
    }
  }

  list(ownerId) {
    return this.db
      .prepare(
        `SELECT id, name, revision, created_at, updated_at FROM ${this.table} WHERE owner_id = ? ORDER BY updated_at DESC`,
      )
      .all(ownerId)
      .map(mapSummary);
  }

  get(ownerId, id) {
    const row = this.db
      .prepare(`SELECT * FROM ${this.table} WHERE owner_id = ? AND id = ?`)
      .get(ownerId, id);
    return row ? this.mapResource(row) : null;
  }

  create(ownerId, name, value) {
    const id = randomUUID();
    const now = new Date().toISOString();
    this.db
      .prepare(
        `INSERT INTO ${this.table}(id, owner_id, name, ${this.jsonColumn}, revision, created_at, updated_at) VALUES (?, ?, ?, ?, 1, ?, ?)`,
      )
      .run(id, ownerId, name, JSON.stringify(value), now, now);
    return this.get(ownerId, id);
  }

  update(ownerId, id, revision, name, value) {
    const current = this.get(ownerId, id);
    if (!current) return { kind: 'not-found' };
    if (current.revision !== revision) {
      return { kind: 'conflict', [this.resultField]: current };
    }
    const updatedAt = new Date().toISOString();
    const result = this.db
      .prepare(
        `UPDATE ${this.table} SET name = ?, ${this.jsonColumn} = ?, revision = revision + 1, updated_at = ? WHERE owner_id = ? AND id = ? AND revision = ?`,
      )
      .run(name, JSON.stringify(value), updatedAt, ownerId, id, revision);
    if (result.changes === 0) {
      return { kind: 'conflict', [this.resultField]: this.get(ownerId, id) };
    }
    return { kind: 'updated', [this.resultField]: this.get(ownerId, id) };
  }

  delete(ownerId, id) {
    return (
      this.db.prepare(`DELETE FROM ${this.table} WHERE owner_id = ? AND id = ?`).run(ownerId, id)
        .changes > 0
    );
  }

  close() {
    this.db.close();
  }

  mapResource(row) {
    return {
      id: row.id,
      ownerId: row.owner_id,
      name: row.name,
      [this.valueField]: JSON.parse(row[this.jsonColumn]),
      revision: row.revision,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }
}

function mapSummary(row) {
  return {
    id: row.id,
    name: row.name,
    revision: row.revision,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}
