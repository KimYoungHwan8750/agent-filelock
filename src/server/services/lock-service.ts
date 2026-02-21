import { randomUUID } from 'node:crypto';
import {
  DEFAULT_AGENT_TTL_MINUTES,
  DEFAULT_HUMAN_TTL_MINUTES,
  DEFAULT_STOLEN_TTL_MINUTES,
} from '../../shared/constants.js';
import { normalizePath } from '../../shared/path-utils.js';
import type {
  AcquireBatchRequest,
  AcquireBatchResponse,
  AcquireLockRequest,
  AcquireLockResponse,
  ChangeRecord,
  CheckChangesResponse,
  HeartbeatResponse,
  LockListResponse,
  LockRecord,
  LockStatusResponse,
  RecordChangeRequest,
  ReleaseBatchResponse,
  ReleaseResponse,
} from '../../shared/types.js';
import { parseOwnerType } from '../../shared/types.js';
import type { LockStore } from '../storage/store.interface.js';

export class LockService {
  constructor(private store: LockStore) {}

  acquire(req: AcquireLockRequest): AcquireLockResponse {
    const normalizedPath = normalizePath(req.filePath);

    const existing = this.store.findByNormalizedPath(normalizedPath);

    if (existing) {
      // Idempotent: same owner already holds the lock
      if (existing.owner === req.owner) {
        return { ok: true, lock: existing };
      }

      // Force steal
      if (req.force) {
        this.store.deleteLock(normalizedPath);
        // Fall through to create new lock
      } else {
        return {
          ok: false,
          error: 'FILE_LOCKED',
          message: `File is locked by ${existing.ownerName} (${existing.owner}) since ${existing.acquiredAt}`,
          lock: existing,
        };
      }
    }

    const ttl = req.force
      ? DEFAULT_STOLEN_TTL_MINUTES
      : req.ttlMinutes ?? this.getDefaultTtl(req.owner);

    const now = new Date().toISOString();
    const expiresAt = new Date(Date.now() + ttl * 60_000).toISOString();

    const lock: LockRecord = {
      id: randomUUID(),
      filePath: req.filePath,
      normalizedPath,
      owner: req.owner,
      ownerName: req.ownerName,
      acquiredAt: now,
      expiresAt,
      heartbeatAt: now,
      metadata: req.metadata,
    };

    const inserted = this.store.insertLock(lock);

    if (!inserted) {
      // Race condition: another request inserted between our check and insert
      const current = this.store.findByNormalizedPath(normalizedPath);
      if (current && current.owner === req.owner) {
        return { ok: true, lock: current };
      }
      return {
        ok: false,
        error: 'FILE_LOCKED',
        message: current
          ? `File is locked by ${current.ownerName} (${current.owner}) since ${current.acquiredAt}`
          : 'File is locked by another owner',
        lock: current ?? undefined,
      };
    }

    return { ok: true, lock };
  }

  acquireBatch(req: AcquireBatchRequest): AcquireBatchResponse {
    const normalizedPaths = req.filePaths.map(fp => ({
      original: fp,
      normalized: normalizePath(fp),
    }));

    return this.store.runInTransaction(() => {
      const conflicts: Array<{ filePath: string; lock: LockRecord }> = [];
      const alreadyOwned: LockRecord[] = [];
      const toInsert: Array<{ original: string; normalized: string }> = [];

      for (const { original, normalized } of normalizedPaths) {
        const existing = this.store.findByNormalizedPath(normalized);
        if (existing) {
          if (existing.owner === req.owner) {
            alreadyOwned.push(existing);
          } else {
            conflicts.push({ filePath: original, lock: existing });
          }
        } else {
          toInsert.push({ original, normalized });
        }
      }

      if (conflicts.length > 0) {
        return {
          ok: false as const,
          error: 'PARTIAL_LOCK_FAILURE' as const,
          message: `Cannot acquire batch: ${conflicts.length} file(s) locked by other owners`,
          conflicts,
        };
      }

      const ttl = req.ttlMinutes ?? this.getDefaultTtl(req.owner);
      const now = new Date().toISOString();
      const expiresAt = new Date(Date.now() + ttl * 60_000).toISOString();
      const newLocks: LockRecord[] = [];

      for (const { original, normalized } of toInsert) {
        const lock: LockRecord = {
          id: randomUUID(),
          filePath: original,
          normalizedPath: normalized,
          owner: req.owner,
          ownerName: req.ownerName,
          acquiredAt: now,
          expiresAt,
          heartbeatAt: now,
          metadata: req.metadata,
        };
        this.store.insertLock(lock);
        newLocks.push(lock);
      }

      return { ok: true as const, locks: [...alreadyOwned, ...newLocks] };
    });
  }

