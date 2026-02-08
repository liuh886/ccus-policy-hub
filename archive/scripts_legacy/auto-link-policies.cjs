const fs = require('fs');

const POLICY_DB = 'src/data/policy_database.json';
const FACILITY_DB = 'src/data/facility_database.json';

const pdb = JSON.parse(fs.readFileSync(POLICY_DB, 'utf8'));
const fdb = JSON.parse(fs.readFileSync(FACILITY_DB, 'utf8'));

let linkCount = 0;

fdb.facilities.forEach(f => {
  const fCountry = (f.en?.country || f.zh?.country || "").trim();
  const fSector = (f.en?.sector || f.zh?.sector || "").trim().toLowerCase();
  
  const related = new Set();

  pdb.policies.forEach(p => {
    const pCountry = p.zh.country;
    const pEnCountry = p.en.country;
    const pTags = (p.zh.tags || []).map(t => t.toLowerCase());
    const pSectors = (p.zh.sectors || []).map(s => s.toLowerCase());

    // 逻辑 1: 国家必须匹配 (支持中英文匹配)
    const countryMatch = (fCountry === pCountry || fCountry === pEnCountry || 
                         (fCountry === "United States" && pCountry === "美国") ||
                         (fCountry === "China" && pCountry === "中国"));

    if (countryMatch) {
      // 逻辑 2: 行业匹配 或 通用政策
      const sectorMatch = pSectors.includes(fSector) || pTags.includes(fSector);
      const isGeneral = p.zh.category === "法律监管" || p.zh.category === "战略引导";

      if (sectorMatch || isGeneral) {
        related.add(p.id);
      }
    }
    
    // 逻辑 3: 国际标准 (ISO) 自动关联所有
    if (p.id.startsWith('iso-')) {
      related.add(p.id);
    }
  });

  const links = Array.from(related);
  if (f.zh) f.zh.relatedPolicies = links;
  if (f.en) f.en.relatedPolicies = links;
  linkCount += links.length;
});

fs.writeFileSync(FACILITY_DB, JSON.stringify(fdb, null, 2), 'utf8');
console.log(`✅ 设施-政策大联网完成：建立了 ${linkCount} 条关联关系。`);
