/**
 * public-data.test.mjs
 *
 * Tests for public data endpoints and AI-readable interface.
 */

import { describe, it } from 'node:test';
import assert from 'node:assert';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PUBLIC_DATA_DIR = path.join(__dirname, '../public/data');
const QUALITY_METRICS_PATH = path.join(
  __dirname,
  '../src/data/quality_metrics.generated.json'
);

describe('Public Data Endpoints', () => {
  it('policies.json exists and is valid JSON', () => {
    const filePath = path.join(PUBLIC_DATA_DIR, 'policies.json');
    assert.ok(fs.existsSync(filePath), 'policies.json should exist');

    const content = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    assert.ok(content.generated_at, 'Should have generated_at');
    assert.ok(typeof content.count === 'number', 'Should have count');
    assert.ok(Array.isArray(content.records), 'Should have records array');
    assert.strictEqual(
      content.count,
      content.records.length,
      'Count should match records length'
    );
  });

  it('facilities.json exists and is valid JSON', () => {
    const filePath = path.join(PUBLIC_DATA_DIR, 'facilities.json');
    assert.ok(fs.existsSync(filePath), 'facilities.json should exist');

    const content = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    assert.ok(content.generated_at, 'Should have generated_at');
    assert.ok(typeof content.count === 'number', 'Should have count');
    assert.ok(Array.isArray(content.records), 'Should have records array');
    assert.strictEqual(
      content.count,
      content.records.length,
      'Count should match records length'
    );
  });

  it('countries.json exists and is valid JSON', () => {
    const filePath = path.join(PUBLIC_DATA_DIR, 'countries.json');
    assert.ok(fs.existsSync(filePath), 'countries.json should exist');

    const content = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    assert.ok(content.generated_at, 'Should have generated_at');
    assert.ok(typeof content.count === 'number', 'Should have count');
    assert.ok(Array.isArray(content.records), 'Should have records array');
    assert.strictEqual(
      content.count,
      content.records.length,
      'Count should match records length'
    );
  });

  it('quality.json exists and is valid JSON', () => {
    const filePath = path.join(PUBLIC_DATA_DIR, 'quality.json');
    assert.ok(fs.existsSync(filePath), 'quality.json should exist');

    const content = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    assert.ok(content.generated_at, 'Should have generated_at');
    assert.ok(content.counts, 'Should have counts');
    assert.ok(content.audit_status, 'Should have audit_status');
  });

  it('dataset-versions.json exists and is valid JSON', () => {
    const filePath = path.join(PUBLIC_DATA_DIR, 'dataset-versions.json');
    assert.ok(fs.existsSync(filePath), 'dataset-versions.json should exist');

    const content = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    assert.ok(
      content.facility_dataset_name,
      'Should have facility_dataset_name'
    );
    assert.ok(
      content.facility_dataset_version,
      'Should have facility_dataset_version'
    );
    assert.ok(content.last_checked_date, 'Should have last_checked_date');
  });

  it('manifest.json exists and is valid JSON', () => {
    const filePath = path.join(PUBLIC_DATA_DIR, 'manifest.json');
    assert.ok(fs.existsSync(filePath), 'manifest.json should exist');

    const content = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    assert.ok(content.generated_at, 'Should have generated_at');
    assert.ok(content.project, 'Should have project');
    assert.ok(content.datasets, 'Should have datasets');
    assert.ok(content.schemas, 'Should have schemas');
    assert.ok(content.known_limitations, 'Should have known_limitations');
  });
});

describe('Manifest Consistency', () => {
  it('manifest dataset counts match quality_metrics', () => {
    const manifestPath = path.join(PUBLIC_DATA_DIR, 'manifest.json');
    if (!fs.existsSync(manifestPath) || !fs.existsSync(QUALITY_METRICS_PATH)) {
      console.log('Skipping: files not found');
      return;
    }

    const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
    const quality = JSON.parse(fs.readFileSync(QUALITY_METRICS_PATH, 'utf8'));

    assert.strictEqual(
      manifest.datasets.policies.count,
      quality.counts.policies,
      'Policy count should match'
    );
    assert.strictEqual(
      manifest.datasets.facilities.count,
      quality.counts.facilities,
      'Facility count should match'
    );
    assert.strictEqual(
      manifest.datasets.countries.count,
      quality.counts.country_profiles,
      'Country count should match'
    );
  });
});

