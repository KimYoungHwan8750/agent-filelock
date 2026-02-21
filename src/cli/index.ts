#!/usr/bin/env node

import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

// Load .env before anything else
try {
  const content = readFileSync(resolve(process.cwd(), '.env'), 'utf8');
  for (const line of content.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eqIdx = trimmed.indexOf('=');
    if (eqIdx === -1) continue;
    const key = trimmed.slice(0, eqIdx).trim();
    let val = trimmed.slice(eqIdx + 1).trim();
    if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
      val = val.slice(1, -1);
    }
    if (!(key in process.env)) {
      process.env[key] = val;
    }
  }
} catch { /* .env not found */ }

import { Command } from 'commander';
import { DEFAULT_SERVER_URL, SERVER_VERSION } from '../shared/constants.js';
import { ApiClient } from './api-client.js';
import { lockCommand } from './commands/lock.js';
import { unlockCommand } from './commands/unlock.js';
import { unlockAllCommand } from './commands/unlock-all.js';
import { statusCommand } from './commands/status.js';
import { listCommand } from './commands/list.js';
import { stealCommand } from './commands/steal.js';
import { ackCommand } from './commands/ack.js';
import { cleanupCommand } from './commands/cleanup.js';
import { serverCommand } from './commands/server.js';

const program = new Command();

program
  .name('filelock')
  .description('Centralized file lock management for Claude Code and human collaborators')
  .version(SERVER_VERSION)
  .option('-s, --server <url>', 'Lock server URL', DEFAULT_SERVER_URL)
  .option('--json', 'Output as JSON');

function getClient(): ApiClient {
  const opts = program.opts();
  return new ApiClient(opts.server as string);
}

program
  .command('lock')
  .description('Lock one or more files')
  .argument('<files...>', 'Files to lock')
  .option('-t, --ttl <minutes>', 'Lock TTL in minutes')
  .action(async (files: string[], opts) => {
    await lockCommand(files, { ...opts, ...program.opts() }, getClient());
  });

program
  .command('unlock')
  .description('Unlock one or more files')
  .argument('<files...>', 'Files to unlock')
  .option('-f, --force', 'Force unlock (even if locked by another user)')
  .action(async (files: string[], opts) => {
    await unlockCommand(files, { ...opts, ...program.opts() }, getClient());
  });

program
  .command('unlock-all')
  .description('Unlock all your files')
  .action(async () => {
    await unlockAllCommand(program.opts(), getClient());
  });

program
  .command('status')
  .description('Show lock status for a file')
  .argument('[file]', 'File to check')
  .action(async (file: string | undefined) => {
    await statusCommand(file, program.opts(), getClient());
  });

program
  .command('list')
  .description('List all active locks')
  .option('-o, --owner <owner>', 'Filter by owner')
  .option('-p, --prefix <prefix>', 'Filter by file path prefix')
  .action(async (opts) => {
    await listCommand({ ...opts, ...program.opts() }, getClient());
  });

program
  .command('steal')
  .description('Force-acquire a lock (admin)')
  .argument('[file]', 'File to steal lock for')
  .action(async (file: string | undefined) => {
    await stealCommand(file, program.opts(), getClient());
  });

program
  .command('ack')
  .description('Acknowledge file changes from other developers')
  .argument('<files...>', 'Files to acknowledge')
  .option('-u, --uuid <uuid>', 'Your developer UUID (default: FILELOCK_UUID env)')
  .action(async (files: string[], opts) => {
    await ackCommand(files, { ...opts, ...program.opts() }, getClient());
  });

program
  .command('cleanup')
  .description('Trigger stale lock cleanup')
  .action(async () => {
    await cleanupCommand(program.opts(), getClient());
  });

program
  .command('server')
  .description('Start the lock server')
  .option('-p, --port <port>', 'Port to listen on')
  .option('-d, --db-path <path>', 'Database file path')
  .action(async (opts) => {
    await serverCommand(opts);
  });

program.parse();
