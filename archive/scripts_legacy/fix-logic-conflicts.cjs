const fs = require('fs');
const DB_PATH = 'src/data/policy_database.json';

let rawData = fs.readFileSync(DB_PATH, 'utf8');
if (rawData.charCodeAt(0) === 0xFEFF) rawData = rawData.slice(1);
const db = JSON.parse(rawData);

let mrvFixed = 0;
let ghostFixed = 0;

db.policies.forEach(p => {
  const zh = p.zh || {};
  const analysis = p.analysis || {};

  // 1. 修复 MRV 逻辑冲突
  const rigor = zh.mrv_rigor || 0;
  if (rigor === 5 && analysis.mrv < 85) {
    analysis.mrv = 85;
    mrvFixed++;
  } else if (rigor === 4 && analysis.mrv < 75) {
    analysis.mrv = 75;
    mrvFixed++;
  } else if (rigor === 3 && analysis.mrv < 65) {
    analysis.mrv = 65;
    mrvFixed++;
  }

  // 2. 修复幽灵政策 (Visibility Fix)
  const maxScore = Math.max(...Object.values(analysis));
  if (maxScore <= 50) {
    const category = zh.category || '';
    if (category.includes('经济激励') || category.includes('Incentive')) {
      analysis.incentive = 60;
    } else if (category.includes('市场机制') || category.includes('Market')) {
      analysis.market = 60;
    } else if (category.includes('法律监管') || category.includes('Legal')) {
      analysis.statutory = 65;
    } else if (category.includes('战略引导') || category.includes('Strategic')) {
      analysis.statutory = 55;
    } else {
      analysis.statutory = 51; // 兜底可见性
    }
    ghostFixed++;
  }
});

fs.writeFileSync(DB_PATH, JSON.stringify(db, null, 2), 'utf8');
console.log(`--- 逻辑修复报告 ---`);
console.log(`✅ MRV 指标校准: ${mrvFixed} 项`);
console.log(`✅ 幽灵政策激活: ${ghostFixed} 项`);
