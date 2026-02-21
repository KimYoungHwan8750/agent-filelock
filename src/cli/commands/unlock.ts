import { userInfo } from 'node:os';
import { toProjectRelative } from '../../shared/path-utils.js';
import type { ApiClient } from '../api-client.js';

export async function unlockCommand(
  files: string[],
  opts: { force?: boolean; json?: boolean },
  client: ApiClient,
) {
  const owner = `human:${userInfo().username}`;

  for (const file of files) {
    const filePath = toProjectRelative(file, process.cwd());
    const result = await client.release(filePath, owner, opts.force);

    if (opts.json) {
      console.log(JSON.stringify(result, null, 2));
    } else if (result.released) {
      console.log(`Unlocked: ${filePath}`);
    } else {
      console.log(`No lock found for: ${filePath}`);
    }
  }
}
