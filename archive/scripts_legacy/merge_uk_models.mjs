import fs from 'fs';

const DB_PATH = './src/data/policy_database.json';
const db = JSON.parse(fs.readFileSync(DB_PATH, 'utf-8'));

// Find and merge the UK models
const targetId = 'uk-ccfd-model';
const duplicateId = 'uk-icc-business-model-2024';

const targetIdx = db.policies.findIndex(p => p.id === targetId);
const duplicateIdx = db.policies.findIndex(p => p.id === duplicateId);

if (targetIdx !== -1 && duplicateIdx !== -1) {
  // Merge info into the primary record
  db.policies[targetIdx].zh.title = "英国工业碳捕集 (ICC) 业务模式与收入支持框架";
  db.policies[targetIdx].en.title = "UK Industrial Carbon Capture (ICC) Business Model";
  db.policies[targetIdx].zh.description = "英国政府 2024 年定稿的工业捕集商业合同标准。通过长达 15 年的‘可变收入支持’（基于 CCfD 差额合约逻辑），解决了工业捕集项目在碳价波动下的盈利难题，是目前全球最具实操性的工业 CCS 融资激励模板。";
  db.policies[targetIdx].id = "uk-icc-business-model"; // Rename to a more standard ID
  
  // Remove the duplicate
  db.policies.splice(duplicateIdx, 1);
  console.log('✅ Merged UK ICC/CCfD models into a single high-fidelity record.');
}

fs.writeFileSync(DB_PATH, JSON.stringify(db, null, 2), 'utf-8');
