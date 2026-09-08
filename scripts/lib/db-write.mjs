#!/usr/bin/env node
/**
 * Shared SQLite write safety helpers for every process that writes
 * agent/ccus-ai-agent/db/ccus_master.sqlite (manage.mjs commands, migration
 * scripts, audit stamping, ingest pipeline).
 *
 * Guarantees:
 * - atomicWriteDb writes to a unique temp file (pid + random suffix) in the
 *   same directory, fsyncs it, then renames it over the target, so a crash
 *   mid-write can never truncate the database and concurrent writers can
 *   never clobber each other's temp file.
 * - acquireDbLock/createDbLock use atomic file creation ('wx' flag) instead
 *   of a check-then-write race; stale locks (>LOCK_STALE_MS) are taken over.
 * - releaseDbLock only removes the lock file when it still belongs to the
 *   releasing pid, so a slow process can never delete a successor's lock.
 */

import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
export const DB_LOCK_PATH = path.join(
  __dirname,
  '../../agent/ccus-ai-agent/db/.lock'
);
const LOCK_STALE_MS = 10 * 60 * 1000;

function readLockPid(lockPath) {
  try {
    return Number.parseInt(fs.readFileSync(lockPath, 'utf8'), 10);
  } catch {
    return Number.NaN;
  }
}

function isStale(lockPath) {
  try {
    return Date.now() - fs.statSync(lockPath).mtimeMs > LOCK_STALE_MS;
  } catch {
    return true;
  }
}

/**
 * Acquire the DB lock. Throws when another live process holds it.
 * Returns a release function bound to this pid.
 */
export function acquireDbLock(lockPath = DB_LOCK_PATH) {
  const payload = `${process.pid}`;
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      // 'wx' fails when the file already exists -> atomic create-or-lose.
      const fd = fs.openSync(lockPath, 'wx');
      fs.writeFileSync(fd, payload);
      fs.closeSync(fd);
      return () => releaseDbLock(lockPath);
    } catch (error) {
      if (error.code !== 'EEXIST') throw error;
      if (isStale(lockPath) || Number.isNaN(readLockPid(lockPath))) {
        // Stale or unreadable lock: replace it and retry once.
        try {
          fs.unlinkSync(lockPath);
        } catch {
          /* someone else may have removed it first; retry */
        }
        continue;
      }
      throw new Error(
        `Database is locked by another process (pid ${readLockPid(lockPath)}).`
      );
    }
  }
  throw new Error('Database is locked (failed to take over stale lock).');
}

/**
 * Release the lock only if it still belongs to the given pid (default: this
 * process). Returns true when the lock was removed.
 */
export function releaseDbLock(lockPath = DB_LOCK_PATH, pid = process.pid) {
  if (!fs.existsSync(lockPath)) return false;
  if (readLockPid(lockPath) !== pid) return false;
  fs.unlinkSync(lockPath);
  return true;
}

/** Write db bytes atomically: unique temp file + fsync + rename. */
export function atomicWriteDb(filePath, data) {
  const tmpPath = `${filePath}.${process.pid}.${crypto
    .randomBytes(4)
    .toString('hex')}.tmp`;
  const fd = fs.openSync(tmpPath, 'w');
  try {
    fs.writeFileSync(fd, new Uint8Array(data));
    fs.fsyncSync(fd);
  } finally {
    fs.closeSync(fd);
  }
  try {
    fs.renameSync(tmpPath, filePath);
  } catch (error) {
    try {
      fs.unlinkSync(tmpPath);
    } catch {
      /* best effort cleanup */
    }
    throw error;
  }
}
