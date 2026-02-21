#!/usr/bin/env node

import { loadEnv, readStdin } from './load-env.mjs';

loadEnv();

const LOCK_SERVER = process.env.LOCK_SERVER_URL || 'http://localhost:8079';

let input;
try {
  input = JSON.parse(await readStdin());
} catch {
  process.exit(0);
}

const { session_id } = input;

if (!session_id) {
  process.exit(0);
}

try {
  const res = await fetch(`${LOCK_SERVER}/api/v1/locks/release-all`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ owner: `claude:${session_id}` }),
    signal: AbortSignal.timeout(5000),
  });

  const data = await res.json();
  if (data.ok && data.releasedCount > 0) {
    process.stderr.write(
      `[file-lock] Released ${data.releasedCount} lock(s) on session end.\n`
    );
  }
} catch (err) {
  process.stderr.write(
    `[file-lock] Warning: could not release locks on session end: ${err.message}\n`
  );
}

process.exit(0);
