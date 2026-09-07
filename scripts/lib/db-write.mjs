#!/usr/bin/env node
/**
 * Shared SQLite write safety helpers for scripts that write
 * agent/ccus-ai-agent/db/ccus_master.sqlite directly.
 *
 * - acquireDbLock / releaseDbLock mirror the file lock used by
 *   agent/ccus-ai-agent/logic/manage.mjs (same lock path, same staleness rule)
 *   so that migration scripts cannot interleave with managed commands.
 * - atomicWriteDb writes to a temp file in the same directory and renames it
 *   over the target, so a crash mid-write can never truncate the database.
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const LOCK_PATH = path.join(__dirname, '../../agent/ccus-ai-agent/db/.lock');

export function acquireDbLock() {
  if (fs.existsSync(LOCK_PATH)) {
    const stat = fs.statSync(LOCK_PATH);
    if ((Date.now() - stat.mtimeMs) / 1000 < 300) {
      throw new Error('Database is locked by another process.');
    }
    fs.unlinkSync(LOCK_PATH);
  }
  fs.writeFileSync(LOCK_PATH, process.pid.toString());
}

export function releaseDbLock() {
  if (fs.existsSync(LOCK_PATH)) fs.unlinkSync(LOCK_PATH);
}

export function atomicWriteDb(filePath, data) {
  const tmpPath = `${filePath}.tmp`;
  fs.writeFileSync(tmpPath, new Uint8Array(data));
  fs.renameSync(tmpPath, filePath);
}
