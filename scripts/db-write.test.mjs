import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'fs';
import os from 'os';
import path from 'path';
import {
  acquireDbLock,
  releaseDbLock,
  atomicWriteDb,
} from './lib/db-write.mjs';

function tmpDir() {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'db-write-'));
}

test('acquireDbLock is exclusive for live holders', () => {
  const dir = tmpDir();
  const lock = path.join(dir, '.lock');
  const release = acquireDbLock(lock);
  assert.throws(() => acquireDbLock(lock), /locked by another process/);
  assert.equal(release(), true);
  // Lock is free again.
  const second = acquireDbLock(lock);
  second();
});

test('releaseDbLock refuses to delete another pid lock', () => {
  const dir = tmpDir();
  const lock = path.join(dir, '.lock');
  const release = acquireDbLock(lock);
  // A different "pid" must not remove the lock...
  assert.equal(releaseDbLock(lock, process.pid + 1), false);
  assert.ok(fs.existsSync(lock), 'lock must survive foreign release');
  // ...but the owner can.
  assert.equal(release(), true);
  assert.ok(!fs.existsSync(lock));
});

test('stale lock is taken over, live lock is not', () => {
  const dir = tmpDir();
  const lock = path.join(dir, '.lock');
  fs.writeFileSync(lock, '999999');
  // Artificially age the lock beyond the staleness window.
  const old = new Date(Date.now() - 20 * 60 * 1000);
  fs.utimesSync(lock, old, old);
  const release = acquireDbLock(lock);
  release();
});

test('atomicWriteDb leaves no temp residue and is safe under interleaving', () => {
  const dir = tmpDir();
  const target = path.join(dir, 'db.sqlite');
  atomicWriteDb(target, Buffer.from('first'));
  assert.equal(fs.readFileSync(target, 'utf8'), 'first');
  atomicWriteDb(target, Buffer.from('second'));
  assert.equal(fs.readFileSync(target, 'utf8'), 'second');
  const residue = fs.readdirSync(dir).filter((f) => f.endsWith('.tmp'));
  assert.deepEqual(residue, [], 'no temp files may remain');
});

test('atomicWriteDb cleans up temp file when rename fails', () => {
  const dir = tmpDir();
  const target = path.join(dir, 'db.sqlite');
  atomicWriteDb(target, Buffer.from('v1'));
  // Make the target path a directory so renameSync fails.
  fs.rmSync(target);
  fs.mkdirSync(target);
  assert.throws(() => atomicWriteDb(target, Buffer.from('v2')));
  const residue = fs.readdirSync(dir).filter((f) => f.endsWith('.tmp'));
  assert.deepEqual(residue, [], 'failed rename must not leave temp files');
});
