import type { ChangeRecord, LockRecord } from '../../shared/types.js';

export interface LockStore {
  init(): void;
  insertLock(lock: LockRecord): boolean;
  findByNormalizedPath(normalizedPath: string): LockRecord | null;
  findByOwner(owner: string): LockRecord[];
  findAll(prefix?: string): LockRecord[];
  deleteLock(normalizedPath: string, owner?: string): boolean;
  deleteByOwner(owner: string): number;
  deleteExpired(): number;
  updateHeartbeat(owner: string, newExpiresAt: string): number;
  countActive(): number;

  // Transaction
  runInTransaction<T>(fn: () => T): T;

  // Change tracking
  upsertChange(record: ChangeRecord): void;
  findChangesByPath(normalizedPath: string, excludeUuid: string): ChangeRecord[];
  findAllChanges(): ChangeRecord[];
  deleteChangesByPath(normalizedPath: string, excludeUuid?: string): number;
}
