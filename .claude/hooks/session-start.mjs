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

const { session_id, source } = input;

if (source === 'resume' && session_id) {
  try {
    await fetch(`${LOCK_SERVER}/api/v1/locks/heartbeat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ owner: `claude:${session_id}` }),
      signal: AbortSignal.timeout(3000),
    });
  } catch {
    // Non-critical
  }
}

process.exit(0);