describe('Schema Validation', () => {
  it('policy.schema.json is valid JSON', () => {
    const filePath = path.join(
      PUBLIC_DATA_DIR,
      'schemas',
      'policy.schema.json'
    );
    assert.ok(fs.existsSync(filePath), 'policy.schema.json should exist');

    const content = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    assert.ok(content.$schema, 'Should have $schema');
    assert.ok(content.title, 'Should have title');
    assert.ok(content.properties, 'Should have properties');
  });

  it('facility.schema.json is valid JSON', () => {
    const filePath = path.join(
      PUBLIC_DATA_DIR,
      'schemas',
      'facility.schema.json'
    );
    assert.ok(fs.existsSync(filePath), 'facility.schema.json should exist');

    const content = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    assert.ok(content.$schema, 'Should have $schema');
    assert.ok(content.title, 'Should have title');
    assert.ok(content.properties, 'Should have properties');
  });

  it('country.schema.json is valid JSON', () => {
    const filePath = path.join(
      PUBLIC_DATA_DIR,
      'schemas',
      'country.schema.json'
    );
    assert.ok(fs.existsSync(filePath), 'country.schema.json should exist');

    const content = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    assert.ok(content.$schema, 'Should have $schema');
    assert.ok(content.title, 'Should have title');
    assert.ok(content.properties, 'Should have properties');
  });

  it('manifest.schema.json is valid JSON', () => {
    const filePath = path.join(
      PUBLIC_DATA_DIR,
      'schemas',
      'manifest.schema.json'
    );
    assert.ok(fs.existsSync(filePath), 'manifest.schema.json should exist');

    const content = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    assert.ok(content.$schema, 'Should have $schema');
    assert.ok(content.title, 'Should have title');
    assert.ok(content.properties, 'Should have properties');
  });
});

describe('Policy Record Fields', () => {
  it('policies.json records include required fields', () => {
    const filePath = path.join(PUBLIC_DATA_DIR, 'policies.json');
    if (!fs.existsSync(filePath)) {
      console.log('Skipping: policies.json not found');
      return;
    }

    const content = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    const requiredFields = ['id', 'country'];

    for (const policy of content.records.slice(0, 10)) {
      for (const field of requiredFields) {
        assert.ok(field in policy, `Policy ${policy.id} should have ${field}`);
      }
      assert.ok(policy.i18n, `Policy ${policy.id} should have i18n`);
    }
  });
});

describe('Facility Record Fields', () => {
  it('facilities.json records include required fields', () => {
    const filePath = path.join(PUBLIC_DATA_DIR, 'facilities.json');
    if (!fs.existsSync(filePath)) {
      console.log('Skipping: facilities.json not found');
      return;
    }

    const content = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    const requiredFields = ['id', 'country'];

    for (const facility of content.records.slice(0, 10)) {
      for (const field of requiredFields) {
        assert.ok(
          field in facility,
          `Facility ${facility.id} should have ${field}`
        );
      }
      assert.ok(facility.i18n, `Facility ${facility.id} should have i18n`);
      assert.ok(
        Array.isArray(facility.linked_policies),
        `Facility ${facility.id} should have linked_policies array`
      );
    }
  });
});

describe('llms.txt Validation', () => {
  it('llms.txt exists and references manifest.json', () => {
    const filePath = path.join(__dirname, '../public/llms.txt');
    assert.ok(fs.existsSync(filePath), 'llms.txt should exist');

    const content = fs.readFileSync(filePath, 'utf8');
    assert.ok(
      content.includes('manifest.json'),
      'llms.txt should reference manifest.json'
    );
    assert.ok(
      content.includes('quality.json'),
      'llms.txt should reference quality.json'
    );
  });

  it('llms-full.txt exists and is comprehensive', () => {
    const filePath = path.join(__dirname, '../public/llms-full.txt');
    assert.ok(fs.existsSync(filePath), 'llms-full.txt should exist');

    const content = fs.readFileSync(filePath, 'utf8');
    assert.ok(
      content.includes('policies.json'),
      'llms-full.txt should reference policies.json'
    );
    assert.ok(
      content.includes('facilities.json'),
      'llms-full.txt should reference facilities.json'
    );
    assert.ok(
      content.includes('countries.json'),
      'llms-full.txt should reference countries.json'
    );
    assert.ok(
      content.includes('country-level'),
      'llms-full.txt should mention country-level link limitation'
    );
  });
});
