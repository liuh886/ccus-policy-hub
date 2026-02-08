const fs = require('fs');
const DB_PATH = 'src/data/policy_database.json';

let rawData = fs.readFileSync(DB_PATH, 'utf8');
if (rawData.charCodeAt(0) === 0xFEFF) rawData = rawData.slice(1);
const db = JSON.parse(rawData);

const newPolicies = [
  {
    id: "ae-carbon-strategy",
    zh: {
      title: "阿联酋国家碳管理战略与 ADNOC CCS 计划",
      country: "阿联酋",
      year: 2023,
      status: "Active",
      category: "战略引导",
      tags: ["中东枢纽", "ADNOC", "碳减排"],
      description: "阿联酋国家级碳管理路线图，由国家石油公司 (ADNOC) 主导，旨在通过区域性 CCS 枢纽实现 2030 年减排目标。",
      source: "MOCCAE",
      legal_citation: "National Net Zero 2050 Roadmap",
      mrv_rigor: 3,
      pore_space_rights: "国家所有",
      liability_transfer: "由国家石油公司 (ADNOC) 统一管理"
    },
    en: {
      title: "UAE National Carbon Management Strategy & ADNOC CCS Program",
      country: "United Arab Emirates",
      year: 2023,
      status: "Active",
      category: "Strategic Guidance",
      tags: ["Middle East Hub", "ADNOC", "Decarbonization"],
      description: "UAE's national roadmap for carbon management, anchoring regional CCS hubs via ADNOC to achieve 2030 emission targets.",
      source: "MOCCAE",
      legal_citation: "National Net Zero 2050 Roadmap",
      mrv_rigor: 3,
      pore_space_rights: "State-owned",
      liability_transfer: "Centralized stewardship by ADNOC"
    },
    analysis: { incentive: 0, statutory: 70, liability: 75, mrv: 65, market: 0 }
  },
  {
    id: "br-bill-1425-2022",
    zh: {
      title: "巴西 CCUS 综合法律框架 (Bill 1425/2022)",
      country: "巴西",
      year: 2024,
      status: "Active",
      category: "法律监管",
      tags: ["南美首部", "综合立法", "特许经营"],
      description: "巴西建立的南美首个全面 CCUS 监管框架，明确了运营许可制度、孔隙权属及 30 年责任转移期。",
      source: "巴西参议院",
      legal_citation: "Federal Bill 1425/2022",
      mrv_rigor: 4,
      pore_space_rights: "属于联邦政府所有",
      liability_transfer: "封存场址关闭 30 年后责任转移至政府"
    },
    en: {
      title: "Brazil CCUS Comprehensive Legal Framework (Bill 1425/2022)",
      country: "Brazil",
      year: 2024,
      status: "Active",
      category: "Legal & Regulatory",
      tags: ["South America First", "Comprehensive Legislation", "Concession"],
      description: "South America's first comprehensive regulatory framework for CCUS, defining licensing, pore space rights, and a 30-year liability transfer period.",
      source: "Brazilian Senate",
      legal_citation: "Federal Bill 1425/2022",
      mrv_rigor: 4,
      pore_space_rights: "Federal ownership",
      liability_transfer: "Liability transfer to the State after 30 years"
    },
    analysis: { incentive: 0, statutory: 85, liability: 82, mrv: 75, market: 0 }
  },
  {
    id: "uk-ccfd-model",
    zh: {
      title: "英国工业碳捕集差价合约 (ICC CCfD)",
      country: "英国",
      year: 2024,
      status: "Active",
      category: "经济激励",
      tags: ["CCfD", "差价合约", "商业模式"],
      description: "全球领先的 CCfD 商业模型，通过 15 年长期合约补偿捕集成本与 UK ETS 碳价之间的差额，保障项目收益。",
      source: "DESNZ / LCCC",
      legal_citation: "Energy Act 2023 - ICC Framework",
      mrv_rigor: 5,
      liability_transfer: "按英国能源法案执行"
    },
    en: {
      title: "UK Industrial Carbon Capture Contracts for Difference (ICC CCfD)",
      country: "United Kingdom",
      year: 2024,
      status: "Active",
      category: "Economic Incentives",
      tags: ["CCfD", "Contracts for Difference", "Business Model"],
      description: "World-leading CCfD model providing 15-year revenue certainty by bridging the gap between capture costs and UK ETS prices.",
      source: "DESNZ / LCCC",
      legal_citation: "Energy Act 2023 - ICC Framework",
      mrv_rigor: 5,
      liability_transfer: "As per Energy Act 2023 provisions"
    },
    analysis: { incentive: 95, statutory: 80, liability: 0, mrv: 85, market: 70 }
  }
];

// 合并逻辑：防止重复录入
newPolicies.forEach(np => {
  if (!db.policies.find(p => p.id === np.id)) {
    db.policies.push(np);
  }
});

fs.writeFileSync(DB_PATH, JSON.stringify(db, null, 2), 'utf8');
console.log(`✅ 数据库补录完成：新增 ${newPolicies.length} 项核心治理政策。`);
