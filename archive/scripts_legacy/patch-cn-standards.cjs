const fs = require('fs');
const DB_PATH = 'src/data/policy_database.json';
const db = JSON.parse(fs.readFileSync(DB_PATH, 'utf-8'));

db.policies.forEach(p => {
  if (p.id === 'cn-national-standards') {
    p.analysis = {
      incentive: { score: 45, label: "INCENTIVE" },
      statutory: { score: 95, label: "STATUTORY" },
      liability: { score: 65, label: "LIABILITY" },
      mrv: { score: 85, label: "MRV" },
      market: { score: 50, label: "MARKET" }
    };
    p.plr_index = 72;
  }
});

fs.writeFileSync(DB_PATH, JSON.stringify(db, null, 2), 'utf-8');
console.log('✅ China National Standards calibrated.');
