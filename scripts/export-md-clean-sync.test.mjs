import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'fs';
import os from 'os';
import path from 'path';

import {
  buildExpectedMarkdownSetsFromRows,
  pruneMarkdownDirectory,
} from './export-md-clean-sync.mjs';

test('pruneMarkdownDirectory removes stale markdown files and preserves expected ones', () => {
  const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'ccus-export-clean-'));
  const contentDir = path.join(tempRoot, 'facilities', 'en');
  fs.mkdirSync(contentDir, { recursive: true });

  const keepFile = path.join(contentDir, '1.md');
  const staleFile = path.join(contentDir, '9999.md');
  const noteFile = path.join(contentDir, 'README.txt');

  fs.writeFileSync(keepFile, 'keep');
  fs.writeFileSync(staleFile, 'remove');
  fs.writeFileSync(noteFile, 'ignore');

  const result = pruneMarkdownDirectory(contentDir, new Set(['1.md', '2.md']));

  assert.deepEqual(result.deleted, ['9999.md']);
  assert.equal(fs.existsSync(keepFile), true);
  assert.equal(fs.existsSync(staleFile), false);
  assert.equal(fs.existsSync(noteFile), true);
});

test('buildExpectedMarkdownSetsFromRows uses lang-specific i18n rows for exportable markdown', () => {
  const expected = buildExpectedMarkdownSetsFromRows({
    policyI18nRows: [
      { policy_id: 'p-en', lang: 'en' },
      { policy_id: 'p-zh', lang: 'zh' },
      { policy_id: 'p-both', lang: 'en' },
      { policy_id: 'p-both', lang: 'zh' },
    ],
    facilityI18nRows: [
      { facility_id: 'f-1', lang: 'en' },
      { facility_id: 'f-1', lang: 'zh' },
    ],
    countryI18nRows: [
      { country_id: 'United States', lang: 'en' },
      { country_id: 'United States', lang: 'zh' },
      { country_id: 'Czech Republic', lang: 'en' },
    ],
  });

  assert.deepEqual([...expected.policies.en].sort(), ['p-both.md', 'p-en.md']);
  assert.deepEqual([...expected.policies.zh].sort(), ['p-both.md', 'p-zh.md']);
  assert.deepEqual([...expected.facilities.en], ['f-1.md']);
  assert.deepEqual([...expected.facilities.zh], ['f-1.md']);
  assert.deepEqual([...expected.countries.en].sort(), [
    'czech-republic.md',
    'united-states.md',
  ]);
  assert.deepEqual([...expected.countries.zh], ['united-states.md']);
});
