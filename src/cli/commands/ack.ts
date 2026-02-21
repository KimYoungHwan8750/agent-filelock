import { toProjectRelative } from '../../shared/path-utils.js';
import type { ApiClient } from '../api-client.js';

export async function ackCommand(
  files: string[],
  opts: { uuid?: string; json?: boolean },
  client: ApiClient,
) {
  const uuid = opts.uuid || process.env.FILELOCK_UUID;
  if (!uuid) {
    console.error('Error: FILELOCK_UUID environment variable or --uuid option is required.');
    process.exit(1);
  }

  for (const file of files) {
    const filePath = toProjectRelative(file, process.cwd());

    // Show what changes exist before acknowledging
    const check = await client.checkChanges(filePath, uuid);
    if (!check.hasChanges) {
      if (opts.json) {
        console.log(JSON.stringify({ ok: true, filePath, message: 'No pending changes' }));
      } else {
        console.log(`No pending changes for: ${filePath}`);
      }
      continue;
    }

    const result = await client.acknowledge(filePath, uuid);

    if (opts.json) {
      console.log(JSON.stringify(result));
    } else {
      const changers = check.changes.map(c => c.developerName).join(', ');
      console.log(`Acknowledged changes by [${changers}] on: ${filePath}`);
    }
  }
}
