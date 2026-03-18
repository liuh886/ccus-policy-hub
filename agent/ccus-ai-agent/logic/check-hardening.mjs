import fs from 'fs';
import path from 'path';

const ROOT = process.cwd();

function read(relPath) {
  return fs.readFileSync(path.join(ROOT, relPath), 'utf8');
}

function fail(message) {
  console.error(`FAIL: ${message}`);
  process.exitCode = 1;
}

function checkTargetBlankRel() {
  const srcDir = path.join(ROOT, 'src');
  const files = [];

  function walk(dir) {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) walk(full);
      else if (entry.isFile() && full.endsWith('.astro')) files.push(full);
    }
  }

  walk(srcDir);

  for (const file of files) {
    const content = fs.readFileSync(file, 'utf8');
    const tagMatches = content.match(/<a\b[\s\S]*?>/g) || [];
    for (const tag of tagMatches) {
      if (!tag.includes('target="_blank"')) continue;
      if (!tag.includes('rel="noopener noreferrer"')) {
        fail(`${path.relative(ROOT, file)} has target="_blank" without rel="noopener noreferrer"`);
      }
    }
  }
}

function checkApiExportGuards() {
  const csv = read('src/pages/api/policies.csv.ts');
  const json = read('src/pages/api/policies.json.ts');

  if (csv.includes('incentive_type') || csv.includes('incentive_value')) {
    fail('src/pages/api/policies.csv.ts still references legacy incentive_* fields');
  }
  if (!csv.includes("'legal_weight'") || !csv.includes("'pub_date'")) {
    fail('src/pages/api/policies.csv.ts is missing legal_weight/pub_date CSV headers');
  }
  if (!json.includes("lang: 'zh'") || !json.includes("lang: 'en'")) {
    fail('src/pages/api/policies.json.ts must include lang markers for merged zh/en payloads');
  }
}

function checkListenerGuards() {
  const expectations = [
    ['src/components/CompareDrawer.astro', '__ccusCompareDrawerBound'],
    ['src/components/Search.astro', '__ccusSearchAssetsRequested'],
    ['src/pages/compare/index.astro', '__ccusComparePageBoundZh'],
    ['src/pages/en/compare/index.astro', '__ccusComparePageBoundEn'],
    ['src/pages/policy/index.astro', 'data-filter-bound'],
    ['src/pages/en/policy/index.astro', 'data-filter-bound'],
    ['src/pages/facilities/index.astro', 'data-filter-bound'],
    ['src/pages/en/facilities/index.astro', 'data-filter-bound'],
    ['src/components/NavBar.astro', '__ccusNavBarBound'],
  ];

  for (const [file, marker] of expectations) {
    const content = read(file);
    if (!content.includes(marker)) {
      fail(`${file} is missing listener/initialization guard marker: ${marker}`);
    }
  }
}

checkTargetBlankRel();
checkApiExportGuards();
checkListenerGuards();

if (process.exitCode) {
  process.exit(process.exitCode);
}

console.log('Hardening checks passed.');
