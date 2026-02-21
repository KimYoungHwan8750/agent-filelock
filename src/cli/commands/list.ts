import type { ApiClient } from '../api-client.js';
import { formatLockTable } from '../formatters.js';

export async function listCommand(
  opts: { owner?: string; prefix?: string; json?: boolean },
  client: ApiClient,
) {
  const result = await client.list(opts.owner, opts.prefix);

  if (opts.json) {
    console.log(JSON.stringify(result, null, 2));
  } else {
    console.log(formatLockTable(result.locks));
    console.log(`\nTotal: ${result.count} active lock(s)`);
  }
}
