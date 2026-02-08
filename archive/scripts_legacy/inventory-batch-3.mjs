import fs from 'fs';

const DB_PATH = 'src/data/policy_database.json';
const db = JSON.parse(fs.readFileSync(DB_PATH, 'utf8'));

const batch3 = [
    {
        id: "cn-mee-env-guidance-2024",
        zh: {
            title: "关于加强碳捕集利用与封存项目环境管理工作的通知 (2024 试行)",
            country: "中国",
            scope: "National",
            legalWeight: "Departmental Rules",
            year: 2024,
            status: "Active",
            category: "Regulatory Framework",
            tags: ["环境管理", "环评要求", "封存安全"],
            description: "生态环境部发布的关于 CCUS 项目全生命周期环境管理的指导性文件，明确了环评 (EIA) 和泄漏风险防范的要求。",
            pubDate: "2024-11-01",
            url: "https://www.mee.gov.cn/",
            source: "生态环境部",
            analysis: {
                frameworkVersion: "5.0",
                incentive: { score: 30, label: "Compliance Driven", evidence: "Focuses on cost-of-compliance rather than direct subsidy.", citation: "Section 4: Risk Management" },
                statutory: { score: 80, label: "Environmental Mandates", evidence: "Integrates CCUS into the national EIA (Environmental Impact Assessment) system.", citation: "Section 2: Permitting and EIA" },
                liability: { score: 50, label: "Risk-based Monitoring", evidence: "Defines environmental monitoring obligations during the injection and post-closure phases.", citation: "Section 5: Closure and Aftercare" },
                mrv: { score: 90, label: "DMRV Alignment", evidence: "Mandates real-time environmental monitoring for leakage detection.", citation: "Section 3: Technical Requirements", auditNote: "Strong focus on the T dimension for safety." },
                market: { score: 40, label: "Non-market focus", evidence: "Primarily a safety/regulatory tool, limited market linkage.", citation: "General Principles" }
            }
        },
        en: {
            title: "Notice on Strengthening Environmental Management of CCUS Projects (2024 Trial)",
            country: "China",
            scope: "National",
            legalWeight: "Departmental Rules",
            year: 2024,
            status: "Active",
            category: "Regulatory Framework",
            tags: ["Environmental Management", "EIA", "Safety"],
            description: "A trial guidance from China's MEE establishing environmental standards for CCUS sites.",
            pubDate: "2024-11-01",
            url: "https://www.mee.gov.cn/",
            source: "MEE China",
            analysis: {
                frameworkVersion: "5.0",
                incentive: { score: 30, label: "Compliance focus", evidence: "Defines the regulatory floor for project safety.", citation: "Section 4" },
                statutory: { score: 80, label: "EIA Integration", evidence: "Standardizes environmental impact assessment for storage sites.", citation: "Section 2" },
                liability: { score: 50, label: "Environmental Liability", evidence: "Focuses on remediating leakage and environmental damage.", citation: "Section 5" },
                mrv: { score: 90, label: "Strict Monitoring", evidence: "Required high-precision leakage monitoring sensors.", citation: "Section 3" },
                market: { score: 40, label: "Regulatory Pillar", evidence: "Essential for social license to operate.", citation: "General Principles" }
            }
        }
    },
    {
        id: "in-union-budget-2026-ccus",
        zh: {
            title: "印度 2026 联邦预算 CCUS 专项拨款 (₹20,000 Crore)",
            country: "印度",
            scope: "National",
            legalWeight: "Primary Legislation",
            year: 2026,
            status: "Active",
            category: "Economic Incentive",
            tags: ["预算拨款", "重工业脱碳", "运输基础设施"],
            description: "印度历史上最大规模的 CCUS 资金分配，拨出 2000 亿卢比用于支持钢铁、水泥行业的碳捕集及共享运输基础设施。",
            pubDate: "2026-02-01",
            url: "https://www.indiabudget.gov.in/",
            source: "印度财政部",
            analysis: {
                frameworkVersion: "5.0",
                incentive: { score: 85, label: "₹20,000 Cr Grant/Subsidy", evidence: "Massive direct allocation for infrastructure and industry capture support.", citation: "Union Budget 2026-27, Pillar 4", auditNote: "Transformative financial anchor for India." },
                statutory: { score: 60, label: "Budget-backed Framework", evidence: "Legally enables spending but specific storage licensing is still evolving.", citation: "NITI Aayog Implementation Roadmap" },
                liability: { score: 40, label: "Nascent Liability Rules", evidence: "Focus is currently on deployment; long-term liability transfer details are pending.", citation: "Budget Annexure" },
                mrv: { score: 70, label: "Grant-linked MRV", evidence: "Funding is conditional on meeting emission reduction targets.", citation: "Scheme Guidelines" },
                market: { score: 75, label: "Hub-based Ecosystem", evidence: "Directly funds shared transport hubs to lower entry barriers for private players.", citation: "Infrastructure Pillar" }
            }
        },
        en: {
            title: "India Union Budget 2026 CCUS Allocation (₹20,000 Cr)",
            country: "India",
            scope: "National",
            legalWeight: "Primary Legislation",
            year: 2026,
            status: "Active",
            category: "Economic Incentive",
            tags: ["Budget", "Decarbonization", "Direct Funding"],
            description: "Allocates ₹20,000 crore (~$2.4B) to accelerate CCUS in heavy industries and CO2 infrastructure.",
            pubDate: "2026-02-01",
            url: "https://www.indiabudget.gov.in/",
            source: "Ministry of Finance, India",
            analysis: {
                frameworkVersion: "5.0",
                incentive: { score: 85, label: "Direct Subsidy", evidence: "Significant grant-based funding for hard-to-abate sectors.", citation: "Union Budget 2026-27" },
                statutory: { score: 60, label: "Implementation Roadmap", evidence: "Enables national strategy through fiscal power.", citation: "Section 12" },
                liability: { score: 40, label: "Under Development", evidence: "Liability transfer rules are in discussion phase.", citation: "Policy Appendix" },
                mrv: { score: 70, label: "Accountability Rules", evidence: "Standard reporting required for grant disbursement.", citation: "Operational Guidelines" },
                market: { score: 75, label: "Hub Enablement", evidence: "Prioritizes shared infrastructure to foster a hub market.", citation: "Pillar 4" }
            }
        }
    },
    {
        id: "vn-decree-119-2025",
        zh: {
            title: "越南第 119/2025/ND-CP 号法令 (碳市场与 CCUS)",
            country: "越南",
            scope: "National",
            legalWeight: "Administrative Regulation",
            year: 2025,
            status: "Active",
            category: "Market Mechanism",
            tags: ["越南碳市场", "ETS 试点", "信用产生"],
            description: "越南政府 2025 年发布的最新核心法令，确立了国内碳市场试点规则，并明确将 CCUS 减排量纳入信用产生机制。",
            pubDate: "2025-06-09",
            url: "https://netzero.vn/",
            source: "越南政府",
            analysis: {
                frameworkVersion: "5.0",
                incentive: { score: 60, label: "Credit Monetization", evidence: "Allows CCUS projects to generate credits for the upcoming ETS.", citation: "Article 15: Credit Generation" },
                statutory: { score: 75, label: "Market Legal Basis", evidence: "Provides the legal mandate for the 2025-2028 ETS pilot phase.", citation: "Article 1: Scope and Application", auditNote: "The critical engine for Southeast Asian CCUS." },
                liability: { score: 30, label: "Preliminary Rules", evidence: "Monitoring requirements are defined, but long-term transfer is not yet finalized.", citation: "Article 22" },
                mrv: { score: 80, label: "Mandatory Inventory", evidence: "Detailed requirements for GHG inventory and external verification.", citation: "Chapter 3: MRV Standards" },
                market: { score: 85, label: "Pilot ETS Integration", evidence: "Directly linked to the pilot ETS starting August 2025.", citation: "Article 30: Trading Rules" }
            }
        },
        en: {
            title: "Vietnam Decree No. 119/2025/ND-CP (Carbon Market & CCUS)",
            country: "Vietnam",
            scope: "National",
            legalWeight: "Administrative Regulation",
            year: 2025,
            status: "Active",
            category: "Market Mechanism",
            tags: ["Vietnam ETS", "Pilot Phase", "Carbon Credits"],
            description: "The core 2025 regulation enabling Vietnam's domestic carbon market and credit mechanisms for CCUS.",
            pubDate: "2025-06-09",
            url: "https://netzero.vn/",
            source: "Government of Vietnam",
            analysis: {
                frameworkVersion: "5.0",
                incentive: { score: 60, label: "Credit Monetization", evidence: "CCUS reduction is tradable under the new decree.", citation: "Article 15" },
                statutory: { score: 75, label: "ETS Mandate", evidence: "Establishes the legal framework for domestic carbon trading.", citation: "Article 1" },
                liability: { score: 30, label: "Early Stage", evidence: "Site care rules are still in conceptual phase.", citation: "Article 22" },
                mrv: { score: 80, label: "Inventory Rigor", evidence: "Strict reporting requirements for industrial participants.", citation: "Chapter 3" },
                market: { score: 85, label: "Direct ETS Link", evidence: "Linked to the pilot ETS commencing Aug 2025.", citation: "Article 30" }
            }
        }
    }
];

batch3.forEach(np => {
    if (!db.policies.some(p => p.id === np.id)) {
        db.policies.push(np);
        console.log(`[Inventory] Added APAC benchmark: ${np.id}`);
    }
});

db.lastUpdated = new Date().toISOString();
fs.writeFileSync(DB_PATH, JSON.stringify(db, null, 2), 'utf8');
