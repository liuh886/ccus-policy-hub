import fs from 'fs';

const DB_PATH = './src/data/policy_database.json';
const db = JSON.parse(fs.readFileSync(DB_PATH, 'utf-8'));

const newPolicies = [
  {
    "id": "icao-corsia-lca-2024",
    "zh": {
      "title": "ICAO CORSIA 生命周期评估方法学 (2024版)",
      "country": "国际",
      "year": 2024,
      "status": "Active",
      "category": "行业标准",
      "tags": ["航空脱碳", "SAF", "CCS 抵扣"],
      "description": "国际民航组织 (ICAO) 2024 年发布的最新指南。方法学正式确立了地质封存 (CCS) 在航空燃料减排中的贡献核算规则，并更新了 SAF 的生命周期排放因子。这是全球航司利用捕集技术履行 CORSIA 减排义务的财务与技术基准。",
      "pubDate": "2024-03-01",
      "url": "https://www.icao.int/environmental-protection/CORSIA/Pages/CORSIA-Eligible-Fuels.aspx",
      "source": "International Civil Aviation Organization",
      "plr_index": 92,
      "sectors": ["Aviation", "Biofuels", "DAC"],
      "mrv_rigor": 5,
      "legal_citation": "ICAO Document 07 - Methodology for Actual Life Cycle Emissions"
    },
    "en": {
      "title": "ICAO CORSIA LCA Methodology (2024 Edition)",
      "country": "International",
      "year": 2024,
      "status": "Active",
      "category": "Technical Standards",
      "tags": ["Aviation", "CORSIA", "SAF"],
      "description": "Updated in 2024, this methodology provides the rules for calculating emissions reductions from CCS and CCU within the aviation sector. It is the core framework for airlines to claim credits via SAF and carbon removal technologies.",
      "pubDate": "2024-03-01",
      "url": "https://www.icao.int/",
      "plr_index": 92,
      "legal_citation": "ICAO CORSIA Doc 07"
    }
  },
  {
    "id": "us-doe-netl-bpm-2023",
    "zh": {
      "title": "美国 DOE NETL 地质封存最佳实践手册 (BPM)",
      "country": "美国",
      "year": 2023,
      "status": "Active",
      "category": "技术导则",
      "tags": ["工业标准", "风险管理", "MVA"],
      "description": "由美国能源部 (DOE) 国家能量技术实验室 (NETL) 发布。虽然其核心手册于 2017 年定稿，但在 2023 年《碳管理战略》中进行了现代工程适配。它定义了封存项目风险评估、监测(MVA)及公众沟通的全球最高工业标准，是申请 EPA 许可的底层技术支撑。",
      "pubDate": "2023-04-01",
      "url": "https://netl.doe.gov/carbon-management/carbon-storage/best-practices-manuals",
      "source": "US DOE / NETL",
      "plr_index": 85,
      "sectors": ["Storage", "Industrial"],
      "mrv_rigor": 5,
      "legal_citation": "NETL-BPM Series"
    },
    "en": {
      "title": "US DOE NETL Best Practice Manuals for Carbon Storage",
      "country": "USA",
      "year": 2023,
      "status": "Active",
      "category": "Technical Guidelines",
      "tags": ["Risk Management", "Monitoring", "Engineering"],
      "description": "The technical 'gold standard' for CCS projects globally. Updated via DOE's 2023 Carbon Management Strategy, these manuals provide the engineering framework for site characterization, monitoring (MVA), and operational safety.",
      "pubDate": "2023-04-01",
      "url": "https://netl.doe.gov/",
      "plr_index": 85,
      "legal_citation": "NETL Best Practices"
    }
  }
];

// Deduplication & Sync
newPolicies.forEach(np => {
  const idx = db.policies.findIndex(p => p.id === np.id);
  if (idx !== -1) db.policies[idx] = { ...db.policies[idx], ...np };
  else db.policies.push(np);
});

fs.writeFileSync(DB_PATH, JSON.stringify(db, null, 2), 'utf-8');
console.log('✅ Aviation & Engineering Standards (ICAO CORSIA, US DOE NETL) synced to JSON.');
