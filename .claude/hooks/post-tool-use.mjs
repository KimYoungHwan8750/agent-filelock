#!/usr/bin/env node

import { hostname } from 'node:os';
import { relative, resolve } from 'node:path';
import { loadEnv, readStdin } from './load-env.mjs';

loadEnv();

const LOCK_SERVER = process.env.LOCK_SERVER_URL || 'http://localhost:8079';
const DEV_UUID = process.env.FILELOCK_UUID || '';

let input;
try {
  input = JSON.parse(await readStdin());
} catch {
  process.exit(0);
}

const { session_id, tool_input, cwd } = input;

if (!session_id) {
  process.exit(0);
}

// NOTE: Lock release는 여기서 하지 않음.
// Claude가 작업 완료 후 배치 release API를 호출하거나,
// session-end hook이 안전망으로 전체 release함.

try {
  // Record change for this developer UUID
  const rawPath = tool_input?.file_path;
  if (DEV_UUID && rawPath) {
    const projectRoot = cwd || process.cwd();
    const absPath = resolve(projectRoot, rawPath);
    const filePath = relative(projectRoot, absPath).replace(/\\/g, '/');

    await fetch(`${LOCK_SERVER}/api/v1/changes/record`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        filePath,
        developerUuid: DEV_UUID,
        developerName: `${hostname()}:${DEV_UUID.slice(0, 8)}`,
      }),
      signal: AbortSignal.timeout(3000),
    });
  }
} catch {
  // Non-critical
}

process.exit(0);
