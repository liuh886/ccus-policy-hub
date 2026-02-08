const fs = require('fs');
const DB_PATH = 'src/data/policy_database.json';
const db = JSON.parse(fs.readFileSync(DB_PATH, 'utf8'));

const diamondScores = {
  "us-45q-ira": { incentive: 95, statutory: 85, liability: 80, mrv: 90, market: 85, index: 92 },
  "eu-nzia": { incentive: 60, statutory: 90, liability: 70, mrv: 85, market: 95, index: 88 },
  "cn-national-standards": { incentive: 40, statutory: 95, liability: 60, mrv: 80, market: 50, index: 75 }
};

db.policies.forEach(p => {
  if (diamondScores[p.id]) {
    const s = diamondScores[p.id];
    p.analysis = {
      incentive: { score: s.incentive },
      statutory: { score: s.statutory },
      liability: { score: s.liability },
      mrv: { score: s.mrv },
      market: { score: s.market }
    };
    p.plr_index = s.index;
  }
});

fs.writeFileSync(DB_PATH, JSON.stringify(db, null, 2), 'utf8');
console.log('✅ Diamond scores re-injected for US, EU, and China.');