  releaseBatch(filePaths: string[], owner: string): ReleaseBatchResponse {
    const failed: string[] = [];
    let releasedCount = 0;

    for (const fp of filePaths) {
      const normalized = normalizePath(fp);
      const deleted = this.store.deleteLock(normalized, owner);
      if (deleted) {
        releasedCount++;
      } else {
        failed.push(fp);
      }
    }

    return {
      ok: true,
      releasedCount,
      failed: failed.length > 0 ? failed : undefined,
    };
  }

  release(filePath: string, owner: string, force?: boolean): ReleaseResponse {
    const normalizedPath = normalizePath(filePath);
    const deleted = force
      ? this.store.deleteLock(normalizedPath)
      : this.store.deleteLock(normalizedPath, owner);
    return { ok: true, released: deleted };
  }

  releaseAll(owner: string): ReleaseResponse {
    const count = this.store.deleteByOwner(owner);
    return { ok: true, releasedCount: count };
  }

  heartbeat(owner: string, ttlMinutes?: number): HeartbeatResponse {
    const ttl = ttlMinutes ?? this.getDefaultTtl(owner);
    const newExpiresAt = new Date(Date.now() + ttl * 60_000).toISOString();
    const count = this.store.updateHeartbeat(owner, newExpiresAt);
    return { ok: true, refreshedCount: count };
  }

  status(filePath: string): LockStatusResponse {
    const normalizedPath = normalizePath(filePath);
    const lock = this.store.findByNormalizedPath(normalizedPath);
    return { locked: !!lock, lock: lock ?? undefined };
  }

  list(owner?: string, prefix?: string): LockListResponse {
    let locks: LockRecord[];
    if (owner) {
      locks = this.store.findByOwner(owner);
      if (prefix) {
        const norm = normalizePath(prefix);
        locks = locks.filter(l => l.normalizedPath.startsWith(norm));
      }
    } else {
      locks = this.store.findAll(prefix ? normalizePath(prefix) : undefined);
    }
    return { locks, count: locks.length };
  }

  cleanup(): { ok: boolean; cleanedCount: number } {
    const count = this.store.deleteExpired();
    return { ok: true, cleanedCount: count };
  }

  countActive(): number {
    return this.store.countActive();
  }

  recordChange(req: RecordChangeRequest): void {
    const normalizedPath = normalizePath(req.filePath);
    this.store.upsertChange({
      id: randomUUID(),
      normalizedPath,
      developerUuid: req.developerUuid,
      developerName: req.developerName,
      changedAt: new Date().toISOString(),
    });
  }

  listAllChanges(): ChangeRecord[] {
    return this.store.findAllChanges();
  }

  checkChanges(filePath: string, developerUuid: string): CheckChangesResponse {
    const normalizedPath = normalizePath(filePath);
    const changes = this.store.findChangesByPath(normalizedPath, developerUuid);
    return { hasChanges: changes.length > 0, changes };
  }

  acknowledgeChanges(filePath: string, developerUuid: string): { ok: boolean; clearedCount: number } {
    const normalizedPath = normalizePath(filePath);
    const count = this.store.deleteChangesByPath(normalizedPath, developerUuid);
    return { ok: true, clearedCount: count };
  }

  private getDefaultTtl(owner: string): number {
    return parseOwnerType(owner) === 'claude'
      ? DEFAULT_AGENT_TTL_MINUTES
      : DEFAULT_HUMAN_TTL_MINUTES;
  }
}
