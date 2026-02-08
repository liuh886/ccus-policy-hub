const fs = require('fs');

const POLICY_DB = 'src/data/policy_database.json';
const FACILITY_DB = 'src/data/facility_database.json';

const rawP = fs.readFileSync(POLICY_DB, 'utf8');
const pdb = JSON.parse(rawP.charCodeAt(0) === 0xFEFF ? rawP.slice(1) : rawP);

const rawF = fs.readFileSync(FACILITY_DB, 'utf8');
const fdb = JSON.parse(rawF.charCodeAt(0) === 0xFEFF ? rawF.slice(1) : rawF);

console.log('--- DATA GAP ANALYSIS ---');

// 1. Policy Gaps
const missingCitation = pdb.policies.filter(p => !p.zh.legal_citation || p.zh.legal_citation === '---' || p.zh.legal_citation === '').length;
const missingPillars = pdb.policies.filter(p => !p.zh.pore_space_rights && !p.zh.liability_transfer).length;

console.log('POLICY DATABASE:');
console.log(' - Missing Citation: ' + missingCitation + ' (' + (missingCitation/pdb.policies.length*100).toFixed(1) + '%)');
console.log(' - Missing Legal Pillars: ' + missingPillars + ' (' + (missingPillars/pdb.policies.length*100).toFixed(1) + '%)');

// 2. Facility Gaps
const defaultCoords = fdb.facilities.filter(f => {
  const c = f.zh?.coordinates || [0,0];
  return (c[0] === 35.86 || c[0] === 37.09 || c[0] === 0);
}).length;

const noPolicyLinks = fdb.facilities.filter(f => (f.zh?.relatedPolicies || []).length === 0).length;

console.log('\nFACILITY DATABASE:');
console.log(' - Vague Coordinates: ' + defaultCoords + ' (' + (defaultCoords/fdb.facilities.length*100).toFixed(1) + '%)');
console.log(' - Unlinked Facilities: ' + noPolicyLinks + ' (' + (noPolicyLinks/fdb.facilities.length*100).toFixed(1) + '%)');

// 3. Cross-Consistency
let deadRefs = 0;
fdb.facilities.forEach(f => {
  (f.zh?.relatedPolicies || []).forEach(ref => {
    if (!pdb.policies.find(p => p.id === ref)) deadRefs++;
  });
});
console.log('\nINTEGRITY:');
console.log(' - Dead Policy References: ' + deadRefs);