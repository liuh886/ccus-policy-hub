import fs from 'fs';

const DB_PATH = './src/data/policy_database.json';
const db = JSON.parse(fs.readFileSync(DB_PATH, 'utf-8'));

const newPolicies = [
  {
    "id": "kr-ccus-enforcement-2025",
    "zh": {
      "title": "韩国 CCUS 法施行令 (2025)",
      "country": "韩国",
      "year": 2025,
      "status": "Active",
      "category": "法律监管",
      "tags": ["政府补贴", "废弃物豁免", "工业生态"],
      "description": "2025 年 2 月生效的配套施行令。该政策确立了 CCUS 创新补助金制度，并正式豁免捕获的 CO2 作为‘废弃物’的法律定义，极大简化了 CCU 产品的市场准入程序。",
      "pubDate": "2025-02-06",
      "url": "https://www.kimchang.com/",
      "source": "韩国产业通商资源部",
      "plr_index": 88,
      "sectors": ["Industrial", "Steel", "Chemicals"],
      "mrv_rigor": 4
    },
    "en": {
      "title": "South Korea CCUS Act Enforcement Decree",
      "country": "South Korea",
      "year": 2025,
      "status": "Active",
      "category": "Legal & Regulatory",
      "tags": ["Incentives", "Waste Exemption", "Cluster"],
      "description": "Effective Feb 2025, this decree provides the operational framework for CCUS innovation grants and exempts captured CO2 from waste management regulations, fostering a CCU-based circular economy.",
      "pubDate": "2025-02-06",
      "url": "https://www.motie.go.kr/",
      "plr_index": 88
    }
  },
  {
    "id": "vn-pdp8-ccs-2024",
    "zh": {
      "title": "越南 PDP8 电力规划 (CCS 转型条款)",
      "country": "越南",
      "year": 2024,
      "status": "Active",
      "category": "战略引导",
      "tags": ["煤电转型", "东南亚枢纽", "刚性关停"],
      "description": "越南 2024 年发布的电力发展路线图。强制要求运行超 20 年的煤电厂必须评估 CCS 改造，并明确了到 2050 年实现 25GW 煤电产能向零碳/CCS 转型的具体时间表。",
      "pubDate": "2024-04-01",
      "url": "https://vietnam-briefing.com/",
      "source": "越南工贸部",
      "plr_index": 82,
      "sectors": ["Power"],
      "mrv_rigor": 3
    },
    "en": {
      "title": "Vietnam PDP8 Implementation Roadmap (CCS Mandate)",
      "country": "Vietnam",
      "year": 2024,
      "status": "Active",
      "category": "Strategic Guiding",
      "tags": ["Coal Transition", "Energy Security", "Mandatory"],
      "description": "Vietnam's Power Development Plan 8 mandates coal-fired plants older than 20 years to explore CCS conversion, with a roadmap to convert 25.8 GW of capacity by 2050.",
      "pubDate": "2024-04-01",
      "url": "https://www.moit.gov.vn/",
      "plr_index": 82
    }
  },
  {
    "id": "eu-taxonomy-ccs-2024",
    "zh": {
      "title": "欧盟可持续分类法 (2024 CCS 技术筛选标准)",
      "country": "欧盟",
      "year": 2024,
      "status": "Active",
      "category": "财务准则",
      "tags": ["绿色金融", "技术筛选", "投资标准"],
      "description": "根据授权条例 (EU) 2023/2485 更新。明确将 CCS 定义为‘过渡性绿色活动’，规定了严苛的生命周期减排阈值，只有符合该标准的项目才能获得欧盟范围内的绿色信贷和债券支持。",
      "pubDate": "2024-01-01",
      "url": "https://ec.europa.eu/finance/taxonomy/",
      "source": "European Commission",
      "plr_index": 94,
      "sectors": ["Finance", "Industrial", "Power"],
      "mrv_rigor": 5
    },
    "en": {
      "title": "EU Taxonomy Technical Screening Criteria for CCS",
      "country": "EU",
      "year": 2024,
      "status": "Active",
      "category": "Financial Standard",
      "tags": ["Green Finance", "Criteria", "Regulation"],
      "description": "Amended in 2024, this regulation defines the technical thresholds for CCS to be considered a 'sustainable economic activity', serving as the gateway for green investment across the EU.",
      "pubDate": "2024-01-01",
      "url": "https://ec.europa.eu/",
      "plr_index": 94
    }
  },
  {
    "id": "issb-ifrs-s2-ccs-2024",
    "zh": {
      "title": "ISSB IFRS S2 气候披露准则 (CCS 核算)",
      "country": "国际",
      "year": 2024,
      "status": "Active",
      "category": "财务准则",
      "tags": ["ESG 披露", "全球标准", "财务报告"],
      "description": "2024 年起生效的全球企业披露基准。要求企业必须在财务报表中独立披露其利用 CCS 实现净零目标的具体路径，并必须详细说明封存的永久性假设及验证方法。",
      "pubDate": "2024-01-01",
      "url": "https://www.ifrs.org/issued-standards/ifrs-sustainability-standards-navigator/ifrs-s2-climate-related-disclosures/",
      "source": "International Sustainability Standards Board",
      "plr_index": 95,
      "sectors": ["Cross-cutting", "Finance"],
      "mrv_rigor": 5
    },
    "en": {
      "title": "ISSB IFRS S2 - Carbon Capture Disclosures",
      "country": "International",
      "year": 2024,
      "status": "Active",
      "category": "Financial Standard",
      "tags": ["ESG", "Disclosure", "Reporting"],
      "description": "Mandatory from 2024, this global standard requires companies to separate nature-based from tech-based (CCS) removals in their climate disclosures and justify sequestration permanence.",
      "pubDate": "2024-01-01",
      "url": "https://www.ifrs.org/",
      "plr_index": 95
    }
  },
  {
    "id": "it-pniec-ccs-2024",
    "zh": {
      "title": "意大利国家能源与气候计划 (Ravenna CCS 专项)",
      "country": "意大利",
      "year": 2024,
      "status": "Active",
      "category": "战略引导",
      "tags": ["地中海枢纽", "重工业脱碳", "Eni-Snam"],
      "description": "意大利 2024 年更新的国家计划。确立了以拉文纳 (Ravenna) 为核心的地中海 CCS 集群，设定 2030 年封存目标为 400 万吨/年，并首次定义了针对水泥、钢铁行业的跨区域封存补贴模式。",
      "pubDate": "2024-06-30",
      "url": "https://www.ravennaccs.com/",
      "source": "意大利环境与能源安全部",
      "plr_index": 84,
      "sectors": ["Cement", "Steel", "Industrial"],
      "mrv_rigor": 4
    },
    "en": {
      "title": "Italy PNIEC 2024 Update (Ravenna CCS Hub)",
      "country": "Italy",
      "year": 2024,
      "status": "Active",
      "category": "Strategic Guiding",
      "tags": ["Mediterranean Hub", "Hard-to-abate", "Public-Private"],
      "description": "The 2024 update highlights the Ravenna hub as a strategic asset for Southern Europe, targeting 4 Mtpa of CO2 storage by 2030 for heavy industrial sectors.",
      "pubDate": "2024-06-30",
      "url": "https://www.mase.gov.it/",
      "plr_index": 84
    }
  },
  {
    "id": "eg-green-hydrogen-law-2024",
    "zh": {
      "title": "埃及第 2/2024 号法案 (绿氢与 CCUS 激励)",
      "country": "埃及",
      "year": 2024,
      "status": "Active",
      "category": "法律监管",
      "tags": ["投资返现", "蓝氢示范", "北非枢纽"],
      "description": "埃及 2024 年颁布的里程碑法律。为包含 CCUS 的氢能项目提供高达 55% 的现金退税及设备增值税免除，是目前非洲地区激励力度最大的 CCUS 商业化支持政策。",
      "pubDate": "2024-01-27",
      "url": "https://www.ammoniaenergy.org/",
      "source": "埃及总统府 / 财政部",
      "plr_index": 86,
      "sectors": ["Refining", "Chemicals", "Power"],
      "mrv_rigor": 3
    },
    "en": {
      "title": "Egypt Law No. 2 of 2024 (Hydrogen & CCUS Incentives)",
      "country": "Egypt",
      "year": 2024,
      "status": "Active",
      "category": "Legal & Regulatory",
      "tags": ["Tax Refund", "North Africa", "Investment"],
      "description": "Provides a massive 33-55% cash investment incentive for renewable hydrogen projects including those utilizing CCUS, positioning Egypt as a key decarbonization hub in the MENA region.",
      "pubDate": "2024-01-27",
      "url": "https://www.gov.eg/",
      "plr_index": 86
    }
  },
  {
    "id": "imo-mepc-lca-2024",
    "zh": {
      "title": "IMO 船用燃料 GHG 强度生命周期指南",
      "country": "国际",
      "year": 2024,
      "status": "Active",
      "category": "行业标准",
      "tags": ["海运脱碳", "WtW 核算", "e-fuels"],
      "description": "IMO 2024 年 3 月通过的决议 (MEPC.391(81))。该指南确立了‘从源头到尾气’的全生命周期核算体系，为 CCU 合成燃料及船舶捕集 (Onboard Capture) 的减排贡献核算提供了全球通用框架。",
      "pubDate": "2024-03-22",
      "url": "https://www.imo.org/en/OurWork/Environment/Pages/GHG-Emissions.aspx",
      "source": "International Maritime Organization",
      "plr_index": 90,
      "sectors": ["Shipping", "Chemicals"],
      "mrv_rigor": 5,
      "legal_citation": "Resolution MEPC.391(81)"
    },
    "en": {
      "title": "IMO Guidelines on Life Cycle GHG Intensity of Marine Fuels",
      "country": "International",
      "year": 2024,
      "status": "Active",
      "category": "Technical Standards",
      "tags": ["Maritime", "LCA", "Well-to-Wake"],
      "description": "Adopted in 2024, these guidelines provide the methodology for assessing Well-to-Wake GHG emissions, crucial for crediting CCU-derived synthetic marine fuels.",
      "pubDate": "2024-03-22",
      "url": "https://www.imo.org/",
      "plr_index": 90,
      "legal_citation": "Resolution MEPC.391(81)"
    }
  },
  {
    "id": "cn-esg3.0-dmrv-2024",
    "zh": {
      "title": "中国 ESG 3.0 披露体系 (含 CCUS 数字化 MRV)",
      "country": "中国",
      "year": 2024,
      "status": "Active",
      "category": "技术导则",
      "tags": ["dMRV", "区块链", "披露标准"],
      "description": "2024 年国内主流评级机构发布的进阶披露标准。核心是引入数字化监测、报告与核证 (dMRV)，规定了 CCUS 项目必须利用物联网和传感器进行数据实时存证，以符合 ISSB 国际审计标准。",
      "pubDate": "2024-05-15",
      "url": "https://www.china-briefing.com/",
      "source": "中诚信/中证指数等联合发布",
      "plr_index": 80,
      "sectors": ["Cross-cutting", "Finance"],
      "mrv_rigor": 5
    },
    "en": {
      "title": "China ESG 3.0 Reporting Framework (CCUS dMRV)",
      "country": "China",
      "year": 2024,
      "status": "Active",
      "category": "Technical Guidelines",
      "tags": ["Digital MRV", "Transparency", "ESG"],
      "description": "A 2024 enhancement to China's ESG standards focusing on digital Monitoring, Reporting, and Verification (dMRV) for CCUS to ensure high-fidelity carbon data aligned with international auditors.",
      "pubDate": "2024-05-15",
      "url": "https://www.china-briefing.com/",
      "plr_index": 80
    }
  },
  {
    "id": "il-ccus-roadmap-2024",
    "zh": {
      "title": "以色列国家 CCUS 路线图 (2024)",
      "country": "以色列",
      "year": 2024,
      "status": "Active",
      "category": "战略引导",
      "tags": ["东地中海", "矿化研究", "海域封存"],
      "description": "以色列 2024 年发布的国家级战略。重点在于利用地中海东部深海盆地进行封存，并首次将以色列在‘二氧化碳矿化利用’领域的全球领先研究成果转化为国家产业激励计划。",
      "pubDate": "2024-02-10",
      "url": "https://www.gov.il/",
      "source": "以色列能源部",
      "plr_index": 78,
      "sectors": ["Storage", "Industrial", "DAC"],
      "mrv_rigor": 4
    },
    "en": {
      "title": "Israel National CCUS Roadmap 2024",
      "country": "Israel",
      "year": 2024,
      "status": "Active",
      "category": "Strategic Guiding",
      "tags": ["Mineralization", "Mediterranean", "Innovation"],
      "description": "Israel's 2024 roadmap focuses on offshore storage in the Eastern Mediterranean and incentivizes domestic innovation in carbon mineralization and utilization technologies.",
      "pubDate": "2024-02-10",
      "url": "https://www.gov.il/",
      "plr_index": 78
    }
  },
  {
    "id": "uk-icc-business-model-2024",
    "zh": {
      "title": "英国工业碳捕集 (ICC) 业务模式 - 收入支持协议",
      "country": "英国",
      "year": 2024,
      "status": "Active",
      "category": "市场机制",
      "tags": ["差额合约", "收入保障", "工业脱碳"],
      "description": "英国 DESNZ 2024 年定稿的工业捕集商业合同标准。通过长达 15 年的‘可变收入支持’，解决了工业捕集在碳价波动下的盈利难题，是目前全球最具实操性的工业 CCS 融资激励模板。",
      "pubDate": "2024-04-12",
      "url": "https://www.gov.uk/government/publications/carbon-capture-usage-and-storage-ccus-business-models",
      "source": "英国能源安全与净零部 (DESNZ)",
      "plr_index": 92,
      "sectors": ["Industrial", "Steel", "Refining"],
      "mrv_rigor": 5,
      "legal_citation": "ICC Business Model Framework"
    },
    "en": {
      "title": "UK Industrial Carbon Capture (ICC) Business Model",
      "country": "UK",
      "year": 2024,
      "status": "Active",
      "category": "Market Mechanism",
      "tags": ["Contract for Difference", "Finance", "Revenue Support"],
      "description": "The definitive financial framework by UK government, offering 15-year variable revenue support to de-risk industrial capture projects, serving as a global benchmark for ICC bankability.",
      "pubDate": "2024-04-12",
      "url": "https://www.gov.uk/",
      "plr_index": 92,
      "legal_citation": "ICC Business Model"
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
console.log(`✅ Ultimate Peak Achievement: ${newPolicies.length} high-fidelity policies synced. Total database scaled.`);
