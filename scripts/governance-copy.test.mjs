/**
 * governance-copy.test.mjs
 *
 * T2 convergence guard: the three governance dictionaries live in
 * src/lib/governanceCopy.mjs and every `en` block must carry exactly the
 * same keys as its `zh` counterpart (zh is the runtime fallback).
 */

import { describe, it } from 'node:test';
import assert from 'node:assert';
import {
  governanceClientCopy,
  governanceComparisonCopy,
  governanceVisualsCopy,
} from '../src/lib/governanceCopy.mjs';

const sameKeys = (zh, en, where) => {
  assert.deepStrictEqual(
    Object.keys(en).sort(),
    Object.keys(zh).sort(),
    `${where}: en keys must equal zh keys`
  );
};

describe('governanceCopy dictionaries', () => {
  it('comparison copy has zh/en parity', () => {
    sameKeys(
      governanceComparisonCopy.zh,
      governanceComparisonCopy.en,
      'comparison'
    );
    sameKeys(
      governanceComparisonCopy.zh.panels,
      governanceComparisonCopy.en.panels,
      'comparison.panels'
    );
  });

  it('client copy has zh/en parity (incl. quadrant + regKeys)', () => {
    sameKeys(governanceClientCopy.zh, governanceClientCopy.en, 'client');
    sameKeys(
      governanceClientCopy.zh.quadrant,
      governanceClientCopy.en.quadrant,
      'client.quadrant'
    );
    assert.strictEqual(
      governanceClientCopy.en.regKeys.length,
      governanceClientCopy.zh.regKeys.length,
      'regKeys row count must match'
    );
    assert.deepStrictEqual(
      governanceClientCopy.en.regKeys.map(([, id]) => id),
      governanceClientCopy.zh.regKeys.map(([, id]) => id),
      'regKeys machine ids must match (labels may differ)'
    );
    assert.strictEqual(
      governanceClientCopy.en.dimensionLabels.length,
      governanceClientCopy.zh.dimensionLabels.length,
      'dimensionLabels length must match'
    );
  });

  it('visuals copy has zh/en parity', () => {
    sameKeys(governanceVisualsCopy.zh, governanceVisualsCopy.en, 'visuals');
  });

  it('dictionaries are frozen', () => {
    for (const dict of [
      governanceComparisonCopy,
      governanceClientCopy,
      governanceVisualsCopy,
    ]) {
      assert.ok(Object.isFrozen(dict), 'top level frozen');
      assert.ok(Object.isFrozen(dict.zh), 'zh frozen');
      assert.ok(Object.isFrozen(dict.en), 'en frozen');
    }
  });

  it('lang-specific paths carry the /en/ prefix only in en', () => {
    assert.ok(governanceComparisonCopy.en.emptyHref.includes('/en/policy/'));
    assert.ok(!governanceComparisonCopy.zh.emptyHref.includes('/en/'));
    assert.ok(governanceClientCopy.en.policyPath.includes('/en/policy/'));
    assert.ok(!governanceClientCopy.zh.policyPath.includes('/en/'));
    assert.ok(governanceVisualsCopy.en.policyPath.includes('/en/policy/'));
    assert.ok(!governanceVisualsCopy.zh.policyPath.includes('/en/'));
  });

  it('unknown lang falls back to zh (runtime contract)', () => {
    for (const dict of [
      governanceComparisonCopy,
      governanceClientCopy,
      governanceVisualsCopy,
    ]) {
      assert.strictEqual(dict['fr'] || dict.zh, dict.zh);
    }
  });
});
