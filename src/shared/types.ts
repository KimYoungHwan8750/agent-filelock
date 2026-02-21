export interface LockRecord {
  id: string;
  filePath: string;
  normalizedPath: string;
  owner: string;
  ownerName: string;
  acquiredAt: string;
  expiresAt: string;
  heartbeatAt: string;
  metadata?: Record<string, unknown>;
}

export interface AcquireLockRequest {
  filePath: string;
  owner: string;
  ownerName: string;
  ttlMinutes?: number;
  force?: boolean;
  metadata?: Record<string, unknown>;
}

export interface AcquireLockResponse {
  ok: boolean;
  lock?: LockRecord;
  error?: 'FILE_LOCKED' | 'INVALID_PATH' | 'SERVER_ERROR';
  message?: string;
}

export interface ReleaseLockRequest {
  filePath: string;
  owner: string;
  force?: boolean;
}

export interface ReleaseAllRequest {
  owner: string;
}

export interface ReleaseResponse {
  ok: boolean;
  released?: boolean;
  releasedCount?: number;
}

export interface HeartbeatRequest {
  owner: string;
}

export interface HeartbeatResponse {
  ok: boolean;
  refreshedCount: number;
}

export interface LockStatusResponse {
  locked: boolean;
  lock?: LockRecord;
}

export interface LockListResponse {
  locks: LockRecord[];
  count: number;
}

export interface HealthResponse {
  status: 'ok' | 'error';
  uptime: number;
  activeLocks: number;
  version: string;
}

// --- Change tracking ---

export interface ChangeRecord {
  id: string;
  normalizedPath: string;
  developerUuid: string;
  developerName: string;
  changedAt: string;
}

export interface RecordChangeRequest {
  filePath: string;
  developerUuid: string;
  developerName: string;
}

export interface CheckChangesResponse {
  hasChanges: boolean;
  changes: ChangeRecord[];
}

export interface AcknowledgeRequest {
  filePath: string;
  developerUuid: string;
}

// --- Batch operations ---

export interface AcquireBatchRequest {
  filePaths: string[];
  owner: string;
  ownerName: string;
  ttlMinutes?: number;
  metadata?: Record<string, unknown>;
}

export interface AcquireBatchResponse {
  ok: boolean;
  locks?: LockRecord[];
  error?: 'PARTIAL_LOCK_FAILURE' | 'SERVER_ERROR';
  message?: string;
  conflicts?: Array<{ filePath: string; lock: LockRecord }>;
}

export interface ReleaseBatchRequest {
  filePaths: string[];
  owner: string;
}

export interface ReleaseBatchResponse {
  ok: boolean;
  releasedCount: number;
  failed?: string[];
}

export type OwnerType = 'claude' | 'human';

export function parseOwnerType(owner: string): OwnerType {
  return owner.startsWith('claude:') ? 'claude' : 'human';
}

export function parseOwnerId(owner: string): string {
  return owner.split(':').slice(1).join(':');
}
