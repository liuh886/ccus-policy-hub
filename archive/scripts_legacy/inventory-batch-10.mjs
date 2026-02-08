import fs from 'fs';

const DB_PATH = 'src/data/policy_database.json';
const db = JSON.parse(fs.readFileSync(DB_PATH, 'utf8'));

const batch10 = [
    {
        id: "jp-jogmec-advanced-ccs-2024",
        zh: {
            title: "日本 JOGMEC 先进 CCS 项目支持指南 (2024)",
            country: "日本",
            scope: "National",
            legalWeight: "Guideline/Policy",
            year: 2024,
            status: "Active",
            category: "Economic Incentive",
            tags: ["JOGMEC资助", "商业化", "全价值链"],
            description: "日本金属能源安全组织 (JOGMEC) 发布的指南，为 9 个选定的先进 CCS 项目提供从捕集到封存的全流程集成化资助。",
            pubDate: "2024-06-01",
            url: "https://www.jogmec.go.jp/english/news/release/news_10_00037.html",
            source: "JOGMEC",
            analysis: {
                frameworkVersion: "5.0",
                incentive: { score: 85, label: "Integrated Capex Support", evidence: "Provides integrated subsidies for design, exploration, and construction of the full CCS chain.", citation: "JOGMEC FY2024 Selection Criteria" },
                statutory: { score: 75, label: "Role Model Driven", evidence: "Guidelines create a de facto regulatory path for commercial scale-up.", citation: "Advanced CCS Project Support Policy" },
                liability: { score: 60, label: "Managed Risk", evidence: "JOGMEC provides technical and financial de-risking for storage exploration.", citation: "Handbook for CO2 cross-border transport" },
                mrv: { score: 80, label: "Strict Operational MRV", evidence: "Requires high-frequency reporting to JOGMEC to maintain subsidy eligibility.", citation: "Technical Guidelines" },
                market: { score: 75, label: "Hub-and-Spoke Synergy", evidence: "Focuses on creating hubs that link Japanese industry to overseas storage sites.", citation: "Cross-border CCS Handbook" }
            }
        },
        en: {
            title: "Japan JOGMEC Advanced CCS Project Support Guidelines (2024)",
            country: "Japan",
            scope: "National",
            legalWeight: "Guideline/Policy",
            year: 2024,
            status: "Active",
            category: "Economic Incentive",
            tags: ["JOGMEC Funding", "Scale-up", "Value Chain"],
            description: "Guidelines defining the integrated support system for Japan's flagship CCS projects, aiming for 20Mtpa storage by 2030.",
            pubDate: "2024-06-01",
            url: "https://www.jogmec.go.jp/english/news/release/news_10_00037.html",
            source: "JOGMEC",
            analysis: {
                frameworkVersion: "5.0",
                incentive: { score: 85, label: "Full Chain Funding", evidence: "Financial aid covers capex and opex for the entire value chain.", citation: "JOGMEC Guidelines" },
                statutory: { score: 75, label: "Regulatory Roadmap", evidence: "Builds on the May 2024 CCS Storage Business Act.", citation: "METI Roadmap" },
                liability: { score: 60, label: "State-backed", evidence: "Technical risk management provided by JOGMEC.", citation: "Operational Rules" },
                mrv: { score: 80, label: "Performance Linked", evidence: "Standardized monitoring required for all JOGMEC-backed sites.", citation: "MRV Standards" },
                market: { score: 75, label: "International Hubs", evidence: "Positions Japan as a capture hub for Asia-Pacific storage.", citation: "Cross-border CCS Handbook" }
            }
        }
    },
    {
        id: "my-ccus-act-2025",
        zh: {
            title: "马来西亚 CCUS 法案 2025 (Act 870)",
            country: "马来西亚",
            scope: "National",
            legalWeight: "Primary Legislation",
            year: 2025,
            status: "Active",
            category: "Regulatory Framework",
            tags: ["跨境封存", "联邦立法", "亚洲枢纽"],
            description: "马来西亚首部 CCUS 专项联邦法律，明确允许进口和封存来自境外的二氧化碳，确立了马来西亚作为区域封存枢纽的法律地位。",
            pubDate: "2025-01-01",
            url: "https://www.parlimen.gov.my/",
            source: "马来西亚议会",
            analysis: {
                frameworkVersion: "5.0",
                incentive: { score: 65, label: "Cross-border Revenue", evidence: "Enables host fees and monetization of international CO2 storage services.", citation: "Section on Storage Charges" },
                statutory: { score: 95, label: "Direct CCS Mandate", evidence: "A dedicated federal act covering capture, transport, and storage jurisdiction.", citation: "CCUS Act 2025, Section 1", auditNote: "Highest statutory score in ASEAN." },
                liability: { score: 80, label: "Closure & Transfer", evidence: "Defines the transfer of liability to the state after verified site closure.", citation: "Part IV: Safety and Monitoring" },
                mrv: { score: 85, label: "ISO-aligned MRV", evidence: "Adopts international standards for CO2 accounting and injection monitoring.", citation: "Section 32: Technical Requirements" },
                market: { score: 95, label: "International Interconnect", evidence: "Explicit provisions for CO2 import/export, aligning with the London Protocol.", citation: "Article 15", auditNote: "Benchmark for cross-border hub governance." }
            }
        },
        en: {
            title: "Malaysia CCUS Act 2025 (Act 870)",
            country: "Malaysia",
            scope: "National",
            legalWeight: "Primary Legislation",
            year: 2025,
            status: "Active",
            category: "Regulatory Framework",
            tags: ["Cross-border", "ASEAN Hub", "Legislation"],
            description: "A landmark federal law enabling the full CCUS value chain and positioning Malaysia as a regional hub for international CO2 storage.",
            pubDate: "2025-01-01",
            url: "https://www.parlimen.gov.my/",
            source: "Malaysian Parliament",
            analysis: {
                frameworkVersion: "5.0",
                incentive: { score: 65, label: "Commercial Enabler", evidence: "Provides legal clarity for commercial storage service contracts.", citation: "Section 10" },
                statutory: { score: 95, label: "Comprehensive Law", evidence: "Dedicated CCUS legislation independent of oil/gas laws.", citation: "Act 870" },
                liability: { score: 80, label: "State Stewardship", evidence: "Defined pathways for liability transfer post-decommissioning.", citation: "Part IV" },
                mrv: { score: 85, label: "Standardized", evidence: "Mandatory reporting according to national and ISO guidelines.", citation: "Technical Annex" },
                market: { score: 95, label: "Global Gateway", evidence: "Leading legal framework for transboundary CO2 movement in Asia.", citation: "Art 15" }
            }
        }
    },
    {
        id: "cn-js-industrial-decarb-2022",
        zh: {
            title: "江苏省工业领域碳达峰实施方案 (CCUS 抵消规则)",
            country: "中国",
            scope: "Sub-national",
            region: "江苏省",
            legalWeight: "Administrative Regulation",
            year: 2022,
            status: "Active",
            category: "Regulatory Framework",
            tags: ["江苏方案", "碳核算抵消", "工业示范"],
            description: "江苏省发布的工业转型方案，首次在省内核算方法中明确将 CCUS 减排量作为抵消项，并由市级部门和行业协会联合认定。",
            pubDate: "2022-10-01",
            url: "http://gxt.jiangsu.gov.cn/",
            source: "江苏省工信厅",
            analysis: {
                frameworkVersion: "5.0",
                incentive: { score: 55, label: "Offset Value", evidence: "Provides compliance flexibility for industrial leaders via CCUS offsets.", citation: "第四章：保障措施" },
                statutory: { score: 70, label: "Local Mandate", evidence: "Integrates CCUS into the provincial carbon peaking legal pathway.", citation: "第二章：主要任务" },
                liability: { score: 40, label: "Compliance Based", evidence: "Refers to national safety regulations; focus is on accounting.", citation: "附件：核算指南" },
                mrv: { score: 80, label: "Multi-tier Verification", evidence: "Requires municipal verification and provincial expert appraisal.", citation: "Section 4.2", auditNote: "Strong focus on localized MRV enforcement." },
                market: { score: 65, label: "Industrial Pull", evidence: "Encourages zero-carbon factory certification via CCUS applications.", citation: "Jiangsu Zero-Carbon Factory Guide" }
            }
        },
        en: {
            title: "Jiangsu Industrial Carbon Peaking Implementation Plan (CCUS Offset Rules)",
            country: "China",
            scope: "Sub-national",
            region: "Jiangsu",
            legalWeight: "Administrative Regulation",
            year: 2022,
            status: "Active",
            category: "Regulatory Framework",
            tags: ["Jiangsu Pilot", "Accounting Offset", "Industrial Decarb"],
            description: "A provincial roadmap in Jiangsu enabling industrial CCUS reductions to be used as verified carbon offsets.",
            pubDate: "2022-10-01",
            url: "http://gxt.jiangsu.gov.cn/",
            source: "Jiangsu MIIT",
            analysis: {
                frameworkVersion: "5.0",
                incentive: { score: 55, label: "Offset Flexibility", evidence: "Recognition of CCUS as a valid emission reduction tool for enterprises.", citation: "Chapter 4" },
                statutory: { score: 70, label: "Provincial Directive", evidence: "Binding sectoral targets for carbon intensity reduction.", citation: "Chapter 2" },
                liability: { score: 40, label: "Safety Aligned", evidence: "Standard adherence to national storage safety baselines.", citation: "Annex" },
                mrv: { score: 80, label: "Verified Performance", evidence: "Mandatory municipal and expert-level verification of capture data.", citation: "Section 4.2" },
                market: { score: 65, label: "Sectoral Demand", evidence: "Linked to the 'Zero-Carbon Factory' initiative in the province.", citation: "Zero-Carbon Guide" }
            }
        }
    },
    {
        id: "nl-porthos-sde-subsidy",
        zh: {
            title: "荷兰 Porthos 项目 SDE++ 差价合约补贴框架",
            country: "荷兰",
            scope: "National",
            legalWeight: "Administrative Regulation",
            year: 2021,
            status: "Active",
            category: "Economic Incentive",
            tags: ["CfD补贴", "Porthos", "ETS差价"],
            description: "荷兰政府为 Porthos 捕集客户提供的总额约 20 亿欧元的补贴方案，采用 SDE++ 差价合约模型，覆盖项目成本与 ETS 碳价之间的缺口。",
            pubDate: "2021-04-01",
            url: "https://www.rvo.nl/subsidies-financiering/sde",
            source: "RVO Netherlands",
            analysis: {
                frameworkVersion: "5.0",
                incentive: { score: 100, label: "Gap-filling CfD (SDE++)", evidence: "Covers the full delta between project LCOE and ETS price, ensuring bankability.", citation: "SDE++ CCS Round 2021", auditNote: "Global gold standard for F-dimension (Incentive)." },
                statutory: { score: 80, label: "Contractual Mandate", evidence: "Binding 15-year subsidy agreements between government and project operators.", citation: "Climate Fund Act" },
                liability: { score: 70, label: "Economic Performance", evidence: "Subsidies are clawed back if storage integrity is not maintained.", citation: "SDE++ Terms" },
                mrv: { score: 90, label: "ETS Integrated", evidence: "Leverages the EU ETS MRV infrastructure to verify subsidy claims.", citation: "Article 49 compliance" },
                market: { score: 85, label: "Infrastructure De-risking", evidence: "De-risks the full chain by guaranteeing revenue for capture plants.", citation: "Porthos Business Model" }
            }
        },
        en: {
            title: "Netherlands Porthos SDE++ CfD Subsidy Framework",
            country: "Netherlands",
            scope: "National",
            legalWeight: "Administrative Regulation",
            year: 2021,
            status: "Active",
            category: "Economic Incentive",
            tags: ["CfD", "Porthos", "SDE++"],
            description: "A €2 billion gap-filling subsidy framework for the Porthos project, paying the difference between ETS prices and project costs.",
            pubDate: "2021-04-01",
            url: "https://www.rvo.nl/subsidies-financiering/sde",
            source: "RVO Netherlands",
            analysis: {
                frameworkVersion: "5.0",
                incentive: { score: 100, label: "Maximum Bankability", evidence: "Guaranteed 15-year revenue stream covering all project costs.", citation: "SDE++ 2021" },
                statutory: { score: 80, label: "Budgetary Support", evidence: "Backed by the multi-billion Euro national Climate Fund.", citation: "Dutch Law" },
                liability: { score: 70, label: "Subsidy Contingency", evidence: "Financial support tied to verified geological storage performance.", citation: "RVO Terms" },
                mrv: { score: 90, label: "High Precision", evidence: "Integration with EU ETS accounting standards.", citation: "MRR Compliance" },
                market: { score: 85, label: "Hub Activation", evidence: "Crucial for triggering shared transport and storage infrastructure in Rotterdam.", citation: "Porthos Model" }
            }
        }
    }
];

batch10.forEach(np => {
    if (!db.policies.some(p => p.id === np.id)) {
        db.policies.push(np);
        console.log(`[Inventory] Final Sprint: Added ${np.id}`);
    }
});

db.lastUpdated = new Date().toISOString();
fs.writeFileSync(DB_PATH, JSON.stringify(db, null, 2), 'utf8');
