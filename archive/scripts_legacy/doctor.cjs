const fs = require('fs');
const DB_PATH = 'src/data/policy_database.json';
const FAC_PATH = 'src/data/facility_database.json';

const db = JSON.parse(fs.readFileSync(DB_PATH, 'utf-8'));
const fac = JSON.parse(fs.readFileSync(FAC_PATH, 'utf-8'));

console.log('--- Central Health Audit ---');

const policies = db.policies;
const facilities = fac.facilities;

// 1. 坐标与字段检查
let zeroCoords = 0;
facilities.forEach(f => {
  if (!f.coordinates || f.coordinates[0] === 0) zeroCoords++;
});
console.log(`ℹ️ Facilities missing coordinates: ${zeroCoords}`);

// 2. 核心政策评分检查
const coreIds = ['us-45q-ira', 'eu-nzia', 'cn-national-standards'];
coreIds.forEach(id => {
  const p = policies.find(x => x.id === id);
  if (!p || !p.analysis || p.analysis.incentive?.score === 40) {
    console.warn(`⚠️ Warning: Core policy ${id} still has default/missing scores!`);
  } else {
    console.log(`✅ ${id} score calibrated.`);
  }
});

console.log('--- Audit Done ---');