import fs from 'fs';

const DB_PATH = 'src/data/policy_database.json';
const db = JSON.parse(fs.readFileSync(DB_PATH, 'utf8'));

const batchB = [
    {
        id: "br-anp-ccs-resolution",
        zh: {
            title: "巴西 ANP CCS 授权与监管决议 (基于 14.993 号法)",
            country: "巴西",
            scope: "National",
            legalWeight: "Departmental Rules",
            year: 2024,
            status: "Active",
            category: "Regulatory Framework",
            tags: ["ANP监管", "特许经营细则", "泄漏清单"],
            description: "国家石油、天然气和生物燃料管理局 (ANP) 发布的具体执行准则，规定了 CCS 30 年特许经营权的授权流程及强制性的碳泄漏核算要求。",
            pubDate: "2024-10-08",
            url: "https://www.gov.br/anp/",
            source: "ANP Brazil",
            analysis: {
                frameworkVersion: "5.0",
                incentive: { score: 55, label: "Permit Security", evidence: "Provides long-term 30-year renewable concession visibility.", citation: "Law 14.993, Art. 12" },
                statutory: { score: 90, label: "Agency Oversight", evidence: "Empowers ANP as the single regulator for full-chain CCS.", citation: "Federal Law 14.993/2024" },
                liability: { score: 75, label: "Validated Records", evidence: "Requires validated records of CO2 storage for emergency management.", citation: "ANP Operational Guidelines" },
                mrv: { score: 85, label: "Leakage Inventory", evidence: "Mandates a detailed inventory of carbon storage and leakage for credit certification.", citation: "Art. 22: Monitoring Mandates", auditNote: "Strong linkage between T and M dimensions." },
                market: { score: 70, label: "Credit Readiness", evidence: "Explicitly aligns storage data with carbon credit issuance criteria.", citation: "Art. 25" }
            }
        },
        en: {
            title: "Brazil ANP Resolution on CCS Authorization (Law 14.993)",
            country: "Brazil",
            scope: "National",
            legalWeight: "Departmental Rules",
            year: 2024,
            status: "Active",
            category: "Regulatory Framework",
            tags: ["ANP", "Concession", "Leakage Inventory"],
            description: "Detailed regulatory resolution defining the application process for 30-year CCS permits and mandatory inventory standards.",
            pubDate: "2024-10-08",
            url: "https://www.gov.br/anp/",
            source: "ANP Brazil",
            analysis: {
                frameworkVersion: "5.0",
                incentive: { score: 55, label: "Concession Stability", evidence: "Long-term permits provide the fiscal basis for infrastructure investment.", citation: "Art 12" },
                statutory: { score: 90, label: "Regulatory Agency", evidence: "Centralized authority under the National Petroleum Agency.", citation: "Law 14.993" },
                liability: { score: 75, label: "Safety Management", evidence: "Mandatory validated records for leak response.", citation: "Operational Rules" },
                mrv: { score: 85, label: "Credit Certification", evidence: "Mandatory leakage inventory for carbon market integration.", citation: "Art 22" },
                market: { score: 70, label: "Carbon Market Sync", evidence: "Integrates technical data into credit issuance pathways.", citation: "Art 25" }
            }
        }
    },
    {
        id: "jp-meti-specified-zones-2024",
        zh: {
            title: "日本 METI CCS 指定区域与招标指南 (2024)",
            country: "日本",
            scope: "National",
            legalWeight: "Guideline/Policy",
            year: 2024,
            status: "Active",
            category: "Regulatory Framework",
            tags: ["指定区域", "勘探投标", "Tomakomai"],
            description: "经济产业省 (METI) 发布的指南，规定了如何划定 CCS “指定区域”并进行公开招标，以授予勘探和商业运营权。",
            pubDate: "2024-11-18",
            url: "https://www.meti.go.jp/english/press/2024/1118_001.html",
            source: "METI Japan",
            analysis: {
                frameworkVersion: "5.0",
                incentive: { score: 65, label: "Auctioned Support", evidence: "Tenders include integrated subsidies for exploratory drilling.", citation: "JOGMEC FY2024 Tender Rules" },
                statutory: { score: 95, label: "Designated Area Law", evidence: "METI has the power to designate and tender exclusive storage zones.", citation: "Act No. 38 of 2024, Art. 3", auditNote: "Strong S-dimension for sovereign resource management." },
                liability: { score: 70, label: "State-backed Risks", evidence: "State provides technical de-risking for early exploration drilling.", citation: "CCS Business Act, Chapter 4" },
                mrv: { score: 85, label: "Zone-specific MRV", evidence: "Mandatory monitoring standards specific to the geological characteristics of designated zones.", citation: "Safety Regulations Annex" },
                market: { score: 75, label: "Competitive Entry", evidence: "Uses a public tender system to select most efficient operators.", citation: "METI Bidding Guidelines" }
            }
        },
        en: {
            title: "Japan METI Specified Zones & CCS Tender Guidelines (2024)",
            country: "Japan",
            scope: "National",
            legalWeight: "Guideline/Policy",
            year: 2024,
            status: "Active",
            category: "Regulatory Framework",
            tags: ["Specified Zones", "Tendering", "Exploration"],
            description: "METI guidelines for designating CCS zones and conducting tenders for exploration and business permits.",
            pubDate: "2024-11-18",
            url: "https://www.meti.go.jp/english/press/2024/1118_001.html",
            source: "METI Japan",
            analysis: {
                frameworkVersion: "5.0",
                incentive: { score: 65, label: "Tender-linked Aid", evidence: "Couples site rights with exploratory subsidies.", citation: "METI Guidelines" },
                statutory: { score: 95, label: "Sovereign Zoning", evidence: "Legal authority to designate offshore storage zones.", citation: "Act 38 of 2024" },
                liability: { score: 70, label: "Regulatory Oversight", evidence: "Strict liability rules for operators in specified zones.", citation: "Safety Rules" },
                mrv: { score: 85, label: "Rigorous Monitoring", evidence: "Specific requirements for seismic and plume tracking in tenders.", citation: "Annex III" },
                market: { score: 75, label: "Market Selection", evidence: "Enables private sector entry via a competitive bidding process.", citation: "Chapter 2 Rules" }
            }
        }
    },
    {
        id: "kr-motie-cluster-district-2025",
        zh: {
            title: "韩国 MOTIE CCUS 专项产业集群认定标准",
            country: "韩国",
            scope: "National",
            legalWeight: "Departmental Rules",
            year: 2025,
            status: "Active",
            category: "Strategic Guidance",
            tags: ["产业集群", "租金减免", "MOTIE"],
            description: "韩国产业通商资源部 (MOTIE) 发布的标准，规定了如何申请“CCUS 战略集群”，申请获批后可获得公共地产租金减免和国家项目优先权。",
            pubDate: "2025-02-06",
            url: "https://www.motie.go.kr/",
            source: "MOTIE Korea",
            analysis: {
                frameworkVersion: "5.0",
                incentive: { score: 80, label: "Public Property Benefits", evidence: "Provides reduced rents for public properties and direct national project subsidies.", citation: "CCUS Act 2024, Article 10" },
                statutory: { score: 85, label: "Cluster District Law", evidence: "Enables mayors/governors to apply for specialized districts with legal standing.", citation: "Article 9: District Designation", auditNote: "Strong cluster-based governance model." },
                liability: { score: 50, label: "Collective Responsibility", evidence: "Encourages shared safety infrastructure within clusters.", citation: "Safety Management Plan Requirements" },
                mrv: { score: 75, label: "Unified Monitoring", evidence: "Requires cluster-level unified emission inventory and verification.", citation: "Article 32" },
                market: { score: 80, label: "Scale Aggregation", evidence: "Aims to foster a competitive domestic industry by co-locating capture and storage players.", citation: "Strategic Plan Annex" }
            }
        },
        en: {
            title: "Korea MOTIE CCUS Strategic Cluster Designation Criteria",
            country: "South Korea",
            scope: "National",
            legalWeight: "Departmental Rules",
            year: 2025,
            status: "Active",
            category: "Strategic Guidance",
            tags: ["Strategic Cluster", "Rent Support", "Infrastructure"],
            description: "Rules for designating specialized CCUS clusters, providing financial and administrative support for industrial co-location.",
            pubDate: "2025-02-06",
            url: "https://www.motie.go.kr/",
            source: "MOTIE Korea",
            analysis: {
                frameworkVersion: "5.0",
                incentive: { score: 80, label: "Subsidies & Rent", evidence: "Direct support for companies locating within designated districts.", citation: "CCUS Act Art 10" },
                statutory: { score: 85, label: "District Power", evidence: "Legal authority to create specialized economic zones for CCUS.", citation: "Art 9" },
                liability: { score: 50, label: "Operational Alignment", evidence: "Safety protocols aligned at the cluster level.", citation: "Technical Standards" },
                mrv: { score: 75, label: "Cluster Monitoring", evidence: "Mandatory integrated reporting for all district participants.", citation: "Art 32" },
                market: { score: 80, label: "Industrial Synergy", evidence: "Reduces costs by sharing transport and storage assets within hubs.", citation: "Strategy Annex" }
            }
        }
    },
    {
        id: "au-wa-petroleum-amendment-2024",
        zh: {
            title: "西澳大利亚州 2024 石油立法修正案 (GHG 封存)",
            country: "澳大利亚",
            scope: "Sub-national",
            region: "Western Australia",
            legalWeight: "Primary Legislation",
            year: 2024,
            status: "Active",
            category: "Regulatory Framework",
            tags: ["西澳主权", "离岸封存", "权利转换"],
            description: "西澳里程碑式立法，将温室气体封存正式引入州级石油法律体系，允许在州管辖水域内进行 CO2 运输和永久封存。",
            pubDate: "2024-05-14",
            url: "https://www.wa.gov.au/government/announcements/petroleum-legislation-amendment-act-2024",
            source: "WA Government",
            analysis: {
                frameworkVersion: "5.0",
                incentive: { score: 40, label: "Operational Continuity", evidence: "Enables oil title holders to directly transition to GHG injection licenses.", citation: "WA Petroleum Act Amendment, Part 2" },
                statutory: { score: 95, label: "State Storage Power", evidence: "Establishes a full-chain regulatory framework for WA territorial waters.", citation: "Petroleum (Submerged Lands) Act 1982 Amendments", auditNote: "Critical for WA's 'Gorgon-scale' ambitions." },
                liability: { score: 85, label: "Commonwealth Mirroring", evidence: "Mirrors the strict federal liability and monitoring window post-closure.", citation: "WA Draft GHG Regulations" },
                mrv: { score: 85, label: "Formation Reporting", evidence: "Mandatory reporting of potential storage formations within title areas.", citation: "Section on Titleholder Duties" },
                market: { score: 70, label: "Regional Hub Export", evidence: "Positions WA as a capture and storage hub for the Indo-Pacific region.", citation: "Policy Impact Statement" }
            }
        },
        en: {
            title: "Western Australia Petroleum Legislation Amendment Act 2024",
            country: "Australia",
            scope: "Sub-national",
            region: "Western Australia",
            legalWeight: "Primary Legislation",
            year: 2024,
            status: "Active",
            category: "Regulatory Framework",
            tags: ["WA Sovereignty", "Submerged Lands", "GHG Title"],
            description: "Legislation establishing the regulatory framework for permanent geological storage of GHG substances in Western Australian waters.",
            pubDate: "2024-05-14",
            url: "https://www.wa.gov.au/government/announcements/petroleum-legislation-amendment-act-2024",
            source: "WA Government",
            analysis: {
                frameworkVersion: "5.0",
                incentive: { score: 40, label: "Regulatory Efficiency", evidence: "Simplifies title transition for existing gas producers.", citation: "Part 2 of Amendment Act" },
                statutory: { score: 95, label: "Full-chain Authority", evidence: "Complete jurisdiction over storage in coastal and territorial waters.", citation: "Amended WA Acts" },
                liability: { score: 85, label: "Strict Stewardship", evidence: "Aligns with federal standards for multi-decade site care.", citation: "GHG Title Rules" },
                mrv: { score: 85, label: "High Transparency", evidence: "Mandatory site characterization and injection monitoring plans.", citation: "Technical Annex" },
                market: { score: 70, label: "Global Hub Lead", evidence: "Supports WA's goal to become a global CCS service destination.", citation: "Strategic Goals" }
            }
        }
    }
];

batchB.forEach(np => {
    if (!db.policies.some(p => p.id === np.id)) {
        db.policies.push(np);
        console.log(`[Batch B] Added operational benchmark: ${np.id}`);
    }
});

db.lastUpdated = new Date().toISOString();
fs.writeFileSync(DB_PATH, JSON.stringify(db, null, 2), 'utf8');
