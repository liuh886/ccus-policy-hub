import fs from 'fs';

const DB_PATH = 'src/data/policy_database.json';
const db = JSON.parse(fs.readFileSync(DB_PATH, 'utf8'));

const finalAuditBatch = [
    {
        id: "jp-ccs-business-act-2024",
        zh: {
            title: "日本 CCS 商业法 (2024)",
            country: "日本",
            scope: "National",
            legalWeight: "Primary Legislation",
            year: 2024,
            status: "Active",
            category: "Regulatory Framework",
            tags: ["CCS许可", "METI监管", "商业化"],
            description: "日本首部专门规范 CCS 商业运营的法律，确立了 METI 划定'指定区域'并签发勘探与封存许可的制度。",
            pubDate: "2024-05-24",
            url: "https://www.meti.go.jp/english/policy/energy_environment/global_warming/ccs_business_act.html",
            source: "METI",
            analysis: {
                frameworkVersion: "5.0",
                incentive: { score: 60, label: "Business Certainty", evidence: "Provides legal title security for long-term investments.", citation: "CCS Business Act, Chapter 2" },
                statutory: { score: 95, label: "Permitting Regime", evidence: "Establishes a clear licensing system for exploration and storage rights.", citation: "Article 3: Designation of Zones" },
                liability: { score: 70, label: "Operator Liability", evidence: "Operators bear liability during operation; state transfer mechanism is defined.", citation: "Chapter 4" },
                mrv: { score: 85, label: "Safety Regulations", evidence: "Strict monitoring required to prevent leakage impacting human health.", citation: "Safety Regulations" },
                market: { score: 75, label: "TPA Framework", evidence: "Encourages third-party access to pipeline infrastructure.", citation: "Pipeline Business Rules" }
            }
        },
        en: {
            title: "Japan CCS Business Act (2024)",
            country: "Japan",
            scope: "National",
            legalWeight: "Primary Legislation",
            year: 2024,
            status: "Active",
            category: "Regulatory Framework",
            tags: ["CCS Licensing", "METI", "Commercialization"],
            description: "The primary legislation governing commercial CCS activities in Japan, establishing a permitting system under METI.",
            pubDate: "2024-05-24",
            url: "https://www.meti.go.jp/english/policy/energy_environment/global_warming/ccs_business_act.html",
            source: "METI Japan",
            analysis: {
                frameworkVersion: "5.0",
                incentive: { score: 60, label: "Investment Security", evidence: "Creates enforceable property rights for storage.", citation: "Chapter 2" },
                statutory: { score: 95, label: "Licensing System", evidence: "Defines the process for exploration and storage permits.", citation: "Art 3" },
                liability: { score: 70, label: "Operational Risk", evidence: "Clear liability rules for operators.", citation: "Chapter 4" },
                mrv: { score: 85, label: "Safety Standards", evidence: "Rigorous monitoring for leakage prevention.", citation: "Safety Rules" },
                market: { score: 75, label: "Infrastructure Access", evidence: "Promotes shared use of transport networks.", citation: "Pipeline Rules" }
            }
        }
    },
    {
        id: "my-netr-ccus-2023",
        zh: {
            title: "马来西亚国家能源转型路线图 (NETR) - CCUS 支柱",
            country: "马来西亚",
            scope: "National",
            legalWeight: "Strategic Guidance",
            year: 2023,
            status: "Active",
            category: "Strategic Guidance",
            tags: ["NETR", "能源转型", "催化项目"],
            description: "马来西亚能源转型的核心路线图，将 CCUS 确定为六大杠杆之一，并确立了 PETRONAS Kasawari 等旗舰催化项目。",
            pubDate: "2023-08-29",
            url: "https://www.ekonomi.gov.my/en/netr",
            source: "Ministry of Economy",
            analysis: {
                frameworkVersion: "5.0",
                incentive: { score: 55, label: "Catalyst Funding", evidence: "Identifies flagship projects for government facilitation.", citation: "NETR Flagship Projects" },
                statutory: { score: 65, label: "Strategic Mandate", evidence: "Elevates CCUS to a national strategic priority.", citation: "Energy Transition Levers" },
                liability: { score: 40, label: "Project Level", evidence: "Managed at the project level pending full Act 870 implementation.", citation: "Project Guidelines" },
                mrv: { score: 70, label: "National Inventory", evidence: "Aligns project reporting with national NDC commitments.", citation: "GHG Monitoring" },
                market: { score: 80, label: "Regional Hub", evidence: "Explicitly aims to position Malaysia as a regional storage hub.", citation: "Hub Strategy" }
            }
        },
        en: {
            title: "Malaysia National Energy Transition Roadmap (NETR) - CCUS Pillar",
            country: "Malaysia",
            scope: "National",
            legalWeight: "Strategic Guidance",
            year: 2023,
            status: "Active",
            category: "Strategic Guidance",
            tags: ["NETR", "Energy Transition", "Flagship Projects"],
            description: "Malaysia's strategic roadmap identifying CCUS as a key lever for decarbonization and economic growth.",
            pubDate: "2023-08-29",
            url: "https://www.ekonomi.gov.my/en/netr",
            source: "Ministry of Economy Malaysia",
            analysis: {
                frameworkVersion: "5.0",
                incentive: { score: 55, label: "Project Support", evidence: "Designates Kasawari CCS as a catalyst project.", citation: "Flagship Projects" },
                statutory: { score: 65, label: "National Strategy", evidence: "Formalizes CCUS role in energy transition.", citation: "Six Levers" },
                liability: { score: 40, label: "Project Based", evidence: "Relies on existing petroleum contracts.", citation: "Project Terms" },
                mrv: { score: 70, label: "NDC Alignment", evidence: "Reporting feeds into national climate goals.", citation: "Monitoring Section" },
                market: { score: 80, label: "Hub Ambition", evidence: "Targets regional leadership in storage services.", citation: "Strategic Intent" }
            }
        }
    }
];

finalAuditBatch.forEach(np => {
    const idx = db.policies.findIndex(p => p.id === np.id);
    if (idx !== -1) {
        db.policies[idx] = np;
        console.log(`[Final Audit] Upgraded ${np.id} to V5.0 standard.`);
    } else {
        db.policies.push(np);
        console.log(`[Final Audit] Added ${np.id} as a strategic anchor.`);
    }
});

// 清理所有仍为 Placeholder 的虚拟项 (如果存在)
const realPolicies = db.policies.filter(p => !p.id.includes("benchmark-regional"));
if (realPolicies.length !== db.policies.length) {
    console.log(`[Cleanup] Removed ${db.policies.length - realPolicies.length} placeholders.`);
    db.policies = realPolicies;
}

db.lastUpdated = new Date().toISOString();
fs.writeFileSync(DB_PATH, JSON.stringify(db, null, 2), 'utf8');
