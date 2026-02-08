import fs from 'fs';

const DB_PATH = './src/data/policy_database.json';
const db = JSON.parse(fs.readFileSync(DB_PATH, 'utf-8'));

// 1. Brazil Consolidation
const brBillId = 'br-bill-1425-2022';
const brLawId = 'br-fuels-future-2024';
const brBillIdx = db.policies.findIndex(p => p.id === brBillId);
if (brBillIdx !== -1) {
  db.policies.splice(brBillIdx, 1);
  console.log(`🗑️ Consolidated Brazil draft into final law: ${brBillId}`);
}

// 2. PBOC CERF Update
const pbocIdx = db.policies.findIndex(p => p.id === 'cn-pboc-cerf');
if (pbocIdx !== -1) {
  db.policies[pbocIdx].zh.description = "由中国人民银行设立，向金融机构提供 1.75% 的低息再贷款资金以定向支持 CCUS 等项目。该工具已确认延续实施至 2027 年末，是目前中国 CCUS 项目最主要的低成本融资渠道。";
  db.policies[pbocIdx].en.description = "The PBOC CERF provides 1.75% low-cost re-lending funds for CCUS projects. It has been officially extended to the end of 2027, serving as a primary green finance pillar in China.";
  db.policies[pbocIdx].zh.plr_index = 85;
  db.policies[pbocIdx].en.plr_index = 85;
  console.log('✅ Updated PBOC CERF: Extension to 2027 and PLR Index corrected.');
}

// 3. UAE Law Upgrade
const uaeIdx = db.policies.findIndex(p => p.id === 'ae-carbon-strategy');
if (uaeIdx !== -1) {
  db.policies[uaeIdx].id = 'ae-federal-decree-11-2024';
  db.policies[uaeIdx].zh.title = "阿联酋联邦第 11/2024 号法令 (气候变化影响减少法)";
  db.policies[uaeIdx].en.title = "UAE Federal Decree-Law No. 11 of 2024";
  db.policies[uaeIdx].zh.description = "阿联酋 2024 年颁布的最高层气候法律，于 2025 年 5 月起实施。法律强制要求重点企业进行排放监测，并正式将 CCUS 确立为国家减排和实现净零排放的法定路径。";
  db.policies[uaeIdx].en.description = "The supreme climate law of UAE enacted in 2024. It mandates emissions monitoring and formally establishes CCUS as a statutory pathway for achieving national net-zero goals.";
  db.policies[uaeIdx].zh.legal_citation = "Federal Decree-Law No. 11 of 2024";
  db.policies[uaeIdx].en.legal_citation = "Federal Decree-Law No. 11 of 2024";
  console.log('✅ Upgraded UAE strategy to Federal Decree Law.');
}

// 4. Sector Inheritance Fix (Final Sweep)
db.policies.forEach(p => {
  if (!p.sectors || p.sectors.length === 0) p.sectors = ["Cross-cutting"];
  if (p.zh.plr_index === 0 && p.plr_index !== 0) p.zh.plr_index = p.plr_index;
});

fs.writeFileSync(DB_PATH, JSON.stringify(db, null, 2), 'utf-8');
console.log('✅ Statutory Realignment Complete.');
