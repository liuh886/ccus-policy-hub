import fs from 'fs';

const DB_PATH = './src/data/policy_database.json';
const db = JSON.parse(fs.readFileSync(DB_PATH, 'utf-8'));

// 1. Remove the hallucinated/slang entry
const badId = 'cn-esg3.0-dmrv-2024';
const badIdx = db.policies.findIndex(p => p.id === badId);
if (badIdx !== -1) {
  db.policies.splice(badIdx, 1);
  console.log(`🗑️ Removed informal entry: ${badId}`);
}

// 2. Add the ACTUAL Statutory Pillars for China 2024
const realChinaPolicies = [
  {
    "id": "cn-mof-sustainability-2024",
    "zh": {
      "title": "中国企业可持续披露准则——基本准则 (2024)",
      "country": "中国",
      "year": 2024,
      "status": "Active",
      "category": "财务准则",
      "tags": ["CSDS", "国家基准", "披露义务"],
      "description": "财政部 2024 年发布的中国版可持续披露准则。该准则对接 ISSB 国际标准，确立了中国企业环境信息披露的法理框架，强制要求披露气候相关风险（含 CCUS 资产）的财务影响。",
      "pubDate": "2024-05-27",
      "url": "http://kjs.mof.gov.cn/zhengcefabu/202405/t20240527_3936123.htm",
      "source": "中华人民共和国财政部",
      "plr_index": 95,
      "sectors": ["Cross-cutting", "Finance"],
      "mrv_rigor": 5
    },
    "en": {
      "title": "China Corporate Sustainability Disclosure Standards (CSDS)",
      "country": "China",
      "year": 2024,
      "status": "Active",
      "category": "Financial Standard",
      "tags": ["ESG", "National Baseline", "Disclosure"],
      "description": "The foundational standard for sustainability reporting in China issued by the Ministry of Finance. It aligns with ISSB to mandate the disclosure of climate-related financial risks and the impact of CCUS activities.",
      "pubDate": "2024-05-27",
      "url": "http://kjs.mof.gov.cn/",
      "plr_index": 95
    }
  },
  {
    "id": "cn-exchange-esg-2024",
    "zh": {
      "title": "上市公司可持续发展报告指引 (沪深北三大交易所)",
      "country": "中国",
      "year": 2024,
      "status": "Active",
      "category": "法律监管",
      "tags": ["强制披露", "资本市场", "温室气体"],
      "description": "2024 年 5 月起正式实施。要求包含上证 180、深证 100 等在内的头部企业强制披露温室气体排放数据。指引明确了 CCS 减排量的核算逻辑，是国内 CCUS 项目进入资本市场估值的核心门槛。",
      "pubDate": "2024-04-12",
      "url": "http://www.sse.com.cn/lawandrules/sserules/main/listing/stock/c/c_10734111.shtml",
      "source": "沪深北三大交易所",
      "plr_index": 92,
      "sectors": ["Power", "Industrial", "Steel"],
      "mrv_rigor": 4
    },
    "en": {
      "title": "Guidelines on Sustainability Reporting for Listed Companies",
      "country": "China",
      "year": 2024,
      "status": "Active",
      "category": "Legal & Regulatory",
      "tags": ["Mandatory", "Stock Exchange", "GHG Reporting"],
      "description": "The first mandatory ESG reporting rules for major Chinese listed companies (SSE, SZSE, BSE). It requires detailed GHG emissions accounting, providing the regulatory basis for CCUS-related financial disclosures.",
      "pubDate": "2024-04-12",
      "url": "http://www.sse.com.cn/",
      "plr_index": 92
    }
  }
];

realChinaPolicies.forEach(np => {
  const idx = db.policies.findIndex(p => p.id === np.id);
  if (idx !== -1) db.policies[idx] = { ...db.policies[idx], ...np };
  else db.policies.push(np);
});

fs.writeFileSync(DB_PATH, JSON.stringify(db, null, 2), 'utf-8');
console.log('✅ Hallucinations purged. Statutory China 2024 pillars installed with deep URLs.');
