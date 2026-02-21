import Fastify from 'fastify';
import { API_PREFIX, CLEANUP_INTERVAL_MS } from '../shared/constants.js';
import { loadConfig } from './config.js';
import { dashboardRoutes } from './routes/dashboard.js';
import { healthRoutes } from './routes/health.js';
import { lockRoutes } from './routes/locks.js';
import { LockService } from './services/lock-service.js';
import { SqliteLockStore } from './storage/sqlite-store.js';

const config = loadConfig();
const startTime = Date.now();

const store = new SqliteLockStore(config.dbPath);
store.init();

const lockService = new LockService(store);

const app = Fastify({ logger: true });

await app.register(dashboardRoutes);
await app.register(lockRoutes, { prefix: API_PREFIX, lockService });
await app.register(healthRoutes, { prefix: API_PREFIX, lockService, startTime });

// Periodic cleanup of expired locks
const cleanupTimer = setInterval(() => {
  const result = lockService.cleanup();
  if (result.cleanedCount > 0) {
    app.log.info(`Cleaned up ${result.cleanedCount} expired lock(s)`);
  }
}, CLEANUP_INTERVAL_MS);

// Graceful shutdown
const shutdown = async () => {
  clearInterval(cleanupTimer);
  await app.close();
  process.exit(0);
};

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);

try {
  await app.listen({ port: config.port, host: config.host });
  app.log.info(`File lock server running on http://${config.host}:${config.port}`);
} catch (err) {
  app.log.error(err);
  process.exit(1);
}
