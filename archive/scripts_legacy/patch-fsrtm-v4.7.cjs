const fs = require('fs');
const DB_PATH = 'src/data/policy_database.json';
const db = JSON.parse(fs.readFileSync(DB_PATH, 'utf-8'));

// 定义 FSRTM 4.7 专家评分矩阵 (Sample set)
const fsrtmPatches = {
  "uk-ccus-vision": { incentive: 85, statutory: 90, liability: 75, mrv: 85, market: 80, index: 83 },
  "ca-ccus-itc": { incentive: 95, statutory: 70, liability: 60, mrv: 80, market: 70, index: 75 },
  "no-storage-regulations": { incentive: 50, statutory: 95, liability: 90, mrv: 95, market: 85, index: 83 },
  "au-safeguard-mechanism": { incentive: 70, statutory: 85, liability: 65, mrv: 90, market: 75, index: 77 },
  "california-lcfs": { incentive: 98, statutory: 80, liability: 70, mrv: 95, market: 90, index: 87 },
  "cn-ccer": { incentive: 60, statutory: 85, liability: 50, mrv: 90, market: 95, index: 76 }
};

db.policies.forEach(p => {
  const patch = fsrtmPatches[p.id];
  if (patch) {
    p.analysis = {
      incentive: { score: patch.incentive, label: "INCENTIVE" },
      statutory: { score: patch.statutory, label: "STATUTORY" },
      liability: { score: patch.liability, label: "LIABILITY" },
      mrv: { score: patch.mrv, label: "MRV" },
      market: { score: patch.market, label: "MARKET" }
    };
    p.plr_index = patch.index;
  } else if (!p.analysis || Object.keys(p.analysis).length === 0) {
    // 默认兜底分 (Bronze)
    p.analysis = {
      incentive: { score: 40 }, statutory: { score: 40 }, liability: { score: 40 }, mrv: { score: 40 }, market: { score: 40 }
    };
    p.plr_index = 40;
  }
});

fs.writeFileSync(DB_PATH, JSON.stringify(db, null, 2), 'utf-8');
console.log('✅ FSRTM 4.7 Matrix Alignment Complete for core policies.');
