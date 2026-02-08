import fs from 'fs';

const DB_PATH = './src/data/policy_database.json';
const db = JSON.parse(fs.readFileSync(DB_PATH, 'utf-8'));

const newPolicies = [
  {
    "id": "imo-igc-code-2024",
    "zh": {
      "title": "IMO IGC 规则修正案 (液化 CO2 运输船标准)",
      "country": "国际",
      "year": 2024,
      "status": "Active",
      "category": "行业标准",
      "tags": ["海运安全", "跨境运输", "LCO2 载运"],
      "description": "国际海事组织 (IMO) 针对液化 CO2 大宗运输制定的关键修正案。规则定义了 LCO2 运输船的构造标准，重点在于压力热力学控制和杂质管理（防水、防硫腐蚀），是全球跨境碳航运价值链的技术基石。",
      "pubDate": "2024-05-01",
      "url": "https://www.imo.org/",
      "source": "International Maritime Organization",
      "plr_index": 88,
      "sectors": ["Shipping", "Storage"],
      "mrv_rigor": 5,
      "legal_citation": "IGC Code Chapter 17/18 Amendments"
    },
    "en": {
      "title": "IMO IGC Code Amendments for LCO2 Carriers",
      "country": "International",
      "year": 2024,
      "status": "Active",
      "category": "Technical Standards",
      "tags": ["Maritime", "Transboundary", "LCO2"],
      "description": "The mandatory technical framework by IMO for the construction and equipment of ships carrying liquefied CO2 in bulk. It addresses thermodynamic safety, impurity management, and corrosion prevention for cross-border CCS.",
      "pubDate": "2024-05-01",
      "url": "https://www.imo.org/",
      "plr_index": 88,
      "legal_citation": "IMO IGC Code"
    }
  },
  {
    "id": "icvcm-ccp-labels-2024",
    "zh": {
      "title": "IC-VCM 核心碳原则 (CCP) 针对 CCS 的专项标签",
      "country": "国际",
      "year": 2024,
      "status": "Active",
      "category": "市场机制",
      "tags": ["自愿碳市场", "高诚信标签", "CDR 认证"],
      "description": "诚信自愿碳市场委员会 (IC-VCM) 发布的高诚信标准。2024 年确立了针对技术类碳去除（DAC, BECCS）的 CCP 标签准则，只有符合其严苛 MRV 和永久性要求的 CCS 项目才能获得 CCP 标签并享受市场溢价。",
      "pubDate": "2024-06-01",
      "url": "https://icvcm.org/the-core-carbon-principles/",
      "source": "Integrity Council for the Voluntary Carbon Market",
      "plr_index": 90,
      "sectors": ["DAC", "BECCS", "Finance"],
      "mrv_rigor": 5
    },
    "en": {
      "title": "IC-VCM Core Carbon Principles (CCP) for CCUS",
      "country": "International",
      "year": 2024,
      "status": "Active",
      "category": "Market Mechanism",
      "tags": ["VCM", "High-Integrity", "CDR"],
      "description": "The definitive quality benchmark for the voluntary carbon market. In 2024, IC-VCM integrated tech-based CCS/CDR into its CCP labeling framework to ensure high environmental integrity and permanent sequestration.",
      "pubDate": "2024-06-01",
      "url": "https://icvcm.org/",
      "plr_index": 90
    }
  },
  {
    "id": "jp-jcm-ccs-methodology-2024",
    "zh": {
      "title": "日本 JCM 跨境 CCS 减排量核算指南",
      "country": "日本",
      "year": 2024,
      "status": "Active",
      "category": "市场机制",
      "tags": ["JCM 机制", "跨境核算", "印尼合作"],
      "description": "日本 2024 年 12 月发布的双边抵消机制 (JCM) 专项指南。这是全球首个成熟的跨国 CCS 信用分配体系，解决了日本捕集并在印尼等国封存的 CO2 如何核算、监测及抵抵减排放额度的法律技术问题。",
      "pubDate": "2024-12-10",
      "url": "https://www.jcm.go.jp/",
      "source": "日本环境省 / 经济产业省",
      "plr_index": 86,
      "sectors": ["Cross-cutting", "Storage"],
      "mrv_rigor": 5,
      "legal_citation": "JCM Guidelines for CCS/CCUS"
    },
    "en": {
      "title": "Japan JCM Cross-border CCS Accounting Guidelines",
      "country": "Japan",
      "year": 2024,
      "status": "Active",
      "category": "Market Mechanism",
      "tags": ["JCM", "Cross-border", "Bilateral"],
      "description": "The world's first operational bilateral framework for CCS credit allocation, finalized in 2024. It governs how CO2 captured in Japan and stored in partner countries (e.g., Indonesia) is quantified and credited.",
      "pubDate": "2024-12-10",
      "url": "https://www.jcm.go.jp/",
      "plr_index": 86,
      "legal_citation": "JCM CCS Methodology"
    }
  },
  {
    "id": "au-sea-dumping-act-2024",
    "zh": {
      "title": "澳大利亚海上倾倒修正案 (CO2 封存许可证)",
      "country": "澳大利亚",
      "year": 2024,
      "status": "Active",
      "category": "法律监管",
      "tags": ["伦敦议定书落地", "出口许可", "海域封存"],
      "description": "2024 年 11 月生效的里程碑法律。它将《伦敦议定书》2009 修正案转化为国内法，允许澳大利亚颁发“CO2 出口许可证”，合法化了跨境海运 CO2 进行亚海床地质封存的行政程序。",
      "pubDate": "2024-11-07",
      "url": "https://www.aph.gov.au/",
      "source": "澳大利亚联邦议会",
      "plr_index": 89,
      "sectors": ["Storage", "Shipping"],
      "mrv_rigor": 4,
      "legal_citation": "Environment Protection (Sea Dumping) Amendment Act 2024"
    },
    "en": {
      "title": "Australia Sea Dumping Amendment (CO2 Export License)",
      "country": "Australia",
      "year": 2024,
      "status": "Active",
      "category": "Legal & Regulatory",
      "tags": ["London Protocol", "Export License", "Offshore"],
      "description": "Enacted in Nov 2024, this act implements the London Protocol 2009 amendment domestically, enabling permits for the export of CO2 streams for sub-seabed geological sequestration.",
      "pubDate": "2024-11-07",
      "url": "https://www.aph.gov.au/",
      "plr_index": 89,
      "legal_citation": "Sea Dumping Act 2024"
    }
  },
  {
    "id": "br-fuels-future-2024",
    "zh": {
      "title": "巴西未来燃料法案 (CCUS 监管框架)",
      "country": "巴西",
      "year": 2024,
      "status": "Active",
      "category": "法律监管",
      "tags": ["BECCS", "乙醇耦合", "30年授权期"],
      "description": "巴西 2024 年 10 月颁布的第 14,993 号联邦法律。该法案确立了巴西首个 CCUS 监管体系，规定封存授权期为 30 年，并重点支持生物质碳捕集与封存 (BECCS) 与其庞大的生物燃料产业耦合。",
      "pubDate": "2024-10-08",
      "url": "https://www.gov.br/planalto/pcimo/legislacao/leis/2024/lei-no-14-993-de-8-de-outubro-de-2024",
      "source": "巴西总统府",
      "plr_index": 82,
      "sectors": ["BECCS", "Biofuels", "Oil & Gas"],
      "mrv_rigor": 4,
      "legal_citation": "Federal Law No. 14,993/2024"
    },
    "en": {
      "title": "Brazil Fuels of the Future Act (CCS Framework)",
      "country": "Brazil",
      "year": 2024,
      "status": "Active",
      "category": "Legal & Regulatory",
      "tags": ["BECCS", "Biofuels", "30-year Permit"],
      "description": "Enacted in Oct 2024, this law provides Brazil's first CCS legal framework. It mandates ANP as the regulator and emphasizes the integration of BECCS within the ethanol and SAF sectors.",
      "pubDate": "2024-10-08",
      "url": "https://www.gov.br/",
      "plr_index": 82,
      "legal_citation": "Law 14,993/2024"
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
console.log('✅ Ultimate Frontiers (IMO, IC-VCM, Japan JCM, AU Sea Dumping, Brazil) synced to JSON.');
