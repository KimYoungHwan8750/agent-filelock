import { relative, resolve, isAbsolute } from 'node:path';

/**
 * Server-side: normalize to consistent form.
 * Expects paths already converted to project-relative by clients.
 */
export function normalizePath(filePath: string, cwd?: string): string {
  if (!filePath) return filePath;
  // If already relative (from client), just normalize separators
  if (!isAbsolute(filePath)) {
    return filePath.replace(/\\/g, '/');
  }
  // Fallback: resolve absolute paths (server-local operations)
  return resolve(cwd ?? process.cwd(), filePath);
}

/**
 * Client-side: convert absolute file path to project-root-relative path.
 * e.g. "/home/alice/project/src/app.ts" + projectRoot="/home/alice/project" → "src/app.ts"
 */
export function toProjectRelative(filePath: string, projectRoot: string): string {
  const abs = resolve(projectRoot, filePath);
  const rel = relative(projectRoot, abs);
  return rel.replace(/\\/g, '/');
}
