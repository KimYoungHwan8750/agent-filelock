import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

export function readStdin() {
  return new Promise((resolve, reject) => {
    let data = '';
    process.stdin.setEncoding('utf8');
    process.stdin.on('data', (chunk) => { data += chunk; });
    process.stdin.on('end', () => resolve(data));
    process.stdin.on('error', reject);
  });
}

export function loadEnv(cwd) {
  const dir = process.env.CLAUDE_PROJECT_DIR || cwd || process.cwd();
  try {
    const content = readFileSync(resolve(dir, '.env'), 'utf8');
    for (const line of content.split('\n')) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;
      const eqIdx = trimmed.indexOf('=');
      if (eqIdx === -1) continue;
      const key = trimmed.slice(0, eqIdx).trim();
      let val = trimmed.slice(eqIdx + 1).trim();
      // Strip surrounding quotes
      if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
        val = val.slice(1, -1);
      }
      // Don't overwrite existing env vars
      if (!(key in process.env)) {
        process.env[key] = val;
      }
    }
  } catch {
    // .env file not found — silently ignore
  }
}
