import fs from 'fs';

const DB_PATH = 'src/data/policy_database.json';
const db = JSON.parse(fs.readFileSync(DB_PATH, 'utf8'));

const batch2 = [
    {
        id: "icao-corsia-ccu-2024",
        zh: {
            title: "ICAO CORSIA 可见减排燃料 (CCU) 核算方法学",
            country: "国际",
            scope: "International",
            legalWeight: "Primary Legislation",
            year: 2024,
            status: "Active",
            category: "Market Mechanism",
            tags: ["航空脱碳", "CORSIA", "10%减排门槛"],
            description: "国际民航组织制定的核心技术标准，规定了基于捕集二氧化碳生产的航空燃料如何通过 10% 的生命周期减排门槛并获得信用抵消。",
            pubDate: "2024-03-01",
            url: "https://www.icao.int/environmental-protection/CORSIA/Pages/CORSIA-Eligible-Fuels.aspx",
            source: "ICAO",
            analysis: {
                frameworkVersion: "5.0",
                incentive: { score: 75, label: "Market Access via CEF", evidence: "Certified CCU-based aviation fuels enable operators to reduce mandatory offsetting obligations.", citation: "CORSIA Methodology for Calculating Actual Life Cycle Emissions Values" },
                statutory: { score: 90, label: "Global Treaty Power", evidence: "Binding international aviation law adopted via ICAO Assembly Resolutions.", citation: "SARPs Annex 16, Vol IV" },
                liability: { score: 60, label: "LCA Accuracy Responsibility", evidence: "Liability focused on the life-cycle carbon intensity verification of the fuel pathway.", citation: "ICAO Document 9501" },
                mrv: { score: 95, label: "Full Lifecycle MRV", evidence: "Requires a mandatory 10% net reduction compared to conventional fuel, verified via independent audit.", citation: "CORSIA Methodology, Section 2.1" },
                market: { score: 100, label: "The Global Aviation Market", evidence: "The only universal mechanism for international aviation emission trade and fuel certification.", citation: "Article 6.4 Linkage Guidance" }
            }
        },
        en: {
            title: "ICAO CORSIA Eligible Fuels (CCU) Methodology",
            country: "International",
            scope: "International",
            legalWeight: "Primary Legislation",
            year: 2024,
            status: "Active",
            category: "Market Mechanism",
            tags: ["Aviation", "CORSIA", "SAF"],
            description: "A specialized methodology establishing the technical rules for certifying CCU-based fuels under the global aviation carbon scheme.",
            pubDate: "2024-03-01",
            url: "https://www.icao.int/environmental-protection/CORSIA/Pages/CORSIA-Eligible-Fuels.aspx",
            source: "ICAO",
            analysis: {
                frameworkVersion: "5.0",
                incentive: { score: 75, label: "Offset Reduction", evidence: "Allows CEF fuels to directly reduce airlines' carbon tax/offset burden.", citation: "CORSIA Supporting Document" },
                statutory: { score: 90, label: "UN Authority", evidence: "Binding SARPs (Standards and Recommended Practices) enforced by the UN.", citation: "Annex 16" },
                liability: { score: 60, label: "Verification Liability", evidence: "Defined by ICAO's certification bodies.", citation: "Methodology Annex" },
                mrv: { score: 95, label: "10% Reduction Threshold", evidence: "Mandatory 10% lower life cycle emissions than baseline jet fuel.", citation: "ICAO Default Values" },
                market: { score: 100, label: "Total Liquidity", evidence: "Designed for full cross-border interoperability in aviation.", citation: "CORSIA Trading Rules" }
            }
        }
    },
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
            tags: ["碳移除", "永久性封存", "数个世纪"],
            description: "欧盟制定的全球首个法定的碳移除认证标准，明确永久性碳移除必须实现“数个世纪”的存储时长，并引入了 QU.A.L.ITY 准则。",
            pubDate: "2024-11-27",
            url: "https://eur-lex.europa.eu/legal-content/EN/TXT/?uri=CELEX:32024R3012",
            source: "European Parliament",
            analysis: {
                frameworkVersion: "5.0",
                incentive: { score: 65, label: "Certification Premium", evidence: "Provides a state-backed seal of quality, enabling high-value credit sales.", citation: "Regulation (EU) 2024/3012, Article 1" },
                statutory: { score: 90, label: "EU Regulation", evidence: "Binding EU law establishing standardized criteria for carbon removal activities.", citation: "Article 4: QU.A.L.ITY Criteria" },
                liability: { score: 95, label: "Century-scale Permanence", evidence: "Permanent carbon removals must demonstrate storage for several centuries.", citation: "Regulation 2024/3012, Article 6" },
                mrv: { score: 95, label: "Certification Rigor", evidence: "Mandatory independent quantification and verification by certification bodies.", citation: "Chapter III" },
                market: { score: 90, label: "Voluntary-to-Compliance Bridge", evidence: "Designed to underpin the future removal market in EU ETS.", citation: "Article 12" }
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
            tags: ["Carbon Removals", "Permanence", "EU Law"],
            description: "The official EU framework for certifying permanent carbon removals, requiring multi-century durability.",
            pubDate: "2024-11-27",
            url: "https://eur-lex.europa.eu/legal-content/EN/TXT/?uri=CELEX:32024R3012",
            source: "European Parliament",
            analysis: {
                frameworkVersion: "5.0",
                incentive: { score: 65, label: "Integrity Premium", evidence: "Validated removals gain access to premium carbon markets.", citation: "Art 1" },
                statutory: { score: 90, label: "Full Harmonization", evidence: "Harmonizes carbon removal rules across all EU Member States.", citation: "Art 4" },
                liability: { score: 95, label: "Multi-century Storage", evidence: "Permanent storage must last for several centuries.", citation: "Article 6" },
                mrv: { score: 95, label: "Certified Quantities", evidence: "Stringent monitoring and quantification standards under independent audit.", citation: "Chapter III" },
                market: { score: 90, label: "High-trust Credits", evidence: "Aimed at building a high-integrity voluntary carbon removal market.", citation: "Art 12" }
            }
        }
    }
];

batch2.forEach(np => {
    const idx = db.policies.findIndex(p => p.id === np.id);
    if (idx !== -1) {
        db.policies[idx] = np;
        console.log(`[Traceable Audit] Upgraded ${np.id} with high-fidelity citations.`);
    }
});

db.lastUpdated = new Date().toISOString();
fs.writeFileSync(DB_PATH, JSON.stringify(db, null, 2), 'utf8');