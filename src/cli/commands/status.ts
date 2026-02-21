import { toProjectRelative } from '../../shared/path-utils.js';
import type { ApiClient } from '../api-client.js';
import { formatLockStatus } from '../formatters.js';

export async function statusCommand(
  file: string | undefined,
  opts: { json?: boolean },
  client: ApiClient,
) {
  if (!file) {
    console.error('Usage: filelock status <file>');
    process.exit(1);
  }

  const filePath = toProjectRelative(file, process.cwd());
  const result = await client.status(filePath);

  if (opts.json) {
    console.log(JSON.stringify(result, null, 2));
  } else if (result.locked && result.lock) {
    console.log(formatLockStatus(result.lock));
  } else {
    console.log(`Not locked: ${filePath}`);
  }
}
