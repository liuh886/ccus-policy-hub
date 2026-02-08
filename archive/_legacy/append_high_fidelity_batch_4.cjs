const fs = require('fs');
const path = require('path');

const DB_FILE = path.join(__dirname, '../src/data/policy_database.json');
const db = JSON.parse(fs.readFileSync(DB_FILE, 'utf-8'));

const batch4 = [
  {
    id: "my-ccs-framework",
    zh: {
      title: "马来西亚 CCS 激励与监管框架",
      country: "马来西亚",
      year: 2024,
      status: "Active",
      category: "经济激励",
      tags: ["ITA", "税收优惠", "东南亚枢纽"],
      incentive_type: "投资税收抵免",
      incentive_value: "100% ITA (10年期) 或 100% ITE",
      description: "马来西亚政府通过 MIDA 设立的强力财政激励方案，旨在吸引 CCS 运营商与服务商。开发商可申请 10 年期 100% 投资税收抵免，以抵消法定收入，同时享受设备进口税和销售税的全额免除。",
      pubDate: "2024-01-01",
      source: "MIDA / 马来西亚财政部"
    },
    en: {
      title: "Malaysia CCS Incentives & Regulatory Framework",
      country: "Malaysia",
      year: 2024,
      status: "Active",
      category: "Incentive",
      tags: ["Malaysia", "Tax Incentive", "MIDA"],
      incentive_type: "Investment Tax Allowance (ITA)",
      incentive_value: "100% ITA for 10 years or 100% ITE",
      description: "Robust tax incentives provided through MIDA to attract CCS operators. Developers can claim 100% ITA for 10 years, alongside full import duty and sales tax exemptions on equipment.",
      pubDate: "2024-01-01",
      source: "MIDA / MoF Malaysia"
    }
  },
  {
    id: "netherlands-sde",
    zh: {
      title: "荷兰 SDE++ 运营补贴机制",
      country: "荷兰",
      year: 2024,
      status: "Active",
      category: "经济激励",
      tags: ["CfD", "运营补贴", "Porthos"],
      incentive_type: "差价合约",
      description: "荷兰核心低碳技术资助计划，采用差价合约 (CfD) 模型，由政府补足项目运营成本与欧盟碳价 (EU ETS) 之间的差额。该机制对 Porthos 等大规模 CCS 项目的财务可行性至关重要。",
      pubDate: "2024-01-01",
      source: "荷兰经济部"
    },
    en: {
      title: "Netherlands SDE++ Subsidy Scheme",
      country: "Netherlands",
      year: 2024,
      status: "Active",
      category: "Incentive",
      tags: ["SDE++", "CfD", "Porthos"],
      incentive_type: "Carbon Contract for Difference",
      description: "A major Dutch subsidy scheme using a CfD model, where the government pays the delta between project costs and EU ETS prices, critical for large-scale CCS financial viability.",
      pubDate: "2024-01-01",
      source: "Dutch Ministry of Economic Affairs"
    }
  },
  {
    id: "california-lcfs",
    zh: {
      title: "加州低碳燃料标准 (LCFS) CCUS 协议",
      country: "美国",
      year: 2024,
      status: "Active",
      category: "市场机制",
      tags: ["LCFS", "积分交易", "激励叠加"],
      incentive_type: "市场化积分",
      incentive_value: "$100-$200/吨 (积分价格)",
      description: "加州首创的市场机制，允许符合条件的 CCUS 项目通过降低燃料碳强度生成可交易积分。该积分可与联邦 45Q 税收抵免叠加，是全球激励强度最高的市场化工具之一。",
      pubDate: "2024-01-01",
      source: "加州空气资源委员会 (CARB)"
    },
    en: {
      title: "California Low Carbon Fuel Standard (LCFS) CCUS Protocol",
      country: "United States",
      year: 2024,
      status: "Active",
      category: "Market",
      tags: ["LCFS", "California", "Carbon Credits"],
      incentive_type: "Market-based Credit",
      incentive_value: "$100-$200/t (Credit price)",
      description: "A premier market mechanism allowing CCUS projects to generate tradable credits based on CI reduction. LCFS credits can be stacked with federal 45Q credits for maximum incentive value.",
      pubDate: "2024-01-01",
      source: "California ARB"
    }
  },
  {
    id: "cn-ccer",
    zh: {
      title: "中国核证自愿减排机制 (CCER)",
      country: "中国",
      year: 2024,
      status: "Active",
      category: "市场机制",
      tags: ["碳市场", "抵消机制", "重启"],
      description: "中国官方的自愿减排量交易计划，于 2024 年正式重启。控排企业可使用 CCER 抵消不超过 5% 的清缴义务。目前正积极研究纳入 CCUS 专项方法学。",
      pubDate: "2024-01-22",
      source: "中国生态环境部"
    },
    en: {
      title: "China Certified Emission Reduction (CCER)",
      country: "China",
      year: 2024,
      status: "Active",
      category: "Market",
      tags: ["CCER", "Carbon Market", "Reboot"],
      description: "China's official voluntary offset scheme, rebooted in 2024. Entities in the national ETS can use CCERs to meet up to 5% of their obligations, with CCUS identified as a priority methodology.",
      pubDate: "2024-01-22",
      source: "MEE China"
    }
  },
  {
    id: "cn-zero-carbon-parks",
    zh: {
      title: "中国零碳工业园区建设指南 (2024)",
      country: "中国",
      year: 2024,
      status: "Active",
      category: "战略引导",
      tags: ["集群化", "工业脱碳", "循环利用"],
      description: "系统性指导工业园区通过碳捕集与循环利用实现整体脱碳。强调共享运输与封存基础设施的建设，优先支持二氧化碳用于化工合成或驱油 (EOR)。",
      pubDate: "2024-01-15",
      source: "工业和信息化部"
    },
    en: {
      title: "China Guidance on Zero-Carbon Industrial Parks (2024)",
      country: "China",
      year: 2024,
      status: "Active",
      category: "Strategy",
      tags: ["Industrial Hubs", "Clusters", "Decarbonization"],
      description: "Comprehensive guidance for decarbonizing industrial clusters through shared CCUS infrastructure and prioritized utilization in chemical synthesis or EOR.",
      pubDate: "2024-01-15",
      source: "MIIT China"
    }
  }
];

// 合并新数据
batch4.forEach(newEntry => {
  const index = db.policies.findIndex(p => p.id === newEntry.id);
  if (index !== -1) {
    db.policies[index] = newEntry;
  } else {
    db.policies.push(newEntry);
  }
});

fs.writeFileSync(DB_FILE, JSON.stringify(db, null, 2), 'utf8');
console.log(`Database updated with Batch 4: ${batch4.length} policies.`);
