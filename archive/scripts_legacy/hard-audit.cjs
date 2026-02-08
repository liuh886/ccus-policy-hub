const fs = require('fs');
const path = require('path');
const yaml = require('js-yaml');

const POLICY_DIR = 'src/content/policies/zh';

console.log('--- RECURSIVE SCHEMA TYPE AUDIT ---');

const files = fs.readdirSync(POLICY_DIR);
let failed = 0;

files.forEach(file => {
  if (!file.endsWith('.md')) return;
  const content = fs.readFileSync(path.join(POLICY_DIR, file), 'utf-8');
  
  try {
    const fmMatch = content.match(/^---\r?\n([\s\S]+?)\r?\n---/);
    if (!fmMatch) throw new Error('Format Error');
    const data = yaml.load(fmMatch[1]);

    const dims = ['incentive', 'statutory', 'liability', 'mrv', 'market'];
    dims.forEach(dim => {
      const val = data.analysis?.[dim];
      if (typeof val !== 'object' || val === null) {
        console.error(`❌ [${file}] analysis.${dim} is NOT an object (got ${typeof val})`);
        failed++;
      } else if (typeof val.score !== 'number') {
        console.error(`❌ [${file}] analysis.${dim}.score is NOT a number`);
        failed++;
      }
    });
  } catch (e) {
    console.error(`💥 [${file}] YAML Crash: ${e.message}`);
    failed++;
  }
});

if (failed === 0) {
  console.log('✅ ALL CLEAR: All policies strictly match the yesterday high-fidelity object schema.');
} else {
  console.error(`🛑 AUDIT FAILED: ${failed} type mismatches found.`);
}
