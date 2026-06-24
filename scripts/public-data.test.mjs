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

  it('at least one policy has i18n title', () => {
    const filePath = path.join(PUBLIC_DATA_DIR, 'policies.json');
    if (!fs.existsSync(filePath)) {
      console.log('Skipping: policies.json not found');
      return;
    }

    const content = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    const hasTitle = content.records.some(
      (p) => p.i18n?.zh?.title || p.i18n?.en?.title
    );
    assert.ok(hasTitle, 'At least one policy should have i18n title');
  });

  it('at least one policy has non-empty analysis', () => {
    const filePath = path.join(PUBLIC_DATA_DIR, 'policies.json');
    if (!fs.existsSync(filePath)) {
      console.log('Skipping: policies.json not found');
      return;
    }

    const content = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    const hasAnalysis = content.records.some(
      (p) => p.analysis && Object.keys(p.analysis).length > 0
    );
    assert.ok(hasAnalysis, 'At least one policy should have analysis');
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

  it('at least one facility has i18n name', () => {
    const filePath = path.join(PUBLIC_DATA_DIR, 'facilities.json');
    if (!fs.existsSync(filePath)) {
      console.log('Skipping: facilities.json not found');
      return;
    }

    const content = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    const hasName = content.records.some(
      (f) => f.i18n?.zh?.name || f.i18n?.en?.name
    );
    assert.ok(hasName, 'At least one facility should have i18n name');
  });

  it('total linked_policies count > 0', () => {
    const filePath = path.join(PUBLIC_DATA_DIR, 'facilities.json');
    if (!fs.existsSync(filePath)) {
      console.log('Skipping: facilities.json not found');
      return;
    }

    const content = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    const totalLinks = content.records.reduce(
      (sum, f) => sum + (f.linked_policies?.length || 0),
      0
    );
    assert.ok(totalLinks > 0, 'Total linked_policies should be > 0');
  });
});

describe('Country Record Fields', () => {
  it('countries.json records include required fields', () => {
    const filePath = path.join(PUBLIC_DATA_DIR, 'countries.json');
    if (!fs.existsSync(filePath)) {
      console.log('Skipping: countries.json not found');
      return;
    }

    const content = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    const requiredFields = ['id'];

    for (const country of content.records.slice(0, 10)) {
      for (const field of requiredFields) {
        assert.ok(
          field in country,
          `Country ${country.id} should have ${field}`
        );
      }
      assert.ok(country.i18n, `Country ${country.id} should have i18n`);
    }
  });

  it('at least one country has policy_count > 0', () => {
    const filePath = path.join(PUBLIC_DATA_DIR, 'countries.json');
    if (!fs.existsSync(filePath)) {
      console.log('Skipping: countries.json not found');
      return;
    }

    const content = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    const hasPolicies = content.records.some((c) => c.policy_count > 0);
    assert.ok(hasPolicies, 'At least one country should have policy_count > 0');
  });

  it('at least one country has facility_count > 0', () => {
    const filePath = path.join(PUBLIC_DATA_DIR, 'countries.json');
    if (!fs.existsSync(filePath)) {
      console.log('Skipping: countries.json not found');
      return;
    }

    const content = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    const hasFacilities = content.records.some((c) => c.facility_count > 0);
    assert.ok(
      hasFacilities,
      'At least one country should have facility_count > 0'
    );
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

describe('Data Quality Checks', () => {
  it('no generated dataset has all-empty i18n objects', () => {
    const datasets = ['policies.json', 'facilities.json', 'countries.json'];

    for (const dataset of datasets) {
      const filePath = path.join(PUBLIC_DATA_DIR, dataset);
      if (!fs.existsSync(filePath)) {
        console.log(`Skipping: ${dataset} not found`);
        continue;
      }

      const content = JSON.parse(fs.readFileSync(filePath, 'utf8'));
      const allEmpty = content.records.every(
        (record) => !record.i18n || Object.keys(record.i18n).length === 0
      );
      assert.ok(!allEmpty, `${dataset} should not have all-empty i18n objects`);
    }
  });
});
