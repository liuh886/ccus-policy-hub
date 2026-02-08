const fs = require('fs');
const path = require('path');

const DB_FACILITIES = 'src/data/facility_database.json';
const DB_POLICIES = 'src/data/policy_database.json';
const CONTENT_DIR = 'src/content';

const auditResults = {
  facilities: { total: 0, missingMD: 0, zeroCoords: 0 },
  policies: { total: 0, missingMD: 0 },
  errors: []
};

// 1. Audit Facilities
const fdb = JSON.parse(fs.readFileSync(DB_FACILITIES, 'utf8'));
auditResults.facilities.total = fdb.facilities.length;

fdb.facilities.forEach(f => {
  const zhPath = path.join(CONTENT_DIR, 'facilities/zh', `${f.id}.md`);
  const enPath = path.join(CONTENT_DIR, 'facilities/en', `${f.id}.md`);
  
  if (!fs.existsSync(zhPath)) auditResults.facilities.missingMD++;
  if (!fs.existsSync(enPath)) auditResults.facilities.missingMD++;
  
  const coords = f.zh?.coordinates || [0, 0];
  if (coords[0] === 0 && coords[1] === 0) auditResults.facilities.zeroCoords++;
});

// 2. Audit Policies
const pdb = JSON.parse(fs.readFileSync(DB_POLICIES, 'utf8'));
auditResults.policies.total = pdb.policies.length;

pdb.policies.forEach(p => {
  const zhPath = path.join(CONTENT_DIR, 'policies/zh', `${p.id}.md`);
  const enPath = path.join(CONTENT_DIR, 'policies/en', `${p.id}.md`);
  
  if (!fs.existsSync(zhPath)) auditResults.policies.missingMD++;
  if (!fs.existsSync(enPath)) auditResults.policies.missingMD++;
});

console.log('--- GOVERNANCE AUDIT REPORT ---');
console.log(`Facilities: ${auditResults.facilities.total} entries, ${auditResults.facilities.missingMD} missing MD files, ${auditResults.facilities.zeroCoords} zero coordinates.`);
console.log(`Policies: ${auditResults.policies.total} entries, ${auditResults.policies.missingMD} missing MD files.`);

if (auditResults.facilities.missingMD > 0 || auditResults.policies.missingMD > 0 || auditResults.facilities.zeroCoords > 0) {
  console.log('❌ Audit Failed: Inconsistencies found.');
  process.exit(1);
} else {
  console.log('✅ Audit Passed: Everything is in sync.');
}