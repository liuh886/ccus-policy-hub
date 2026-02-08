import fs from 'fs';

const DB_PATH = './src/data/policy_database.json';
const db = JSON.parse(fs.readFileSync(DB_PATH, 'utf-8'));

const dataGaps = db.policies.filter(p => 
  !p.zh.liability_transfer || 
  p.zh.liability_transfer === "" || 
  p.spec.transfer_years === 0
);

console.log(`--- FIDELITY 4.0 GAP ANALYSIS ---`);
console.log(`Total Policies: ${db.policies.length}`);
console.log(`Policies with Liability Gaps: ${dataGaps.length}`);

if (dataGaps.length > 0) {
  console.log('\nTop 5 Priority Gaps to Fill:');
  dataGaps.slice(0, 5).forEach(g => console.log(` - ${g.id} (${g.zh.country})`));
}
