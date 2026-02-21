import type { FastifyInstance } from 'fastify';
import type {
  AcquireBatchRequest,
  AcquireLockRequest,
  AcknowledgeRequest,
  HeartbeatRequest,
  RecordChangeRequest,
  ReleaseAllRequest,
  ReleaseBatchRequest,
  ReleaseLockRequest,
} from '../../shared/types.js';
import type { LockService } from '../services/lock-service.js';
import {
  acknowledgeSchema,
  acquireBatchSchema,
  acquireLockSchema,
  checkChangesSchema,
  heartbeatSchema,
  listQuerySchema,
  recordChangeSchema,
  releaseAllSchema,
  releaseBatchSchema,
  releaseLockSchema,
  statusQuerySchema,
} from '../schemas/lock.schema.js';

export async function lockRoutes(
  app: FastifyInstance,
  opts: { lockService: LockService }
) {
  const { lockService } = opts;

  app.post<{ Body: AcquireLockRequest }>(
    '/locks/acquire',
    { schema: acquireLockSchema },
    async (req, reply) => {
      const result = lockService.acquire(req.body);
      if (!result.ok) {
        return reply.status(409).send(result);
      }
      return result;
    }
  );

  app.post<{ Body: AcquireBatchRequest }>(
    '/locks/acquire-batch',
    { schema: acquireBatchSchema },
    async (req, reply) => {
      const result = lockService.acquireBatch(req.body);
      if (!result.ok) {
        return reply.status(409).send(result);
      }
      return result;
    }
  );

  app.post<{ Body: ReleaseBatchRequest }>(
    '/locks/release-batch',
    { schema: releaseBatchSchema },
    async (req) => {
      return lockService.releaseBatch(req.body.filePaths, req.body.owner);
    }
  );

  app.post<{ Body: ReleaseLockRequest }>(
    '/locks/release',
    { schema: releaseLockSchema },
    async (req) => {
      return lockService.release(req.body.filePath, req.body.owner, req.body.force);
    }
  );

  app.post<{ Body: ReleaseAllRequest }>(
    '/locks/release-all',
    { schema: releaseAllSchema },
    async (req) => {
      return lockService.releaseAll(req.body.owner);
    }
  );

  app.post<{ Body: HeartbeatRequest & { ttlMinutes?: number } }>(
    '/locks/heartbeat',
    { schema: heartbeatSchema },
    async (req) => {
      return lockService.heartbeat(req.body.owner, req.body.ttlMinutes);
    }
  );

  app.post('/locks/cleanup', async () => {
    return lockService.cleanup();
  });

  app.get<{ Querystring: { filePath: string } }>(
    '/locks/status',
    { schema: statusQuerySchema },
    async (req) => {
      return lockService.status(req.query.filePath);
    }
  );

  app.get<{ Querystring: { owner?: string; prefix?: string } }>(
    '/locks',
    { schema: listQuerySchema },
    async (req) => {
      return lockService.list(req.query.owner, req.query.prefix);
    }
  );

  // --- Change tracking ---

  app.get('/changes', async () => {
    const changes = lockService.listAllChanges();
    return { changes, count: changes.length };
  });

  app.post<{ Body: RecordChangeRequest }>(
    '/changes/record',
    { schema: recordChangeSchema },
    async (req) => {
      lockService.recordChange(req.body);
      return { ok: true };
    }
  );

  app.get<{ Querystring: { filePath: string; developerUuid: string } }>(
    '/changes/check',
    { schema: checkChangesSchema },
    async (req) => {
      return lockService.checkChanges(req.query.filePath, req.query.developerUuid);
    }
  );

  app.post<{ Body: AcknowledgeRequest }>(
    '/changes/acknowledge',
    { schema: acknowledgeSchema },
    async (req) => {
      return lockService.acknowledgeChanges(req.body.filePath, req.body.developerUuid);
    }
  );
}
