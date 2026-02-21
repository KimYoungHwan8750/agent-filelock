import { DEFAULT_SERVER_URL } from '../shared/constants.js';
import type {
  AcquireBatchRequest,
  AcquireBatchResponse,
  AcquireLockRequest,
  AcquireLockResponse,
  CheckChangesResponse,
  HeartbeatResponse,
  HealthResponse,
  LockListResponse,
  LockStatusResponse,
  ReleaseBatchResponse,
  ReleaseResponse,
} from '../shared/types.js';

export class ApiClient {
  private baseUrl: string;

  constructor(serverUrl?: string) {
    this.baseUrl = (serverUrl || DEFAULT_SERVER_URL) + '/api/v1';
  }

  async acquire(req: AcquireLockRequest): Promise<AcquireLockResponse> {
    return this.post('/locks/acquire', req);
  }

  async acquireBatch(req: AcquireBatchRequest): Promise<AcquireBatchResponse> {
    return this.post('/locks/acquire-batch', req);
  }

  async releaseBatch(filePaths: string[], owner: string): Promise<ReleaseBatchResponse> {
    return this.post('/locks/release-batch', { filePaths, owner });
  }

  async release(filePath: string, owner: string, force?: boolean): Promise<ReleaseResponse> {
    return this.post('/locks/release', { filePath, owner, force });
  }

  async releaseAll(owner: string): Promise<ReleaseResponse> {
    return this.post('/locks/release-all', { owner });
  }

  async heartbeat(owner: string): Promise<HeartbeatResponse> {
    return this.post('/locks/heartbeat', { owner });
  }

  async cleanup(): Promise<{ ok: boolean; cleanedCount: number }> {
    return this.post('/locks/cleanup', {});
  }

  async status(filePath: string): Promise<LockStatusResponse> {
    const params = new URLSearchParams({ filePath });
    return this.get(`/locks/status?${params}`);
  }

  async list(owner?: string, prefix?: string): Promise<LockListResponse> {
    const params = new URLSearchParams();
    if (owner) params.set('owner', owner);
    if (prefix) params.set('prefix', prefix);
    const qs = params.toString();
    return this.get(`/locks${qs ? '?' + qs : ''}`);
  }

  async health(): Promise<HealthResponse> {
    return this.get('/health');
  }

  async checkChanges(filePath: string, developerUuid: string): Promise<CheckChangesResponse> {
    const params = new URLSearchParams({ filePath, developerUuid });
    return this.get(`/changes/check?${params}`);
  }

  async acknowledge(filePath: string, developerUuid: string): Promise<{ ok: boolean; clearedCount: number }> {
    return this.post('/changes/acknowledge', { filePath, developerUuid });
  }

  private async post<T>(path: string, body: unknown): Promise<T> {
    const res = await fetch(`${this.baseUrl}${path}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(10000),
    });
    return res.json() as Promise<T>;
  }

  private async get<T>(path: string): Promise<T> {
    const res = await fetch(`${this.baseUrl}${path}`, {
      signal: AbortSignal.timeout(10000),
    });
    return res.json() as Promise<T>;
  }
}
