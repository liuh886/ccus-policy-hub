const fs = require('fs');
const path = require('path');

const OUTPUT_FILE = path.join(__dirname, '../src/data/policy_database.json');

const database = {
  version: "2.0-Fidelity",
  lastUpdated: new Date().toISOString(),
  policies: [
    {
      id: "us-45q-ira",
      zh: {
        title: "美国 45Q 碳氧化物封存税收抵免 (IRA 2022 增强版)",
        country: "美国",
        year: 2022,
        status: "Active",
        category: "经济激励",
        tags: ["45Q", "IRA", "税收抵免"],
        incentive_usd_per_ton: 85,
        mrv_rigor: 5,
        description: "通过《通胀削减法案》(IRA) 对 45Q 条款进行了重大增强，将专用封存抵免额提升至 85 美元/吨，并引入直接支付与转让机制，是全球 CCUS 货币化的核心标杆。",
        pubDate: "2022-08-16",
        source: "IRS / EPA"
      },
      en: {
        title: "Section 45Q Tax Credit for Carbon Oxide Sequestration (IRA 2022 Enhanced)",
        country: "United States",
        year: 2022,
        status: "Active",
        category: "Incentive",
        tags: ["45Q", "IRA", "Tax Credit"],
        incentive_usd_per_ton: 85,
        mrv_rigor: 5,
        description: "The Inflation Reduction Act (IRA) significantly enhanced 45Q credits, raising sequestration value to $85/t and introducing direct pay mechanisms, anchoring the global CCUS value chain.",
        pubDate: "2022-08-16",
        source: "IRS / EPA"
      }
    },
    {
      id: "eu-nzia",
      zh: {
        title: "欧盟净零工业法案 (NZIA)",
        country: "欧盟",
        year: 2024,
        status: "Active",
        category: "法律监管",
        tags: ["NZIA", "封存目标", "准入简化"],
        mrv_rigor: 4,
        description: "欧盟核心战略立法，确立了到 2030 年实现年度 5000 万吨二氧化碳注入能力的目标，并规定油气生产商承担封存义务。",
        pubDate: "2024-02-06",
        source: "European Commission"
      },
      en: {
        title: "Net-Zero Industry Act (NZIA)",
        country: "European Union",
        year: 2024,
        status: "Active",
        category: "Regulation",
        tags: ["NZIA", "Storage Target", "Strategy"],
        mrv_rigor: 4,
        description: "Key EU legislation mandating a 50 Mtpa annual injection capacity by 2030 and assigning storage construction obligations to oil and gas producers.",
        pubDate: "2024-02-06",
        source: "European Commission"
      }
    },
    {
      id: "cn-national-standards",
      zh: {
        title: "中国 CCUS 12 项国家标准 (GB/T 46870-46880)",
        country: "中国",
        year: 2026,
        status: "Upcoming",
        category: "法律监管",
        tags: ["国标", "MRV 规范", "全链条"],
        mrv_rigor: 5,
        description: "2026 年 7 月起实施的 12 项国家标准，系统性覆盖了捕集、输送、封存及减排量评估，是中国 CCUS 规范化发展的制度基石。",
        pubDate: "2026-01-12",
        source: "国家标准委"
      },
      en: {
        title: "China 12 National Standards for CCUS (GB/T 46870-46880)",
        country: "China",
        year: 2026,
        status: "Upcoming",
        category: "Regulation",
        tags: ["GB Standards", "MRV", "Full Chain"],
        mrv_rigor: 5,
        description: "A set of 12 national standards effective from July 2026, covering capture, transport, storage, and emission reduction assessment, forming the institutional foundation for China's CCUS sector.",
        pubDate: "2026-01-12",
        source: "SAC"
      }
    },
    {
      id: "cn-pboc-cerf",
      zh: {
        title: "中国碳减排支持工具 (CERF)",
        country: "中国",
        year: 2021,
        status: "Active",
        category: "经济激励",
        tags: ["绿色金融", "低息贷款", "人行"],
        description: "由中国人民银行设立，向金融机构提供 1.75% 的低息资金以定向支持 CCUS 等项目，强调数据真实性与第三方核查。",
        pubDate: "2021-11-08",
        source: "中国人民银行"
      },
      en: {
        title: "PBOC Carbon Emission Reduction Facility (CERF)",
        country: "China",
        year: 2021,
        status: "Active",
        category: "Incentive",
        tags: ["Green Finance", "Low-cost Loan", "Central Bank"],
        description: "Established by the People's Bank of China to provide 1.75% low-cost funds for CCUS projects, mandating rigorous disclosure and third-party verification of emission data.",
        pubDate: "2021-11-08",
        source: "PBOC"
      }
    },
    {
      id: "eu-cbam",
      zh: {
        title: "欧盟碳边境调节机制 (CBAM)",
        country: "欧盟",
        year: 2023,
        status: "Active",
        category: "市场机制",
        tags: ["碳关税", "贸易壁垒", "合规减排"],
        description: "全球首个碳关税，2026 年起正式征费。CCUS 减排量在经 MRV 核证后，可用于抵减进口产品的嵌入排放强度。",
        pubDate: "2023-05-16",
        source: "European Parliament"
      },
      en: {
        title: "EU Carbon Border Adjustment Mechanism (CBAM)",
        country: "European Union",
        year: 2023,
        status: "Active",
        category: "Market",
        tags: ["Carbon Tariff", "Trade", "Compliance"],
        description: "The world's first carbon tariff, effective 2026. Verified CCUS emission reductions can be deducted from the embedded emissions of imported goods.",
        pubDate: "2023-05-16",
        source: "European Parliament"
      }
    },
    {
      id: "no-storage-regulations",
      zh: {
        title: "挪威二氧化碳存储监管体系",
        country: "挪威",
        year: 2024,
        status: "Active",
        category: "法律监管",
        tags: ["北极光", "存储许可", "责任转移"],
        mrv_rigor: 5,
        description: "全球最成熟的离岸封存管理框架，定义了从勘探许可证到场址关闭后 20 年责任转移给国家的完整流程，支持跨境运输与封存。",
        pubDate: "2024-04-01",
        source: "Norwegian Offshore Directorate"
      },
      en: {
        title: "Norway CO2 Storage Regulations",
        country: "Norway",
        year: 2024,
        status: "Active",
        category: "Regulation",
        tags: ["Northern Lights", "Storage Permit", "Liability"],
        mrv_rigor: 5,
        description: "The world's most mature offshore storage regulatory framework, defining the path from exploration permits to liability transfer to the state 20 years after site closure.",
        pubDate: "2024-04-01",
        source: "Norwegian Offshore Directorate"
      }
    }
  ]
};

// 写入 JSON (强制使用 UTF-8 无 BOM)
fs.writeFileSync(OUTPUT_FILE, JSON.stringify(database, null, 2), 'utf8');
console.log(`High-Fidelity Database reconstructed with ${database.policies.length} core policies.`);
