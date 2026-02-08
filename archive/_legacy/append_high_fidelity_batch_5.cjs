const fs = require('fs');
const path = require('path');

const DB_FILE = path.join(__dirname, '../src/data/policy_database.json');
const db = JSON.parse(fs.readFileSync(DB_FILE, 'utf-8'));

const batch5 = [
  {
    id: "alberta-tier",
    zh: {
      title: "阿尔伯塔省 TIER 监管法规",
      country: "加拿大",
      year: 2023,
      status: "Active",
      category: "市场机制",
      tags: ["碳定价", "EPC积分", "省级政策"],
      incentive_type: "碳定价与抵消",
      incentive_usd_per_ton: 59, 
      description: "阿尔伯塔省针对大型排放源的碳定价系统。设施通过 CCUS 产生的减排量可转化为排放性能积分 (EPC)，用于市场交易或履行合规义务。可与联邦 ITC 叠加，是油砂脱碳的核心动力。",
      pubDate: "2023-01-01",
      source: "阿尔伯塔省政府"
    },
    en: {
      title: "Alberta TIER Regulation",
      country: "Canada",
      year: 2023,
      status: "Active",
      category: "Market",
      tags: ["Carbon Pricing", "EPC", "Provincial Policy"],
      incentive_type: "Carbon Pricing / Offsets",
      incentive_usd_per_ton: 59,
      description: "Alberta's industrial carbon pricing system. CCUS projects generate tradable Emission Performance Credits (EPCs). Stackable with federal ITC, it serves as the financial pillar for oil sands decarbonization.",
      pubDate: "2023-01-01",
      source: "Government of Alberta"
    }
  },
  {
    id: "norway-longship",
    zh: {
      title: "挪威“长船”计划与碳税框架",
      country: "挪威",
      year: 2024,
      status: "Active",
      category: "法律监管",
      tags: ["国家投资", "去风险", "北极光"],
      incentive_type: "税收驱动+国家注资",
      mrv_rigor: 5,
      description: "挪威将全球领先的高额离岸碳税与“长船”计划的直接国家投资相结合。政府分担了项目前十年的大部分资本与运营支出，旨在通过公私合营模式降低全链条 CCS 的商业风险。",
      pubDate: "2024-01-01",
      source: "挪威政府 / Gassnova"
    },
    en: {
      title: "Norway Longship & Carbon Tax Framework",
      country: "Norway",
      year: 2024,
      status: "Active",
      category: "Regulation",
      tags: ["State Investment", "De-risking", "Longship"],
      incentive_type: "Tax Drive + Grant",
      mrv_rigor: 5,
      description: "Norway pairs high offshore carbon taxes with the Longship project's direct state funding. The government covers significant capex and opex, creating a blueprint for de-risking full-chain CCS.",
      pubDate: "2024-01-01",
      source: "Norwegian Government / Gassnova"
    }
  },
  {
    id: "verra-vm0049",
    zh: {
      title: "Verra CCS 方法学 VM0049",
      country: "国际",
      year: 2024,
      status: "Active",
      category: "市场机制",
      tags: ["自愿碳市场", "VCS", "方法学"],
      mrv_rigor: 5,
      description: "Verra 发布的 CCS 专项方法学，允许项目在自愿碳市场发行核证碳单位 (VCU)。严格要求额外性论证，并强制执行 100 年的责任监控或通过缓冲池抵御封存风险。",
      pubDate: "2024-03-01",
      source: "Verra"
    },
    en: {
      title: "Verra Methodology VM0049",
      country: "International",
      year: 2024,
      status: "Active",
      category: "Market",
      tags: ["Voluntary Market", "VCS", "Methodology"],
      mrv_rigor: 5,
      description: "Verified Carbon Standard (VCS) methodology for CCS, enabling VCU issuance. It mandates rigorous additionality proof and 100-year liability monitoring or buffer pool mechanisms.",
      pubDate: "2024-03-01",
      source: "Verra"
    }
  },
  {
    id: "gold-standard",
    zh: {
      title: "黄金标准 (Gold Standard) CCUS 准则",
      country: "国际",
      year: 2023,
      status: "Active",
      category: "经济激励",
      tags: ["高标准", "SDGs", "碳信用"],
      description: "自愿碳市场的高端标准，支持 CCUS 与 DAC 项目的信用核证。除要求 100 年以上的封存持久性外，还强制要求项目必须对联合国可持续发展目标 (SDGs) 做出额外贡献。",
      pubDate: "2023-01-01",
      source: "Gold Standard"
    },
    en: {
      title: "Gold Standard CCUS Methodology",
      country: "International",
      year: 2023,
      status: "Active",
      category: "Incentive",
      tags: ["High Integrity", "SDGs", "Offsets"],
      description: "A premier voluntary market standard for CCUS and DAC. Beyond 100-year durability, it mandates positive contributions to multiple UN Sustainable Development Goals.",
      pubDate: "2023-01-01",
      source: "Gold Standard"
    }
  },
  {
    id: "puro-earth",
    zh: {
      title: "Puro.earth 碳移除证书标准",
      country: "国际",
      year: 2019,
      status: "Active",
      category: "市场机制",
      tags: ["CORC", "工程化移除", "永久封存"],
      description: "领先的工程化碳移除 (CDR) 标准，专注于核发 CORC 证书。该标准仅认可具有极高地质封存或矿化封存永久性的项目，并通过储备账户机制管理未来风险。",
      pubDate: "2019-05-01",
      source: "Puro.earth"
    },
    en: {
      title: "Puro.earth Carbon Removal Standard",
      country: "International",
      year: 2019,
      status: "Active",
      category: "Market",
      tags: ["CORC", "CDR", "Permanence"],
      description: "The primary standard for engineered carbon removal, issuing CORC certificates. It exclusively focuses on projects with verified high geological or mineralized storage permanence.",
      pubDate: "2019-05-01",
      source: "Puro.earth"
    }
  },
  {
    id: "us-iija-hubs",
    zh: {
      title: "美国 IIJA 基础设施法案 (CCUS 枢纽专项)",
      country: "美国",
      year: 2021,
      status: "Active",
      category: "经济激励",
      tags: ["枢纽化", "直接赠款", "基础设施"],
      description: "通过《基础设施投资和就业法案》(IIJA) 拨付巨额资金，支持建立大规模区域性 CCUS 枢纽。包含 35 亿美元专门用于直接空气捕集 (DAC) 枢纽的建设，侧重于共享基础设施的规模化。",
      pubDate: "2021-11-15",
      source: "美国能源部 (DOE)"
    },
    en: {
      title: "US IIJA Infrastructure Act (CCUS Hubs)",
      country: "United States",
      year: 2021,
      status: "Active",
      category: "Incentive",
      tags: ["Hubs", "Direct Grant", "Infrastructure"],
      description: "Allocates significant funding via IIJA to establish regional CCUS hubs. Includes a $3.5 billion carve-out for Direct Air Capture (DAC) hubs, focusing on shared infrastructure scalability.",
      pubDate: "2021-11-15",
      source: "US DOE"
    }
  }
];

// 合并新数据
batch5.forEach(newEntry => {
  const index = db.policies.findIndex(p => p.id === newEntry.id);
  if (index !== -1) {
    db.policies[index] = newEntry;
  } else {
    db.policies.push(newEntry);
  }
});

fs.writeFileSync(DB_FILE, JSON.stringify(db, null, 2), 'utf8');
console.log(`Database updated with Batch 5: ${batch5.length} policies.`);
