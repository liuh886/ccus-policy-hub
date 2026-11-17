import { test } from 'node:test';
import assert from 'node:assert/strict';
import { exerciseSearchRuntime } from './verify-search-runtime.mjs';
import { patchSearchRuntime } from './lib/search-runtime.mjs';

test('real Pagefind HTTP consumer preserves explicit languages, native CJK terms, filters and Pages base paths', async () => {
  const result = await exerciseSearchRuntime();
  assert.deepEqual(result.term_segments['二氧化碳'], ['二氧', '化碳']);
  assert.equal(result.synthetic_records_published, false);
});

test('runtime shape drift fails before publishing a compatibility patch', () => {
  assert.throws(
    () => patchSearchRuntime('unknown runtime', {}, true),
    /shape changed/
  );
});
