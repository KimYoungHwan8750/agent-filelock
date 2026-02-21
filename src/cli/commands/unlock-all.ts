import { userInfo } from 'node:os';
import type { ApiClient } from '../api-client.js';

export async function unlockAllCommand(
  opts: { json?: boolean },
  client: ApiClient,
) {
  const owner = `human:${userInfo().username}`;
  const result = await client.releaseAll(owner);

  if (opts.json) {
    console.log(JSON.stringify(result, null, 2));
  } else {
    console.log(`Released ${result.releasedCount ?? 0} lock(s).`);
  }
}
