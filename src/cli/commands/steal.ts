import { userInfo } from 'node:os';
import { toProjectRelative } from '../../shared/path-utils.js';
import type { ApiClient } from '../api-client.js';

export async function stealCommand(
  file: string | undefined,
  opts: { json?: boolean },
  client: ApiClient,
) {
  if (!file) {
    console.error('Usage: filelock steal <file>');
    process.exit(1);
  }

  const filePath = toProjectRelative(file, process.cwd());
  const owner = `human:${userInfo().username}`;
  const ownerName = userInfo().username;

  const result = await client.acquire({
    filePath,
    owner,
    ownerName,
    force: true,
  });

  if (opts.json) {
    console.log(JSON.stringify(result, null, 2));
  } else if (result.ok) {
    console.log(`Force-acquired lock: ${filePath}`);
  } else {
    console.error(`Failed to steal lock: ${result.message}`);
  }
}
