import fs from 'fs';

const DB_PATH = './src/data/policy_database.json';
const db = JSON.parse(fs.readFileSync(DB_PATH, 'utf-8'));

console.log('--- FIDELITY 4.0 GOVERNANCE AUDIT ---');
let errors = 0;

db.policies.forEach(p => {
  const missing = [];
  if (!p.governance_role) missing.push('governance_role');
  if (!p.analysis) missing.push('analysis (radar scores)');
  if (!p.spec) missing.push('spec (standardized fields)');
  
  if (missing.length > 0) {
    console.error(`❌ [ID: ${p.id}] Missing components: ${missing.join(', ')}`);
    errors++;
  }
});

if (errors === 0) {
  console.log('✅ Audit Passed: All policies comply with the Governance Puzzle Framework.');
} else {
  console.error(`\n⚠️ Total Audit Errors: ${errors}. Please fix before deployment.`);
  process.exit(1);
}