import { DatabaseSync } from 'node:sqlite';
import { randomUUID } from 'node:crypto';

export class LibraryRepository {
  constructor(filename) {
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
    if (!migrated) {
      this.db.exec(`
        CREATE TABLE library_components (
          id TEXT PRIMARY KEY,
          owner_id TEXT NOT NULL,
          name TEXT NOT NULL,
          definition_json TEXT NOT NULL,
          revision INTEGER NOT NULL CHECK (revision > 0),
          created_at TEXT NOT NULL,
          updated_at TEXT NOT NULL
        );
        CREATE INDEX library_components_owner_updated ON library_components(owner_id, updated_at DESC);
      `);
      this.db
        .prepare('INSERT INTO schema_migrations(version, applied_at) VALUES (?, ?)')
        .run(1, new Date().toISOString());
    }
  }

  list(ownerId) {
    return this.db
      .prepare(
        'SELECT id, name, revision, created_at, updated_at FROM library_components WHERE owner_id = ? ORDER BY updated_at DESC',
      )
      .all(ownerId)
      .map(mapSummary);
  }

  get(ownerId, id) {
    const row = this.db
      .prepare('SELECT * FROM library_components WHERE owner_id = ? AND id = ?')
      .get(ownerId, id);
    return row ? mapEntry(row) : null;
  }

  create(ownerId, name, definition) {
    const id = randomUUID();
    const now = new Date().toISOString();
    this.db
      .prepare(
        'INSERT INTO library_components(id, owner_id, name, definition_json, revision, created_at, updated_at) VALUES (?, ?, ?, ?, 1, ?, ?)',
      )
      .run(id, ownerId, name, JSON.stringify(definition), now, now);
    return this.get(ownerId, id);
  }

  update(ownerId, id, revision, name, definition) {
    const current = this.get(ownerId, id);
    if (!current) return { kind: 'not-found' };
    if (current.revision !== revision) return { kind: 'conflict', entry: current };
    const updatedAt = new Date().toISOString();
    const result = this.db
      .prepare(
        'UPDATE library_components SET name = ?, definition_json = ?, revision = revision + 1, updated_at = ? WHERE owner_id = ? AND id = ? AND revision = ?',
      )
      .run(name, JSON.stringify(definition), updatedAt, ownerId, id, revision);
    if (result.changes === 0) return { kind: 'conflict', entry: this.get(ownerId, id) };
    return { kind: 'updated', entry: this.get(ownerId, id) };
  }

  delete(ownerId, id) {
    return (
      this.db
        .prepare('DELETE FROM library_components WHERE owner_id = ? AND id = ?')
        .run(ownerId, id).changes > 0
    );
  }

  close() {
    this.db.close();
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

function mapEntry(row) {
  return {
    id: row.id,
    ownerId: row.owner_id,
    name: row.name,
    definition: JSON.parse(row.definition_json),
    revision: row.revision,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}
