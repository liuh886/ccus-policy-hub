import fs from 'fs';

const DB_PATH = 'src/data/policy_database.json';
const db = JSON.parse(fs.readFileSync(DB_PATH, 'utf8'));

const batch7 = [
    {
        id: "eu-crcf-2024",
        zh: {
            title: "欧盟碳移除认证框架 (CRCF - 2024/3012)",
            country: "欧盟",
            scope: "National",
            legalWeight: "Primary Legislation",
            year: 2024,
            status: "Active",
            category: "Technical Standard",
            tags: ["碳移除", "认证标准", "QU.A.L.ITY"],
            description: "欧盟首个全联盟范围内的自愿认证框架，规定了永久碳移除、碳耕作和产品碳封存的 QU.A.L.ITY 质量标准。",
            pubDate: "2024-11-27",
            url: "https://eur-lex.europa.eu/legal-content/EN/TXT/?uri=CELEX:32024R3012",
            source: "European Parliament",
            analysis: {
                frameworkVersion: "5.0",
                incentive: { score: 65, label: "Certification Value", evidence: "Enables certified removals to be monetized in voluntary and potentially compliance markets.", citation: "Article 1: Subject Matter" },
                statutory: { score: 85, label: "EU-wide Harmonization", evidence: "Sets uniform certification rules across all Member States.", citation: "Article 4: QU.A.L.ITY Criteria" },
                liability: { score: 80, label: "Permanence Focus", evidence: "Activities must ensure carbon remains stored for centuries; aligned with CCS Directive.", citation: "Article 6: Long-term Storage" },
                mrv: { score: 95, label: "High-integrity MRV", evidence: "Mandatory quantification and verification by independent certification bodies.", citation: "Chapter III: Certification Process", auditNote: "A new global high-score for T-dimension in CDR." },
                market: { score: 90, label: "Trust-based Market", evidence: "Designed to eliminate greenwashing and build high-trust carbon credit markets.", citation: "Article 12: Certification Schemes" }
            }
        },
        en: {
            title: "EU Carbon Removal Certification Framework (CRCF - 2024/3012)",
            country: "European Union",
            scope: "National",
            legalWeight: "Primary Legislation",
            year: 2024,
            status: "Active",
            category: "Technical Standard",
            tags: ["Carbon Removal", "Certification", "QU.A.L.ITY"],
            description: "The first EU-wide framework for certifying high-quality carbon removals based on standardized criteria.",
            pubDate: "2024-11-27",
            url: "https://eur-lex.europa.eu/legal-content/EN/TXT/?uri=CELEX:32024R3012",
            source: "European Parliament",
            analysis: {
                frameworkVersion: "5.0",
                incentive: { score: 65, label: "Market Premium", evidence: "Facilitates premium pricing for high-integrity removals.", citation: "Article 1" },
                statutory: { score: 85, label: "Harmonized Rules", evidence: "Replaces fragmented local standards with a unified EU regulation.", citation: "Article 4" },
                liability: { score: 80, label: "Permanence Safeguards", evidence: "Explicit requirement for multi-century storage durations.", citation: "Article 6" },
                mrv: { score: 95, label: "Rigorous Quantification", evidence: "Mandatory independent auditing and standardized quantification protocols.", citation: "Chapter III" },
                market: { score: 90, label: "Integrity Anchor", evidence: "Eliminates greenwashing to foster robust carbon credit investment.", citation: "Article 12" }
            }
        }
    },
    {
        id: "tx-hb-1284-ccus",
        zh: {
            title: "美国德克萨斯州 HB 1284 号法案 (RRC 管辖权法)",
            country: "美国",
            scope: "Sub-national",
            region: "德克萨斯州",
            legalWeight: "Primary Legislation",
            year: 2021,
            status: "Active",
            category: "Regulatory Framework",
            tags: ["RRC监管", "德州Primacy", "管辖权整合"],
            description: "德州关键立法，将所有二氧化碳封存井的监管权限集中至德州铁路委员会 (RRC)，为德州获得 EPA 联邦授权扫清了法律障碍。",
            pubDate: "2021-06-09",
            url: "https://capitol.texas.gov/BillLookup/History.aspx?LegSess=87R&Bill=HB1284",
            source: "Texas Legislature",
            analysis: {
                frameworkVersion: "5.0",
                incentive: { score: 40, label: "Regulatory Efficiency", evidence: "Streamlines permitting by creating a 'one-stop-shop' at the RRC.", citation: "Section 1: RRC Authority" },
                statutory: { score: 95, label: "Consolidated Jurisdiction", evidence: "Grants RRC sole jurisdiction over onshore and offshore CO2 sequestration.", citation: "HB 1284, Section 2", auditNote: "The blueprint for jurisdictional consolidation in US oil states." },
                liability: { score: 75, label: "Financial Security", evidence: "Requires operators to provide financial assurance for well plugging and remediation.", citation: "Texas Water Code Section 27.041" },
                mrv: { score: 85, label: "UIC Alignment", evidence: "Matches or exceeds EPA Class VI monitoring standards to enable primacy.", citation: "RRC Implementation Rules" },
                market: { score: 65, label: "Hub Attraction", evidence: "Critical for attracting major offshore CCS hubs to the Texas Gulf Coast.", citation: "Bill Intent" }
            }
        },
        en: {
            title: "Texas House Bill 1284 (RRC Jurisdiction Act)",
            country: "United States",
            scope: "Sub-national",
            region: "Texas",
            legalWeight: "Primary Legislation",
            year: 2021,
            status: "Active",
            category: "Regulatory Framework",
            tags: ["Texas RRC", "Primacy", "Consolidation"],
            description: "Legislation consolidating regulatory authority for CO2 injection wells under the Railroad Commission of Texas.",
            pubDate: "2021-06-09",
            url: "https://capitol.texas.gov/BillLookup/History.aspx?LegSess=87R&Bill=HB1284",
            source: "Texas Legislature",
            analysis: {
                frameworkVersion: "5.0",
                incentive: { score: 40, label: "Streamlined Permits", evidence: "Reduces regulatory burden via a single state agency model.", citation: "Section 1" },
                statutory: { score: 95, label: "Sole Jurisdiction", evidence: "Empowers RRC as the sole regulator for Texas sequestration.", citation: "HB 1284" },
                liability: { score: 75, label: "Financial Assurance", evidence: "Mandates bonding and insurance for site care.", citation: "Water Code 27.041" },
                mrv: { score: 85, label: "Primacy Prep", evidence: "Strict adherence to EPA monitoring benchmarks.", citation: "Section 27.048" },
                market: { score: 65, label: "Gulf Coast Competitive", evidence: "Enables rapid development of massive Gulf Coast storage hubs.", citation: "Policy Goals" }
            }
        }
    },
    {
        id: "intl-ccs-plus-framework",
        zh: {
            title: "CCS+ Initiative 全球碳核算框架",
            country: "国际",
            scope: "International",
            legalWeight: "Technical Standard",
            year: 2021,
            status: "Active",
            category: "Technical Standard",
            tags: ["方法学", "碳交易", "自愿市场"],
            description: "由全球多个利益相关方发起的倡议，旨在为 CCUS 全价值链建立高标准的碳核算方法学，已成为 Verra 等标准的核心参考。",
            pubDate: "2021-01-01",
            url: "https://www.ccsplus.org/methodologies/",
            source: "CCS+ Initiative",
            analysis: {
                frameworkVersion: "5.0",
                incentive: { score: 60, label: "Credit Viability", evidence: "Enables projects to access finance via certified carbon removals.", citation: "CCS+ Methodology v1.0" },
                statutory: { score: 50, label: "Standard-led", evidence: "Not a law, but a widely adopted industry standard for accounting.", citation: "General Framework" },
                liability: { score: 75, label: "Molecular Tracking", evidence: "Requires tracking of CO2 permanence across capture, transport and storage.", citation: "Standard for Geological Storage" },
                mrv: { score: 95, label: "Methodological Rigor", evidence: "Developed via multi-stakeholder consensus to meet highest environmental integrity.", citation: "Accounting Principles", auditNote: "The brain behind modern voluntary CCUS credits." },
                market: { score: 95, label: "Inter-market Linkage", evidence: "Designed for use in both Article 6 mechanisms and voluntary carbon markets.", citation: "Market Integration Module" }
            }
        },
        en: {
            title: "CCS+ Initiative Global Accounting Framework",
            country: "International",
            scope: "International",
            legalWeight: "Technical Standard",
            year: 2021,
            status: "Active",
            category: "Technical Standard",
            tags: ["Methodology", "Accounting", "Voluntary Market"],
            description: "A robust methodological framework for CCUS accounting, serving as the basis for major voluntary carbon standards.",
            pubDate: "2021-01-01",
            url: "https://www.ccsplus.org/methodologies/",
            source: "CCS+ Initiative",
            analysis: {
                frameworkVersion: "5.0",
                incentive: { score: 60, label: "Finance Enabler", evidence: "Provides the tools to quantify removals for credit generation.", citation: "Standard Module" },
                statutory: { score: 50, label: "Industry Consensus", evidence: "A dominant technical standard in the global CCUS economy.", citation: "Core Principles" },
                liability: { score: 75, label: "Risk Mitigation", evidence: "Standardized protocols for reversal risk and buffer management.", citation: "Storage Protocol" },
                mrv: { score: 95, label: "Maximum Integrity", evidence: "Ensures no double-counting and precise mass balance.", citation: "Accounting Methodology" },
                market: { score: 95, label: "Universal Standard", evidence: "Compatible with Article 6 and private credit registries.", citation: "Market Linkage" }
            }
        }
    }
];

batch7.forEach(np => {
    if (!db.policies.some(p => p.id === np.id)) {
        db.policies.push(np);
        console.log(`[Inventory] Added Credits/Statute benchmark: ${np.id}`);
    }
});

db.lastUpdated = new Date().toISOString();
fs.writeFileSync(DB_PATH, JSON.stringify(db, null, 2), 'utf8');
