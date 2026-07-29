import { randomUUID } from 'node:crypto';
import { DatabaseSync } from 'node:sqlite';

/**
 * @typedef {import('./contracts.mjs').RepositoryOptions} RepositoryOptions
 * @typedef {import('./contracts.mjs').RepositoryUpdateResult<import('./contracts.mjs').StoredResource>} RepositoryUpdateResult
 * @typedef {import('./contracts.mjs').ResourceSummary} ResourceSummary
 * @typedef {import('./contracts.mjs').StoredResource} StoredResource
 */

/** @param {string} value */
function sqlIdentifier(value) {
  if (!/^[a-z_][a-z0-9_]*$/i.test(value)) throw new Error(`Identificador SQL inválido: ${value}`);
  return value;
}

/** @param {string} value */
function repositoryNamespace(value) {
  if (typeof value !== 'string' || value.trim().length === 0) {
    throw new Error('Namespace de migrations inválido');
  }
  return value;
}

/** @param {Record<string, import('node:sqlite').SQLInputValue>} row @param {string} column */
function requiredText(row, column) {
  const value = row[column];
  if (typeof value !== 'string') throw new Error(`Coluna textual inválida: ${column}`);
  return value;
}

/** @param {Record<string, import('node:sqlite').SQLInputValue>} row @param {string} column */
function requiredNumber(row, column) {
  const value = row[column];
  if (typeof value !== 'number') throw new Error(`Coluna numérica inválida: ${column}`);
  return value;
}

/**
 * @template {unknown} Value
 * @template {StoredResource} Resource
 */
export class VersionedJsonRepository {
  /**
   * @param {string} filename
   * @param {RepositoryOptions} options
   */
  constructor(
    filename,
    { table, jsonColumn, valueField, migrationNamespace, indexName = `${table}_owner_updated` },
  ) {
    this.table = sqlIdentifier(table);
    this.jsonColumn = sqlIdentifier(jsonColumn);
    this.valueField = valueField;
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

  /** @param {number} version @param {() => void} migrate */
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

  /**
   * @template Result
   * @param {() => Result} operation
   * @returns {Result}
   */
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

  /** @param {string} ownerId @returns {ResourceSummary[]} */
  list(ownerId) {
    return this.db
      .prepare(
        `SELECT id, name, revision, created_at, updated_at FROM ${this.table} WHERE owner_id = ? ORDER BY updated_at DESC`,
      )
      .all(ownerId)
      .map(mapSummary);
  }

  /** @param {string} ownerId @param {string} id @returns {Resource | null} */
  get(ownerId, id) {
    const row = this.db
      .prepare(`SELECT * FROM ${this.table} WHERE owner_id = ? AND id = ?`)
      .get(ownerId, id);
    return row ? this.mapResource(row) : null;
  }

  /**
   * @param {string} ownerId
   * @param {string} name
   * @param {Value} value
   * @returns {Resource}
   */
  create(ownerId, name, value) {
    const id = randomUUID();
    const now = new Date().toISOString();
    this.db
      .prepare(
        `INSERT INTO ${this.table}(id, owner_id, name, ${this.jsonColumn}, revision, created_at, updated_at) VALUES (?, ?, ?, ?, 1, ?, ?)`,
      )
      .run(id, ownerId, name, JSON.stringify(value), now, now);
    const created = this.get(ownerId, id);
    if (!created) throw new Error('Recurso recém-criado não foi encontrado.');
    return created;
  }

  /**
   * @param {string} ownerId
   * @param {string} id
   * @param {number} revision
   * @param {string} name
   * @param {Value} value
   * @returns {import('./contracts.mjs').RepositoryUpdateResult<Resource>}
   */
  update(ownerId, id, revision, name, value) {
    const current = this.get(ownerId, id);
    if (!current) return { kind: 'not-found' };
    if (current.revision !== revision) {
      return { kind: 'conflict', resource: current };
    }
    const updatedAt = new Date().toISOString();
    const result = this.db
      .prepare(
        `UPDATE ${this.table} SET name = ?, ${this.jsonColumn} = ?, revision = revision + 1, updated_at = ? WHERE owner_id = ? AND id = ? AND revision = ?`,
      )
      .run(name, JSON.stringify(value), updatedAt, ownerId, id, revision);
    if (result.changes === 0) {
      return { kind: 'conflict', resource: this.get(ownerId, id) };
    }
    const updated = this.get(ownerId, id);
    if (!updated) return { kind: 'not-found' };
    return { kind: 'updated', resource: updated };
  }

  /** @param {string} ownerId @param {string} id */
  delete(ownerId, id) {
    return (
      this.db.prepare(`DELETE FROM ${this.table} WHERE owner_id = ? AND id = ?`).run(ownerId, id)
        .changes > 0
    );
  }

  close() {
    this.db.close();
  }

  /** @param {Record<string, import('node:sqlite').SQLInputValue>} row @returns {Resource} */
  mapResource(row) {
    return /** @type {Resource} */ ({
      id: requiredText(row, 'id'),
      ownerId: requiredText(row, 'owner_id'),
      name: requiredText(row, 'name'),
      [this.valueField]: JSON.parse(requiredText(row, this.jsonColumn)),
      revision: requiredNumber(row, 'revision'),
      createdAt: requiredText(row, 'created_at'),
      updatedAt: requiredText(row, 'updated_at'),
    });
  }
}

/** @param {Record<string, import('node:sqlite').SQLInputValue>} row @returns {ResourceSummary} */
function mapSummary(row) {
  return {
    id: requiredText(row, 'id'),
    name: requiredText(row, 'name'),
    revision: requiredNumber(row, 'revision'),
    createdAt: requiredText(row, 'created_at'),
    updatedAt: requiredText(row, 'updated_at'),
  };
}
