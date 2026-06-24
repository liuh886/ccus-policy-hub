/**
 * quality-metrics.test.mjs
 *
 * Tests for quality metrics generation and trust layer features.
 */

import { describe, it, before, after } from 'node:test';
import assert from 'node:assert';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { generateMetrics } from './generate-quality-metrics.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DB_PATH = path.join(
  __dirname,
  '../agent/ccus-ai-agent/db/ccus_master.sqlite'
);
const OUTPUT_PATH = path.join(
  __dirname,
  '../src/data/quality_metrics.generated.json'
);

describe('Quality Metrics Generation', () => {
  let metrics;

  before(async () => {
    // Generate metrics before tests
    if (fs.existsSync(DB_PATH)) {
      metrics = await generateMetrics();
    }
  });

  it('generates valid metrics file', () => {
    if (!fs.existsSync(DB_PATH)) {
      console.log('Skipping: database not found');
      return;
    }

    assert.ok(fs.existsSync(OUTPUT_PATH), 'Output file should exist');

    const content = JSON.parse(fs.readFileSync(OUTPUT_PATH, 'utf8'));
    assert.ok(content.generated_at, 'Should have generated_at');
    assert.ok(content.source_db_path, 'Should have source_db_path');
    assert.ok(content.audit_status, 'Should have audit_status');
    assert.ok(content.counts, 'Should have counts');
  });

  it('returns valid policy counts', () => {
    if (!metrics) return;

    assert.ok(metrics.counts.policies > 0, 'Should have policies');
    assert.ok(
      metrics.counts.policies_reviewed >= 0,
      'Should have reviewed count'
    );
    assert.ok(metrics.counts.policies_draft >= 0, 'Should have draft count');
    assert.strictEqual(
      metrics.counts.policies_reviewed + metrics.counts.policies_draft,
      metrics.counts.policies,
      'Reviewed + draft should equal total'
    );
  });

  it('returns valid facility counts', () => {
    if (!metrics) return;

    assert.ok(metrics.counts.facilities > 0, 'Should have facilities');
  });

  it('returns valid country profile counts', () => {
    if (!metrics) return;

    assert.ok(
      metrics.counts.country_profiles > 0,
      'Should have country profiles'
    );
  });

  it('detects bilingual parity', () => {
    if (!metrics) return;

    const bp = metrics.bilingual_parity;
    assert.ok(bp.policies_zh >= 0, 'Should have zh policies');
    assert.ok(bp.policies_en >= 0, 'Should have en policies');
    assert.ok(bp.facilities_zh >= 0, 'Should have zh facilities');
    assert.ok(bp.facilities_en >= 0, 'Should have en facilities');
    assert.ok(bp.countries_zh >= 0, 'Should have zh countries');
    assert.ok(bp.countries_en >= 0, 'Should have en countries');

    // Bilingual parity should be equal for this dataset
    assert.strictEqual(
      bp.policies_zh,
      bp.policies_en,
      'Policy bilingual parity'
    );
    assert.strictEqual(
      bp.facilities_zh,
      bp.facilities_en,
      'Facility bilingual parity'
    );
    assert.strictEqual(
      bp.countries_zh,
      bp.countries_en,
      'Country bilingual parity'
    );
  });

  it('classifies coordinate precision correctly', () => {
    if (!metrics) return;

    const coord = metrics.coordinate_precision;
    const totalPrecision =
      (coord.exact || 0) +
      (coord.state || 0) +
      (coord.country || 0) +
      (coord.missing || 0);

    assert.ok(coord.exact >= 0, 'Should have exact precision count');
    assert.ok(coord.state >= 0, 'Should have state precision count');
    assert.ok(coord.country >= 0, 'Should have country precision count');
    assert.strictEqual(
      totalPrecision,
      metrics.counts.facilities,
      'Precision counts should sum to total facilities'
    );
  });

  it('includes facility-policy link metrics', () => {
    if (!metrics) return;

    const links = metrics.facility_policy_links;
    assert.ok(links.total >= 0, 'Should have total links');
    assert.ok(links.country_level >= 0, 'Should have country_level count');
    assert.ok(links.sector_level >= 0, 'Should have sector_level count');
    assert.ok(links.evidence_level >= 0, 'Should have evidence_level count');
    assert.strictEqual(
      links.country_level + links.sector_level + links.evidence_level,
      links.total,
      'Link types should sum to total'
    );
  });

  it('includes audit status', () => {
    if (!metrics) return;

    assert.ok(
      'last_audit_pass' in metrics.audit_status,
      'Should have last_audit_pass'
    );
  });
});

describe('Audit Status Tracking', () => {
  it('has audit_status in generated metrics', () => {
    if (!fs.existsSync(OUTPUT_PATH)) {
      console.log('Skipping: metrics file not found');
      return;
    }

    const content = JSON.parse(fs.readFileSync(OUTPUT_PATH, 'utf8'));
    assert.ok(content.audit_status, 'Should have audit_status');
    assert.ok(
      'last_audit_pass' in content.audit_status,
      'Should have last_audit_pass field'
    );
  });

  it('audit_status reflects database state', () => {
    if (!fs.existsSync(OUTPUT_PATH)) {
      console.log('Skipping: metrics file not found');
      return;
    }

    const content = JSON.parse(fs.readFileSync(OUTPUT_PATH, 'utf8'));
    assert.ok(
      'last_audit_pass' in content.audit_status,
      'Should have last_audit_pass'
    );
    assert.strictEqual(
      typeof content.audit_status.last_audit_pass,
      'boolean',
      'last_audit_pass should be boolean'
    );
  });
});
