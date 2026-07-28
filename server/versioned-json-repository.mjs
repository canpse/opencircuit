import { randomUUID } from 'node:crypto';
import { DatabaseSync } from 'node:sqlite';

function sqlIdentifier(value) {
  if (!/^[a-z_][a-z0-9_]*$/i.test(value)) throw new Error(`Identificador SQL inválido: ${value}`);
  return value;
}

export class VersionedJsonRepository {
  constructor(
    filename,
    { table, jsonColumn, valueField, resultField, indexName = `${table}_owner_updated` },
  ) {
    this.table = sqlIdentifier(table);
    this.jsonColumn = sqlIdentifier(jsonColumn);
    this.valueField = valueField;
    this.resultField = resultField;
    this.indexName = sqlIdentifier(indexName);
    this.db = new DatabaseSync(filename);
    this.db.exec('PRAGMA foreign_keys = ON; PRAGMA journal_mode = WAL;');
    this.migrate();
  }

  migrate() {
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS schema_migrations (
        version INTEGER PRIMARY KEY,
        applied_at TEXT NOT NULL
      );
    `);
    const migrated = this.db.prepare('SELECT 1 FROM schema_migrations WHERE version = 1').get();
    if (migrated) return;
    this.db.exec(`
      CREATE TABLE ${this.table} (
        id TEXT PRIMARY KEY,
        owner_id TEXT NOT NULL,
        name TEXT NOT NULL,
        ${this.jsonColumn} TEXT NOT NULL,
        revision INTEGER NOT NULL CHECK (revision > 0),
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );
      CREATE INDEX ${this.indexName} ON ${this.table}(owner_id, updated_at DESC);
    `);
    this.db
      .prepare('INSERT INTO schema_migrations(version, applied_at) VALUES (?, ?)')
      .run(1, new Date().toISOString());
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
