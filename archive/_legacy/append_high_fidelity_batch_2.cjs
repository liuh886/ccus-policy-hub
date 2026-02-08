const fs = require('fs');
const path = require('path');

const DB_FILE = path.join(__dirname, '../src/data/policy_database.json');
const db = JSON.parse(fs.readFileSync(DB_FILE, 'utf-8'));

const batch2 = [
  {
    id: "ca-ccus-itc",
    zh: {
      title: "加拿大 CCUS 投资税收抵免 (ITC)",
      country: "加拿大",
      year: 2023,
      status: "Active",
      category: "经济激励",
      tags: ["ITC", "投资抵免", "税收激励"],
      incentive_type: "投资抵免",
      incentive_value: "捕集设备 50%；运输与封存 37.5%",
      description: "加拿大核心财政激励政策，旨在抵消 CCUS 项目的高额资本支出。该政策明确聚焦于专用地质封存，并将 EOR（提高石油采收率）项目明确排除在资助范围之外。",
      pubDate: "2023-11-30",
      source: "加拿大财政部"
    },
    en: {
      title: "Canada CCUS Investment Tax Credit (ITC)",
      country: "Canada",
      year: 2023,
      status: "Active",
      category: "Incentive",
      tags: ["ITC", "Investment Credit", "Fiscal"],
      incentive_type: "Investment Tax Credit",
      incentive_value: "50% for capture; 37.5% for T&S",
      description: "A primary fiscal incentive to offset capital costs, focusing on dedicated geological storage while explicitly excluding Enhanced Oil Recovery (EOR) projects.",
      pubDate: "2023-11-30",
      source: "Finance Canada"
    }
  },
  {
    id: "uk-ccus-vision",
    zh: {
      title: "英国 CCUS 发展愿景",
      country: "英国",
      year: 2023,
      status: "Active",
      category: "战略引导",
      tags: ["愿景", "集群化", "Track-1/2"],
      description: "英国长期路线图，旨在建立具有全球竞争力的 CCUS 市场。目标到 2030 年实现年封存 2000-3000 万吨二氧化碳，并承诺投入 200 亿英镑支持集群建设。",
      pubDate: "2023-12-20",
      source: "英国能源安全与净零部"
    },
    en: {
      title: "UK CCUS Vision",
      country: "United Kingdom",
      year: 2023,
      status: "Active",
      category: "Strategy",
      tags: ["Vision", "Clusters", "Track-1", "Track-2"],
      description: "A long-term roadmap to create a competitive market, aiming for 20-30 Mtpa storage by 2030 with a £20 billion funding commitment for cluster sequencing.",
      pubDate: "2023-12-20",
      source: "DESNZ"
    }
  },
  {
    id: "au-safeguard-mechanism",
    zh: {
      title: "澳大利亚保障机制改革 (Safeguard Mechanism)",
      country: "澳大利亚",
      year: 2023,
      status: "Active",
      category: "市场机制",
      tags: ["基准线", "ACCU", "合规义务"],
      description: "核心气候政策，要求年排放量超过 10 万吨的工业设施每年强制降低 4.9% 的排放强度，通过惩罚性合规成本驱动油气与重工业对 CCUS 的投资需求。",
      pubDate: "2023-03-30",
      source: "DCCEEW"
    },
    en: {
      title: "Australia Safeguard Mechanism Reform",
      country: "Australia",
      year: 2023,
      status: "Active",
      category: "Market",
      tags: ["Safeguard", "ACCU", "Baselines"],
      description: "Central climate policy mandating a 4.9% annual emissions intensity reduction for large facilities, effectively creating a compliance-driven market for CCUS abatement.",
      pubDate: "2023-03-30",
      source: "DCCEEW"
    }
  },
  {
    id: "id-presidential-reg-14-2024",
    zh: {
      title: "印度尼西亚 2024 年第 14 号总统令",
      country: "印度尼西亚",
      year: 2024,
      status: "Active",
      category: "法律监管",
      tags: ["跨境封存", "东南亚枢纽", "许可框架"],
      description: "印尼 CCS 发展的里程碑法案，首次明确允许将封存能力的 30% 分配给跨境二氧化碳来源，为亚太地区建立区域性碳枢纽提供了法律框架。",
      pubDate: "2024-01-30",
      source: "印尼内阁秘书处"
    },
    en: {
      title: "Indonesia Presidential Regulation No. 14/2024",
      country: "Indonesia",
      year: 2024,
      status: "Active",
      category: "Regulation",
      tags: ["Cross-border", "Asia-Pacific", "CCS Hub"],
      description: "Landmark regulation enabling Indonesia to allocate 30% of its storage capacity to international CO2, establishing the first major legal framework for cross-border CCS in Asia.",
      pubDate: "2024-01-30",
      source: "Cabinet Secretariat of RI"
    }
  },
  {
    id: "japan-ccs-act",
    zh: {
      title: "日本 CCS 商业法 (2024)",
      country: "日本",
      year: 2024,
      status: "Active",
      category: "法律监管",
      tags: ["许可权", "盐水层", "责任转移"],
      description: "2024 年 5 月通过，将 CCS 封存权从油气法中剥离并独立化，允许专业运营商获得咸水层封存权，并建立了向国家机构 (JOGMEC) 转移长期责任的机制。",
      pubDate: "2024-05-20",
      source: "日本经济产业省 (METI)"
    },
    en: {
      title: "Japan CCS Business Act (2024)",
      country: "Japan",
      year: 2024,
      status: "Active",
      category: "Regulation",
      tags: ["Storage Rights", "Saline Aquifers", "Liability"],
      description: "Legislation passed in May 2024 decoupling CCS storage rights from oil/gas laws, enabling saline aquifer storage permits and defining a state-backed liability transfer mechanism.",
      pubDate: "2024-05-20",
      source: "METI Japan"
    }
  }
];

// 合并新数据，防止重复并保持 ID 唯一性
batch2.forEach(newEntry => {
  const index = db.policies.findIndex(p => p.id === newEntry.id);
  if (index !== -1) {
    db.policies[index] = newEntry;
  } else {
    db.policies.push(newEntry);
  }
});

fs.writeFileSync(DB_FILE, JSON.stringify(db, null, 2), 'utf8');
console.log(`Database updated with ${batch2.length} additional high-fidelity policies.`);
