import fs from 'fs';

const DB_PATH = 'src/data/policy_database.json';
const db = JSON.parse(fs.readFileSync(DB_PATH, 'utf8'));

const batch4 = [
    {
        id: "br-law-14993-2024",
        zh: {
            title: "巴西第 14.993/2024 号联邦法 (未来燃料法案 - CCS 框架)",
            country: "巴西",
            scope: "National",
            legalWeight: "Primary Legislation",
            year: 2024,
            status: "Active",
            category: "Regulatory Framework",
            tags: ["拉美首法", "封存许可", "ANP 监管"],
            description: "巴西首个全面的 CCS 法律框架，确立了二氧化碳捕集、运输和地质封存的监管体系，授予 ANP 签发 30 年期特许经营权的权力。",
            pubDate: "2024-10-08",
            url: "https://www.in.gov.br/web/dou/-/lei-n-14.993-de-8-de-outubro-de-2024-589111445",
            source: "巴西联邦政府",
            analysis: {
                frameworkVersion: "5.0",
                incentive: { score: 50, label: "Regulatory Unlocking", evidence: "Expected to unlock R$ 260 billion in investments by providing legal certainty.", citation: "Law 14.993, Art. 1" },
                statutory: { score: 90, label: "Comprehensive CCS Law", evidence: "Standardizes permitting for 30 years + 30 years renewal.", citation: "Chapter IV: Carbon Capture and Storage", auditNote: "The definitive CCS anchor for Latin America." },
                liability: { score: 70, label: "Defined Oversight", evidence: "ANP regulates technical and safety liability during the operation phase.", citation: "Art. 22" },
                mrv: { score: 75, label: "Industrial Standards", evidence: "Mandates reporting to ANP for throughput and storage integrity.", citation: "Art. 25" },
                market: { score: 65, label: "Fuel Synergy", evidence: "Links CCS to the decarbonization of the national liquid fuel market.", citation: "Art. 5" }
            }
        },
        en: {
            title: "Brazil Law No. 14.993/2024 (Fuels of the Future - CCS Framework)",
            country: "Brazil",
            scope: "National",
            legalWeight: "Primary Legislation",
            year: 2024,
            status: "Active",
            category: "Regulatory Framework",
            tags: ["LATAM Milestone", "ANP Agency", "Permitting"],
            description: "Brazil's first comprehensive legal framework for CCS, empowering ANP to regulate the full value chain.",
            pubDate: "2024-10-08",
            url: "https://www.in.gov.br/web/dou/-/lei-n-14.993-de-8-de-outubro-de-2024-589111445",
            source: "Federal Government of Brazil",
            analysis: {
                frameworkVersion: "5.0",
                incentive: { score: 50, label: "Regulatory Unlocking", evidence: "Provides clarity to de-risk investment in low-carbon fuels.", citation: "Art. 1" },
                statutory: { score: 90, label: "Permit Framework", evidence: "Establishes a 30-year renewable permit regime managed by ANP.", citation: "Chapter IV" },
                liability: { score: 70, label: "Standard Oversight", evidence: "Defines operator obligations under federal safety standards.", citation: "Art. 22" },
                mrv: { score: 75, label: "Reporting Mandate", evidence: "Mandatory reporting of CO2 volumes to federal agencies.", citation: "Art. 25" },
                market: { score: 65, label: "Integration", evidence: "Part of a broader strategy to lead the global bio-economy.", citation: "Art. 5" }
            }
        }
    },
    {
        id: "sa-hydrogen-strategy-ccus",
        zh: {
            title: "沙特阿拉伯国家氢能战略 (CCUS 支柱)",
            country: "沙特阿拉伯",
            scope: "National",
            legalWeight: "Strategic Guidance",
            year: 2023,
            status: "Active",
            category: "Strategic Guidance",
            tags: ["蓝氢", "愿景 2030", "11Mtpa 目标"],
            description: "沙特成为全球氢能领袖的关键战略，将 CCUS 确定为蓝氢生产的核心使能技术，目标到 2035 年达到 1100 万吨/年的封存能力。",
            pubDate: "2023-01-01",
            url: "https://www.moenergy.gov.sa/",
            source: "沙特能源部",
            analysis: {
                frameworkVersion: "5.0",
                incentive: { score: 70, label: "State-backed Hubs", evidence: "Massive direct state investment in shared CCUS infrastructure hubs.", citation: "Hydrogen Pillar 3" },
                statutory: { score: 60, label: "Strategy Driven", evidence: "Provides high-level targets but detailed storage laws are still evolving under JOGMEC-like frameworks.", citation: "Vision 2030 Annex" },
                liability: { score: 40, label: "State Stewardship", evidence: "Liability is primarily managed via state-owned entities like Aramco.", citation: "Operational Framework" },
                mrv: { score: 65, label: "Internal Standards", evidence: "Relies on rigorous internal mass balance but external MRV transparency is increasing.", citation: "Energy Strategy Sub-section" },
                market: { score: 80, label: "Hydrogen Synergy", evidence: "Strong market pull via international blue hydrogen export agreements.", citation: "Trade Section", auditNote: "M dimension score boosted by export focus." }
            }
        },
        en: {
            title: "Saudi Arabia National Hydrogen Strategy (CCUS Pillar)",
            country: "Saudi Arabia",
            scope: "National",
            legalWeight: "Strategic Guidance",
            year: 2023,
            status: "Active",
            category: "Strategic Guidance",
            tags: ["Blue Hydrogen", "Vision 2030", "11 Mtpa Target"],
            description: "A strategic roadmap positioning CCUS as the backbone for blue hydrogen production and industrial decarbonization.",
            pubDate: "2023-01-01",
            url: "https://www.moenergy.gov.sa/",
            source: "Ministry of Energy, Saudi Arabia",
            analysis: {
                frameworkVersion: "5.0",
                incentive: { score: 70, label: "Investment Support", evidence: "Direct financing for CCS hubs to enable low-carbon hydrogen.", citation: "Pillar 3" },
                statutory: { score: 60, label: "High-level Targets", evidence: "National goals established; regulatory details under drafting.", citation: "Hydrogen Strategy" },
                liability: { score: 40, label: "Corporate Management", evidence: "Aramco-led stewardship under ministry oversight.", citation: "Framework Section" },
                mrv: { score: 65, label: "Internal Metrics", evidence: "Usage of standardized internal reporting for carbon intensity.", citation: "Technical Annex" },
                market: { score: 80, label: "Global Trade", evidence: "Linked to global hydrogen demand and supply chains.", citation: "Trade Pillar" }
            }
        }
    },
    {
        id: "intl-paris-art-6-4-ccs",
        zh: {
            title: "巴黎协定第 6.4 条 - CCS 碳清除标准",
            country: "国际",
            scope: "International",
            legalWeight: "Primary Legislation",
            year: 2024,
            status: "Active",
            category: "Market Mechanism",
            tags: ["巴黎协定", "跨境信用", "COP29"],
            description: "巴黎协定下的全球碳信用机制标准，2024 年正式批准了涉及 CCS 的碳清除活动准则，开启了 CCUS 跨境交易的法律通道。",
            pubDate: "2024-10-01",
            url: "https://unfccc.int/process-and-meetings/the-paris-agreement/article-64-mechanism",
            source: "UNFCCC",
            analysis: {
                frameworkVersion: "5.0",
                incentive: { score: 65, label: "Global Credit Access", evidence: "Enables host countries to monetize CCS removals via international markets.", citation: "Standard for Carbon Removals, 2024" },
                statutory: { score: 85, label: "Global Legal Standard", evidence: "The supreme international framework for carbon crediting under the UN.", citation: "CMA.6 Endorsement", auditNote: "The definitive global M-dimension anchor." },
                liability: { score: 80, label: "Permanence Safeguards", evidence: "Mandates 100+ years durability and reversal risk management/buffer pools.", citation: "Methodology Section 4" },
                mrv: { score: 95, label: "Universal MRV", evidence: "Highest level of monitoring stringency required for ITMO issuance.", citation: "SBM 014 Report" },
                market: { score: 100, label: "Global Interoperability", evidence: "The ultimate mechanism for sovereign and corporate carbon trade.", citation: "Article 6.4 trading rules" }
            }
        },
        en: {
            title: "Paris Agreement Article 6.4 - CCS Removal Standards",
            country: "International",
            scope: "International",
            legalWeight: "Primary Legislation",
            year: 2024,
            status: "Active",
            category: "Market Mechanism",
            tags: ["Paris Agreement", "COP29", "Carbon Removals"],
            description: "International standards for crediting CCS-based removals under the Paris Agreement Mechanism.",
            pubDate: "2024-10-01",
            url: "https://unfccc.int/process-and-meetings/the-paris-agreement/article-64-mechanism",
            source: "UNFCCC",
            analysis: {
                frameworkVersion: "5.0",
                incentive: { score: 65, label: "International Revenue", evidence: "Market access via Article 6.4 ITMOs.", citation: "UNFCCC SBM Standards" },
                statutory: { score: 85, label: "UN Mandate", evidence: "Highest level of international climate policy authority.", citation: "COP29 / CMA.6" },
                liability: { score: 80, label: "Permanence Rules", evidence: "Requires multi-generational durability and buffer mechanisms.", citation: "Removal Standard Section 4" },
                mrv: { score: 95, label: "Universal Standards", evidence: "Mandatory third-party DOE verification under SBM rules.", citation: "Article 6.4 Methodologies" },
                market: { score: 100, label: "Max Liquidity", evidence: "Designed for full global carbon market integration.", citation: "Trading Guidelines" }
            }
        }
    }
];

batch4.forEach(np => {
    if (!db.policies.some(p => p.id === np.id)) {
        db.policies.push(np);
        console.log(`[Inventory] Added International/Global benchmark: ${np.id}`);
    }
});

db.lastUpdated = new Date().toISOString();
fs.writeFileSync(DB_PATH, JSON.stringify(db, null, 2), 'utf8');
