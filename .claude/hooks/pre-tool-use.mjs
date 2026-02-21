#!/usr/bin/env node

import { hostname } from 'node:os';
import { relative, resolve } from 'node:path';
import { loadEnv, readStdin } from './load-env.mjs';

loadEnv();

const LOCK_SERVER = process.env.LOCK_SERVER_URL || 'http://localhost:8079';
const DEV_UUID = process.env.FILELOCK_UUID || '';

function deny(reason) {
  console.log(JSON.stringify({
    hookSpecificOutput: {
      hookEventName: 'PreToolUse',
      permissionDecision: 'deny',
      permissionDecisionReason: reason,
    },
  }));
}

async function main() {
  let input;
  try {
    input = JSON.parse(await readStdin());
  } catch {
    return;
  }

  const { session_id, tool_input, cwd } = input;
  const rawPath = tool_input?.file_path;
  if (!rawPath) return;

  const projectRoot = cwd || process.cwd();
  const absPath = resolve(projectRoot, rawPath);
  const filePath = relative(projectRoot, absPath).replace(/\\/g, '/');

  try {
    // Step 1: Acquire lock
    const lockRes = await fetch(`${LOCK_SERVER}/api/v1/locks/acquire`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        filePath,
        owner: `claude:${session_id}`,
        ownerName: `Claude Agent (${hostname()})`,
        metadata: DEV_UUID ? { developerUuid: DEV_UUID } : undefined,
      }),
      signal: AbortSignal.timeout(5000),
    });

    const lockData = await lockRes.json();

    if (!lockData.ok) {
      deny(
        `Cannot edit ${rawPath}: file is locked by ${lockData.lock?.ownerName || 'unknown'} ` +
        `(${lockData.lock?.owner || 'unknown'}) since ${lockData.lock?.acquiredAt || 'unknown'}. ` +
        `Wait for them to finish or ask them to release the lock.`
      );
      return;
    }

    // Step 2: Check for unacknowledged changes from other developers
    if (DEV_UUID) {
      const changeRes = await fetch(
        `${LOCK_SERVER}/api/v1/changes/check?filePath=${encodeURIComponent(filePath)}&developerUuid=${encodeURIComponent(DEV_UUID)}`,
        { signal: AbortSignal.timeout(3000) },
      );
      const changeData = await changeRes.json();

      if (changeData.hasChanges) {
        const changers = changeData.changes
          .map(c => `${c.developerName} (${c.changedAt})`)
          .join(', ');

        deny(
          `Warning: ${rawPath} was recently modified by other developer(s): ${changers}. ` +
          `There may be unmerged changes that could cause git conflicts. ` +
          `Pull the latest changes with "git pull" first, then run "filelock ack ${rawPath}" to unblock.`
        );
        return;
      }
    }
  } catch (err) {
    process.stderr.write(`[file-lock] Warning: lock server unreachable: ${err.message}\n`);
  }
}

await main();
