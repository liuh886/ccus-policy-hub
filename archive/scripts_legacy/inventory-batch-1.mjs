import fs from 'fs';

const DB_PATH = 'src/data/policy_database.json';
const db = JSON.parse(fs.readFileSync(DB_PATH, 'utf8'));

const newPolicies = [
    {
        id: "eu-ccs-directive",
        zh: {
            title: "欧盟 CCS 指令 (2009/31/EC)",
            country: "欧盟",
            scope: "National",
            legalWeight: "Primary Legislation",
            year: 2009,
            status: "Active",
            category: "Regulatory Framework",
            tags: ["欧盟母法", "封存许可", "责任移交"],
            description: "欧盟关于二氧化碳地质封存的核心法律框架，确立了选址、许可、监测和责任移交的统一标准。",
            pubDate: "2009-04-23",
            plr_index: 85,
            url: "https://eur-lex.europa.eu/legal-content/EN/TXT/?uri=CELEX:32009L0031",
            source: "European Parliament",
            analysis: {
                frameworkVersion: "5.0",
                incentive: { score: 40, label: "Indirect (via ETS)", evidence: "Enables MS to provide aid and exempts stored CO2 from ETS surrendering.", citation: "Article 12 & 13" },
                statutory: { score: 90, label: "Permitting Regime", evidence: "Establishes a mandatory legal framework for storage permits across EU.", citation: "Chapter 3: Storage Permits", auditNote: "Identified as the highest legal anchor for Europe." },
                liability: { score: 85, label: "20-Year State Transfer", evidence: "Responsibility transfers to the competent authority 20 years post-closure.", citation: "Article 18" },
                mrv: { score: 80, label: "Standardized Monitoring", evidence: "Mandates continuous monitoring and corrective measures for leakages.", citation: "Annex II" },
                market: { score: 60, label: "ETS Linkage", evidence: "Explicitly linked to EU ETS Directive for emission accounting.", citation: "Article 12" }
            }
        },
        en: {
            title: "EU CCS Directive (2009/31/EC)",
            country: "European Union",
            scope: "National",
            legalWeight: "Primary Legislation",
            year: 2009,
            status: "Active",
            category: "Regulatory Framework",
            tags: ["EU Base Law", "Storage Permit", "Liability"],
            description: "The primary legal framework for the environmentally safe geological storage of CO2 in the EU.",
            pubDate: "2009-04-23",
            plr_index: 85,
            url: "https://eur-lex.europa.eu/legal-content/EN/TXT/?uri=CELEX:32009L0031",
            source: "European Parliament",
            analysis: {
                frameworkVersion: "5.0",
                incentive: { score: 40, label: "Indirect (via ETS)", evidence: "Enables MS to provide aid and exempts stored CO2 from ETS surrendering.", citation: "Article 12 & 13" },
                statutory: { score: 90, label: "Permitting Regime", evidence: "Establishes a mandatory legal framework for storage permits across EU.", citation: "Chapter 3: Storage Permits" },
                liability: { score: 85, label: "20-Year State Transfer", evidence: "Responsibility transfers to the competent authority 20 years post-closure.", citation: "Article 18" },
                mrv: { score: 80, label: "Standardized Monitoring", evidence: "Mandates continuous monitoring and corrective measures for leakages.", citation: "Annex II" },
                market: { score: 60, label: "ETS Linkage", evidence: "Explicitly linked to EU ETS Directive for emission accounting.", citation: "Article 12" }
            }
        }
    },
    {
        id: "uk-energy-act-2023",
        zh: {
            title: "英国 2023 能源法 (CCUS 商业模式)",
            country: "英国",
            scope: "National",
            legalWeight: "Primary Legislation",
            year: 2023,
            status: "Active",
            category: "Market Mechanism",
            tags: ["商业模式", "DPA/ICC", "受监管资产基础"],
            description: "英国里程碑式立法，为 CCUS 商业模型（如可调度电力协议 DPA 和工业碳捕集 ICC）提供了法律效力和资金保障机制。",
            pubDate: "2023-10-26",
            plr_index: 92,
            url: "https://www.legislation.gov.uk/ukpga/2023/67/contents/enacted",
            source: "UK Government",
            analysis: {
                frameworkVersion: "5.0",
                incentive: { score: 95, label: "Bankable Revenue Models", evidence: "Legally enables long-term DPAs and ICC contracts with price certainty.", citation: "Part 2: Carbon Capture and Storage", auditNote: "Global benchmark for subsidy design." },
                statutory: { score: 85, label: "Full-chain Regulation", evidence: "Provides licensing powers for T&S operators and network codes.", citation: "Chapter 1: Licensing of CO2 Transport" },
                liability: { score: 70, label: "Economic Liability Framework", evidence: "Defines financial obligations for decommissioning and leakage.", citation: "Part 2, Section 15" },
                mrv: { score: 80, label: "Subsidy-linked MRV", evidence: "Strict monitoring required to trigger payments under ICC/DPA models.", citation: "Section 32" },
                market: { score: 90, label: "RAB Model Implementation", evidence: "First law to implement Regulated Asset Base model for CO2 transport.", citation: "Chapter 2: Economic Regulation" }
            }
        },
        en: {
            title: "UK Energy Act 2023 (CCUS Business Models)",
            country: "United Kingdom",
            scope: "National",
            legalWeight: "Primary Legislation",
            year: 2023,
            status: "Active",
            category: "Market Mechanism",
            tags: ["Business Models", "DPA/ICC", "RAB"],
            description: "Milestone legislation enabling commercial frameworks for CCUS deployment in the UK.",
            pubDate: "2023-10-26",
            plr_index: 92,
            url: "https://www.legislation.gov.uk/ukpga/2023/67/contents/enacted",
            source: "UK Government",
            analysis: {
                frameworkVersion: "5.0",
                incentive: { score: 95, label: "Bankable Revenue Models", evidence: "Legally enables long-term DPAs and ICC contracts with price certainty.", citation: "Part 2: Carbon Capture and Storage" },
                statutory: { score: 85, label: "Full-chain Regulation", evidence: "Provides licensing powers for T&S operators and network codes.", citation: "Chapter 1: Licensing of CO2 Transport" },
                liability: { score: 70, label: "Economic Liability Framework", evidence: "Defines financial obligations for decommissioning and leakage.", citation: "Part 2, Section 15" },
                mrv: { score: 80, label: "Subsidy-linked MRV", evidence: "Strict monitoring required to trigger payments under ICC/DPA models.", citation: "Section 32" },
                market: { score: 90, label: "RAB Model Implementation", evidence: "First law to implement Regulated Asset Base model for CO2 transport.", citation: "Chapter 2: Economic Regulation" }
            }
        }
    }
];

// 去重录入
newPolicies.forEach(np => {
    if (!db.policies.some(p => p.id === np.id)) {
        db.policies.push(np);
        console.log(`[Inventory] Added new benchmark: ${np.id}`);
    } else {
        console.log(`[Skip] ${np.id} already exists.`);
    }
});

db.lastUpdated = new Date().toISOString();
fs.writeFileSync(DB_PATH, JSON.stringify(db, null, 2), 'utf8');
