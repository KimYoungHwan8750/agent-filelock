import type { ApiClient } from '../api-client.js';

export async function cleanupCommand(
  opts: { json?: boolean },
  client: ApiClient,
) {
  const result = await client.cleanup();

  if (opts.json) {
    console.log(JSON.stringify(result, null, 2));
  } else {
    console.log(`Cleaned up ${result.cleanedCount} expired lock(s).`);
  }
}
