export async function serverCommand(opts: { port?: string; dbPath?: string }) {
  if (opts.port) process.env.PORT = opts.port;
  if (opts.dbPath) process.env.DB_PATH = opts.dbPath;

  await import('../../server/index.js');
}
