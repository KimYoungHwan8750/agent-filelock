import type { FastifyInstance } from 'fastify';
import { SERVER_VERSION } from '../../shared/constants.js';
import type { HealthResponse } from '../../shared/types.js';
import type { LockService } from '../services/lock-service.js';

export async function healthRoutes(
  app: FastifyInstance,
  opts: { lockService: LockService; startTime: number }
) {
  const { lockService, startTime } = opts;

  app.get('/health', async (): Promise<HealthResponse> => {
    return {
      status: 'ok',
      uptime: Math.floor((Date.now() - startTime) / 1000),
      activeLocks: lockService.countActive(),
      version: SERVER_VERSION,
    };
  });
}
