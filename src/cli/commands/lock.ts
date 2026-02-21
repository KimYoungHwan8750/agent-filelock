import { userInfo } from 'node:os';
import { toProjectRelative } from '../../shared/path-utils.js';
import type { ApiClient } from '../api-client.js';

export async function lockCommand(
  files: string[],
  opts: { ttl?: string; json?: boolean },
  client: ApiClient,
) {
  const owner = `human:${userInfo().username}`;
  const ownerName = userInfo().username;

  for (const file of files) {
    const filePath = toProjectRelative(file, process.cwd());
    const result = await client.acquire({
      filePath,
      owner,
      ownerName,
      ttlMinutes: opts.ttl ? Number(opts.ttl) : undefined,
    });

    if (opts.json) {
      console.log(JSON.stringify(result, null, 2));
    } else if (result.ok) {
      console.log(`Locked: ${filePath}`);
    } else {
      console.error(`Failed to lock ${filePath}: ${result.message}`);
    }
  }
}
