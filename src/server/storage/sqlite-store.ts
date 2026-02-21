import Database from 'better-sqlite3';
import { mkdirSync } from 'node:fs';
import { dirname } from 'node:path';
import type { ChangeRecord, LockRecord } from '../../shared/types.js';
import type { LockStore } from './store.interface.js';

export class SqliteLockStore implements LockStore {
  private db: Database.Database;

  constructor(dbPath: string) {
    mkdirSync(dirname(dbPath), { recursive: true });
    this.db = new Database(dbPath);
    this.db.pragma('journal_mode = WAL');
    this.db.pragma('busy_timeout = 5000');
  }

  init(): void {
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS locks (
        id TEXT PRIMARY KEY,
        file_path TEXT NOT NULL,
        normalized_path TEXT NOT NULL UNIQUE,
        owner TEXT NOT NULL,
        owner_name TEXT NOT NULL,
        acquired_at TEXT NOT NULL,
        expires_at TEXT NOT NULL,
        heartbeat_at TEXT NOT NULL,
        metadata TEXT
      );
      CREATE INDEX IF NOT EXISTS idx_locks_owner ON locks(owner);
      CREATE INDEX IF NOT EXISTS idx_locks_expires_at ON locks(expires_at);

      CREATE TABLE IF NOT EXISTS change_records (
        id TEXT PRIMARY KEY,
        normalized_path TEXT NOT NULL,
        developer_uuid TEXT NOT NULL,
        developer_name TEXT NOT NULL,
        changed_at TEXT NOT NULL,
        UNIQUE(normalized_path, developer_uuid)
      );
      CREATE INDEX IF NOT EXISTS idx_changes_path ON change_records(normalized_path);
    `);
  }

  insertLock(lock: LockRecord): boolean {
    const stmt = this.db.prepare(`
      INSERT INTO locks (id, file_path, normalized_path, owner, owner_name, acquired_at, expires_at, heartbeat_at, metadata)
      VALUES (@id, @filePath, @normalizedPath, @owner, @ownerName, @acquiredAt, @expiresAt, @heartbeatAt, @metadata)
      ON CONFLICT(normalized_path) DO NOTHING
    `);
    const result = stmt.run({
      id: lock.id,
      filePath: lock.filePath,
      normalizedPath: lock.normalizedPath,
      owner: lock.owner,
      ownerName: lock.ownerName,
      acquiredAt: lock.acquiredAt,
      expiresAt: lock.expiresAt,
      heartbeatAt: lock.heartbeatAt,
      metadata: lock.metadata ? JSON.stringify(lock.metadata) : null,
    });
    return result.changes > 0;
  }

  findByNormalizedPath(normalizedPath: string): LockRecord | null {
    const row = this.db.prepare(
      'SELECT * FROM locks WHERE normalized_path = ?'
    ).get(normalizedPath) as DbRow | undefined;
    return row ? this.toRecord(row) : null;
  }

  findByOwner(owner: string): LockRecord[] {
    const rows = this.db.prepare(
      'SELECT * FROM locks WHERE owner = ?'
    ).all(owner) as DbRow[];
    return rows.map(r => this.toRecord(r));
  }

  findAll(prefix?: string): LockRecord[] {
    if (prefix) {
      const rows = this.db.prepare(
        'SELECT * FROM locks WHERE normalized_path LIKE ? ORDER BY acquired_at DESC'
      ).all(`${prefix}%`) as DbRow[];
      return rows.map(r => this.toRecord(r));
    }
    const rows = this.db.prepare(
      'SELECT * FROM locks ORDER BY acquired_at DESC'
    ).all() as DbRow[];
    return rows.map(r => this.toRecord(r));
  }

  deleteLock(normalizedPath: string, owner?: string): boolean {
    if (owner) {
      const result = this.db.prepare(
        'DELETE FROM locks WHERE normalized_path = ? AND owner = ?'
      ).run(normalizedPath, owner);
      return result.changes > 0;
    }
    const result = this.db.prepare(
      'DELETE FROM locks WHERE normalized_path = ?'
    ).run(normalizedPath);
    return result.changes > 0;
  }

  deleteByOwner(owner: string): number {
    const result = this.db.prepare(
      'DELETE FROM locks WHERE owner = ?'
    ).run(owner);
    return result.changes;
  }

  deleteExpired(): number {
    const result = this.db.prepare(
      "DELETE FROM locks WHERE expires_at < datetime('now')"
    ).run();
    return result.changes;
  }

  updateHeartbeat(owner: string, newExpiresAt: string): number {
    const result = this.db.prepare(
      "UPDATE locks SET heartbeat_at = datetime('now'), expires_at = ? WHERE owner = ?"
    ).run(newExpiresAt, owner);
    return result.changes;
  }

  countActive(): number {
    const row = this.db.prepare(
      'SELECT COUNT(*) as count FROM locks'
    ).get() as { count: number };
    return row.count;
  }

  upsertChange(record: ChangeRecord): void {
    this.db.prepare(`
      INSERT INTO change_records (id, normalized_path, developer_uuid, developer_name, changed_at)
      VALUES (@id, @normalizedPath, @developerUuid, @developerName, @changedAt)
      ON CONFLICT(normalized_path, developer_uuid)
      DO UPDATE SET changed_at = @changedAt, developer_name = @developerName
    `).run(record);
  }

  runInTransaction<T>(fn: () => T): T {
    const txn = this.db.transaction(fn);
    return txn();
  }

  findAllChanges(): ChangeRecord[] {
    const rows = this.db.prepare(
      'SELECT * FROM change_records ORDER BY changed_at DESC'
    ).all() as ChangeDbRow[];
    return rows.map(r => this.toChangeRecord(r));
  }

  findChangesByPath(normalizedPath: string, excludeUuid: string): ChangeRecord[] {
    const rows = this.db.prepare(
      'SELECT * FROM change_records WHERE normalized_path = ? AND developer_uuid != ?'
    ).all(normalizedPath, excludeUuid) as ChangeDbRow[];
    return rows.map(r => this.toChangeRecord(r));
  }

  deleteChangesByPath(normalizedPath: string, excludeUuid?: string): number {
    if (excludeUuid) {
      // Delete other UUIDs' records (ack = "I've seen their changes")
      const result = this.db.prepare(
        'DELETE FROM change_records WHERE normalized_path = ? AND developer_uuid != ?'
      ).run(normalizedPath, excludeUuid);
      return result.changes;
    }
    const result = this.db.prepare(
      'DELETE FROM change_records WHERE normalized_path = ?'
    ).run(normalizedPath);
    return result.changes;
  }

  private toRecord(row: DbRow): LockRecord {
    return {
      id: row.id,
      filePath: row.file_path,
      normalizedPath: row.normalized_path,
      owner: row.owner,
      ownerName: row.owner_name,
      acquiredAt: row.acquired_at,
      expiresAt: row.expires_at,
      heartbeatAt: row.heartbeat_at,
      metadata: row.metadata ? JSON.parse(row.metadata) : undefined,
    };
  }

  private toChangeRecord(row: ChangeDbRow): ChangeRecord {
    return {
      id: row.id,
      normalizedPath: row.normalized_path,
      developerUuid: row.developer_uuid,
      developerName: row.developer_name,
      changedAt: row.changed_at,
    };
  }
}

interface ChangeDbRow {
  id: string;
  normalized_path: string;
  developer_uuid: string;
  developer_name: string;
  changed_at: string;
}

interface DbRow {
  id: string;
  file_path: string;
  normalized_path: string;
  owner: string;
  owner_name: string;
  acquired_at: string;
  expires_at: string;
  heartbeat_at: string;
  metadata: string | null;
}
