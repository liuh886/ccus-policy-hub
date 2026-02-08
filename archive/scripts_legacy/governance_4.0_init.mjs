import fs from 'fs';

const DB_PATH = './src/data/policy_database.json';
const db = JSON.parse(fs.readFileSync(DB_PATH, 'utf-8'));

// Helper to normalize text to scores
function detectScore(text, keywords) {
  let score = 50; // Base score
  keywords.high.forEach(k => { if (text.includes(k)) score += 15; });
  keywords.low.forEach(k => { if (text.includes(k)) score -= 15; });
  return Math.min(Math.max(score, 0), 100);
}

db.policies = db.policies.map(p => {
  const desc = (p.zh.description + p.en.description + (p.zh.liability_transfer || "")).toLowerCase();
  
  // 1. Structural Logic for Radar Chart
  p.analysis = {
    incentive: detectScore(desc, { high: ['tax', 'credit', 'grant', 'subsidy', '补贴', '退税'], low: ['target', 'vision', '愿景', '目标'] }),
    statutory: detectScore(desc, { high: ['act', 'law', 'decree', '法', '令', '强制'], low: ['roadmap', 'guidance', '指南', '路线图'] }),
    liability: detectScore(desc, { high: ['transfer', 'years', 'state', '转移', '政府承担'], low: ['operator', 'permanent', '运营者承担'] }),
    mrv: p.mrv_rigor ? p.mrv_rigor * 20 : 60,
    market: detectScore(desc, { high: ['market', 'cross-border', 'credit', 'trading', '市场', '跨境'], low: ['domestic', 'internal', '国内'] })
  };

  // 2. Standardized Specs for Comparison
  p.spec = {
    pore_space: desc.includes('state') || desc.includes('国家所有') ? 'State' : (desc.includes('private') || desc.includes('私人') ? 'Private' : 'Mixed'),
    transfer_years: parseInt(p.zh.liability_period_years) || (desc.includes('20') ? 20 : 0),
    mrv_type: desc.includes('iso') ? 'ISO' : 'Domestic',
    funding_type: p.zh.category === '经济激励' ? 'Direct' : 'Policy-driven'
  };

  return p;
});

fs.writeFileSync(DB_PATH, JSON.stringify(db, null, 2), 'utf-8');
console.log('✅ Fidelity 4.0: All 82 policies initialized with radar scores and standardized specs.');
