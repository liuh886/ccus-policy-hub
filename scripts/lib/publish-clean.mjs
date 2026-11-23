import fs from 'node:fs';
import path from 'node:path';

export function listRelativeFiles(rootDir) {
  if (!fs.existsSync(rootDir)) return [];
  const files = [];
  const visit = (dir) => {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) visit(full);
      else files.push(path.relative(rootDir, full).replace(/\\/g, '/'));
    }
  };
  visit(rootDir);
  return files.sort();
}

export function pruneStaleFiles(rootDir, expectedKeys) {
  if (!fs.existsSync(rootDir)) return [];
  const expected =
    expectedKeys instanceof Set || expectedKeys instanceof Map
      ? expectedKeys
      : new Set(expectedKeys);
  const removed = [];
  const visit = (dir) => {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        visit(full);
        if (fs.readdirSync(full).length === 0) fs.rmdirSync(full);
      } else {
        const rel = path.relative(rootDir, full).replace(/\\/g, '/');
        if (!expected.has(rel)) {
          fs.unlinkSync(full);
          removed.push(rel);
        }
      }
    }
  };
  visit(rootDir);
  return removed.sort();
}
