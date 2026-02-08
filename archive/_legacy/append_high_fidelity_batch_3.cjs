const fs = require('fs');
const path = require('path');

const DB_FILE = path.join(__dirname, '../src/data/policy_database.json');
const db = JSON.parse(fs.readFileSync(DB_FILE, 'utf-8'));

const batch3 = [
  {
    id: "denmark-ccfd",
    zh: {
      title: "丹麦 CCfD 碳捕捉与封存基金招标机制",
      country: "丹麦",
      year: 2024,
      status: "Active",
      category: "经济激励",
      tags: ["CCfD", "负向招标", "北欧枢纽"],
      description: "丹麦政府推出的为期 20 年的补贴计划，通过竞争性招标（负向招标）确定每吨二氧化碳的差价合约价格，旨在启动丹麦的大规模 CCS 商业化部署。",
      pubDate: "2024-05-01",
      source: "丹麦能源署"
    },
    en: {
      title: "Danish CCfD Bidding Mechanism",
      country: "Denmark",
      year: 2024,
      status: "Active",
      category: "Incentive",
      tags: ["Danish Policy", "CfD", "Tendering"],
      description: "A 20-year subsidy scheme based on competitive tendering (Carbon Contract for Difference), designed to kickstart large-scale CCS deployment and position Denmark as a European storage hub.",
      pubDate: "2024-05-01",
      source: "Danish Energy Agency"
    }
  },
  {
    id: "br-fuels-of-the-future-ccs",
    zh: {
      title: "巴西“未来燃料”法案与 CCS 监管框架 (Bill 528/2020)",
      country: "巴西",
      year: 2024,
      status: "Active",
      category: "法律监管",
      tags: ["南美首部", "生物质碳捕集", "ANP 监管"],
      description: "巴西首部 CCS 专门法律框架，由国家石油、天然气和生物燃料管理局 (ANP) 监管。法案规定封存授权期通常为 30 年，并明确了运营商在环境风险与长期监测方面的义务。",
      pubDate: "2024-09-01",
      source: "巴西参议院 / 总统府"
    },
    en: {
      title: "Brazil Fuels of the Future & CCS Framework (Bill 528/2020)",
      country: "Brazil",
      year: 2024,
      status: "Active",
      category: "Regulation",
      tags: ["Brazil", "Latin America", "Geological Storage"],
      description: "A comprehensive law establishing Brazil's first legal framework for CCS, governed by ANP. It mandates federal authorization for 30-year storage terms and defines operator liabilities.",
      pubDate: "2024-09-01",
      source: "Brazilian Senate / Presidency"
    }
  },
  {
    id: "kr-ccus-act",
    zh: {
      title: "韩国 CCUS 法案 (2024)",
      country: "韩国",
      year: 2024,
      status: "Active",
      category: "法律监管",
      tags: ["法律集成", "战略集群", "MOTIE"],
      description: "韩国首部 CCUS 专项综合立法，旨在整合之前分散在 40 多部法律中的审批流程。法案确立了“CCUS 战略集群”制度，并为关键基础设施的建设与运营提供法律支撑与研发补贴。",
      pubDate: "2024-01-09",
      source: "韩国产业通商资源部 (MOTIE)"
    },
    en: {
      title: "South Korea CCUS Act",
      country: "South Korea",
      year: 2024,
      status: "Active",
      category: "Regulation",
      tags: ["South Korea", "CCUS Act", "MOTIE"],
      description: "A comprehensive new law consolidating CCUS-related regulations from 40+ different acts into a single framework, facilitating 'Strategic Clusters' and streamlining the permitting process.",
      pubDate: "2024-01-09",
      source: "MOTIE Korea"
    }
  },
  {
    id: "iso-standards",
    zh: {
      title: "ISO 27914 & 27916 CCUS 国际标准",
      country: "国际",
      year: 2019,
      status: "Active",
      category: "法律监管",
      tags: ["技术标准", "地质封存", "EOR 量化"],
      description: "由 ISO TC265 制定的全球公认标准。ISO 27914 聚焦于专用地质封存的安全性与完整性；ISO 27916 为二氧化碳增强采油 (CO2-EOR) 场景下的封存量化建立了统一核算规则。",
      pubDate: "2019-01-01",
      source: "ISO TC265"
    },
    en: {
      title: "ISO 27914 & 27916 CCUS International Standards",
      country: "International",
      year: 2019,
      status: "Active",
      category: "Regulation",
      tags: ["ISO", "Technical Standards", "Geological Storage", "EOR"],
      description: "Constitutes the universal language for CCUS. ISO 27914 focuses on the safety of dedicated storage, while ISO 27916 establishes accounting rules for storage in CO2-EOR scenarios.",
      pubDate: "2019-01-01",
      source: "ISO TC265"
    }
  },
  {
    id: "ipcc-guidelines",
    zh: {
      title: "IPCC 国家温室气体清单指南",
      country: "国际",
      year: 2019,
      status: "Active",
      category: "法律监管",
      tags: ["碳核算", "UNFCCC", "方法论"],
      description: "2019 年修订版指南为各国在 UNFCCC 框架下报告 CCUS 活动提供了全球公认的科学依据，详细规定了捕集、输送与封存环节的排放量化与泄漏估算方法。",
      pubDate: "2019-05-01",
      source: "IPCC"
    },
    en: {
      title: "IPCC Guidelines for National GHG Inventories",
      country: "International",
      year: 2019,
      status: "Active",
      category: "Regulation",
      tags: ["Accounting", "Methodology", "UN"],
      description: "The 2019 Refinement provides the global scientific basis for accounting CCUS activities, enabling nations to report verified emission reductions to the UNFCCC.",
      pubDate: "2019-05-01",
      source: "IPCC"
    }
  },
  {
    id: "eu-innovation-fund",
    zh: {
      title: "欧盟创新基金 (Innovation Fund)",
      country: "欧盟",
      year: 2024,
      status: "Active",
      category: "经济激励",
      tags: ["资金支持", "技术示范", "ETS 收入"],
      description: "全球最大的支持低碳技术示范的资助计划之一，资金来源于欧盟碳市场 (EU ETS) 拍卖收入。到 2030 年预计投入约 400 亿欧元，重点支持 CCUS 等突破性技术的规模化应用。",
      pubDate: "2024-01-01",
      source: "欧盟委员会"
    },
    en: {
      title: "EU Innovation Fund",
      country: "European Union",
      year: 2024,
      status: "Active",
      category: "Incentive",
      tags: ["Funding", "Demonstration", "Breakthrough"],
      description: "One of the world's largest funding programs for low-carbon technologies, expected to deploy ~€40 billion until 2030, with a major focus on full-chain CCUS innovation.",
      pubDate: "2024-01-01",
      source: "European Commission"
    }
  }
];

// 合并新数据
batch3.forEach(newEntry => {
  const index = db.policies.findIndex(p => p.id === newEntry.id);
  if (index !== -1) {
    db.policies[index] = newEntry;
  } else {
    db.policies.push(newEntry);
  }
});

fs.writeFileSync(DB_FILE, JSON.stringify(db, null, 2), 'utf8');
console.log(`Database updated with Batch 3: ${batch3.length} policies.`);
