const fs = require('fs');
const DB_PATH = 'src/data/policy_database.json';

let rawData = fs.readFileSync(DB_PATH, 'utf8');
if (rawData.charCodeAt(0) === 0xFEFF) rawData = rawData.slice(1);
const db = JSON.parse(rawData);

// 升级版数据库结构
const newPolicies = db.policies.map(p => {
  const zh = p.zh || {};
  const en = p.en || {};
  const analysis = p.analysis || {};

  // 1. 忠实度自动评级 (Fidelity Calculation)
  let score = 0;
  if (zh.legal_citation && zh.legal_citation !== '---') score += 30;
  if (zh.pore_space_rights) score += 20;
  if (zh.liability_transfer) score += 20;
  if (Math.max(...Object.values(analysis)) > 0) score += 30;
  
  let fidelity = 'Bronze';
  if (score >= 90) fidelity = 'Diamond';
  else if (score >= 50) fidelity = 'Gold';

  // 2. 法理对象化 (Citation Object)
  const citationObj = {
    text: zh.legal_citation || en.legal_citation || null,
    link: zh.legal_citation_ref || en.legal_citation_ref || null,
    type: (zh.category === '法律监管' || zh.category === 'Legal & Regulatory') ? 'Statute' : 'Guidance'
  };

  // 3. FSRTM 证据链槽位 (Evidence Slots)
  const enhancedAnalysis = {};
  Object.keys(analysis).forEach(k => {
    enhancedAnalysis[k] = {
      score: analysis[k],
      evidence: null // 待 AI 回填
    };
  });

  // 4. 关键参数结构化尝试
  let liabilityYears = null;
  const transferText = zh.liability_transfer || "";
  const yearMatch = transferText.match(/(\d+)\s*年/);
  if (yearMatch) liabilityYears = parseInt(yearMatch[1]);

  return {
    id: p.id,
    metadata: {
      fidelity: fidelity,
      last_verified: new Date().toISOString().split('T')[0]
    },
    zh: {
      ...zh,
      legal_citation: citationObj, // 替换旧字段
      liability_years: liabilityYears
    },
    en: {
      ...en,
      legal_citation: citationObj,
      liability_years: liabilityYears
    },
    analysis: enhancedAnalysis, // 替换旧分析对象
    // 保留原始字段用于回退（可选）
    _legacy_analysis: p.analysis 
  };
});

const newDB = {
  version: "4.0-Structured",
  lastUpdated: new Date().toISOString(),
  policies: newPolicies
};

fs.writeFileSync(DB_PATH, JSON.stringify(newDB, null, 2), 'utf8');
console.log(`🚀 数据库 2.0 架构升级完成！`);
console.log(`💎 钻石级政策: ${newPolicies.filter(p => p.metadata.fidelity === 'Diamond').length}`);
console.log(`🥇 黄金级政策: ${newPolicies.filter(p => p.metadata.fidelity === 'Gold').length}`);
console.log(`🥉 青铜级政策: ${newPolicies.filter(p => p.metadata.fidelity === 'Bronze').length}`);
