import type { LockRecord } from '../shared/types.js';

export function formatLockTable(locks: LockRecord[]): string {
  if (locks.length === 0) return 'No active locks.';

  const header = padRow('FILE', 'OWNER', 'LOCKED SINCE', 'EXPIRES IN');
  const separator = '-'.repeat(header.length);
  const rows = locks.map(lock =>
    padRow(
      truncate(lock.filePath, 40),
      truncate(lock.ownerName, 25),
      formatTime(lock.acquiredAt),
      formatTimeRemaining(lock.expiresAt),
    )
  );

  return [header, separator, ...rows].join('\n');
}

export function formatLockStatus(lock: LockRecord): string {
  return [
    `File:     ${lock.filePath}`,
    `Owner:    ${lock.ownerName} (${lock.owner})`,
    `Locked:   ${formatTime(lock.acquiredAt)}`,
    `Expires:  ${formatTimeRemaining(lock.expiresAt)}`,
  ].join('\n');
}

function padRow(file: string, owner: string, since: string, expires: string): string {
  return `${file.padEnd(42)} ${owner.padEnd(27)} ${since.padEnd(20)} ${expires}`;
}

function truncate(str: string, max: number): string {
  if (str.length <= max) return str;
  return '...' + str.slice(-(max - 3));
}

function formatTime(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleTimeString('en-US', { hour12: false });
}

function formatTimeRemaining(expiresAt: string): string {
  const diff = new Date(expiresAt).getTime() - Date.now();
  if (diff <= 0) return 'EXPIRED';
  const mins = Math.floor(diff / 60_000);
  if (mins < 60) return `${mins}m`;
  const hours = Math.floor(mins / 60);
  const remainMins = mins % 60;
  return `${hours}h ${remainMins}m`;
}
