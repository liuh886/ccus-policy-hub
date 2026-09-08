import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SRC = path.join(ROOT, 'src');

/**
 * Guards the "no hardcoded site base in src" invariant established when
 * src/lib/siteBase.ts (import.meta.env.BASE_URL) became the single source of
 * truth. Fails when a '/ccus-policy-hub' literal reappears outside of:
 * - JSDoc / line comments (documenting the base itself is fine)
 * - external GitHub repository links
 */
test('src contains no hardcoded site base literals', () => {
  const offenders = [];

  const walk = (dir) => {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        walk(full);
      } else if (/\.(astro|ts|mjs|css)$/.test(entry.name)) {
        const lines = fs.readFileSync(full, 'utf8').split('\n');
        lines.forEach((line, i) => {
          if (!line.includes('/ccus-policy-hub')) return;
          const trimmed = line.trim();
          const isComment =
            trimmed.startsWith('*') ||
            trimmed.startsWith('//') ||
            trimmed.startsWith('/*');
          const isGithubLink = line.includes('github.com');
          if (!isComment && !isGithubLink) {
            offenders.push(`${path.relative(ROOT, full)}:${i + 1}: ${trimmed}`);
          }
        });
      }
    }
  };

  walk(SRC);

  assert.deepEqual(
    offenders,
    [],
    'Hardcoded site base literals found. Import SITE_BASE from src/lib/siteBase.ts instead.'
  );
});
