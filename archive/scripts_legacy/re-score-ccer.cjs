const fs = require('fs');
const DB_PATH = 'src/data/policy_database.json';
const db = JSON.parse(fs.readFileSync(DB_PATH, 'utf8'));

const targetId = 'cn-ccer';
const policy = db.policies.find(p => p.id === targetId);

if (policy) {
    const deepAnalysis = {
        frameworkVersion: "5.0",
        incentive: {
            score: 65,
            label: "Market-based Credits",
            evidence: "Issuance of tradable CCER credits for CO2 reduction.",
            citation: "Chapter 5 of MEE Order No. 1",
            auditNote: "Re-scored based on the 2024 CCER reboot regulations."
        },
        statutory: {
            score: 70,
            label: "Departmental Rules",
            evidence: "Regulated by MEE and SAMR joint administration.",
            citation: "Order No. 1 of the Ministry of Ecology and Environment",
            auditNote: "Confirmed as national-level departmental rules."
        },
        liability: {
            score: 45,
            label: "Operator-led Monitoring",
            evidence: "Requires continuous monitoring but transfer terms are still under refinement.",
            citation: "Technical Guidelines for Verification",
            auditNote: "Gap identified in long-term liability transfer specifics."
        },
        mrv: {
            score: 85,
            label: "Third-party Verification",
            evidence: "Mandatory validation by designated operational entities (DOE).",
            citation: "Chapter 3: Validation and Registration",
            auditNote: "MRV rigor verified against national voluntary standards."
        },
        market: {
            score: 90,
            label: "ETS Integrated (5% Offset)",
            evidence: "Fully integrated with National ETS for 5% compliance offset.",
            citation: "Article 34 of the Admin Measures",
            auditNote: "Strong market pull due to ETS linkage."
        }
    };

    policy.zh.analysis = deepAnalysis;
    policy.en.analysis = deepAnalysis;
    policy.zh.url = "https://www.mee.gov.cn/xxgk2018/xxgk/xxgk03/202310/t20231020_1043693.shtml";
    policy.en.url = "https://www.mee.gov.cn/xxgk2018/xxgk/xxgk03/202310/t20231020_1043693.shtml";
    policy.zh.legalWeight = "Departmental Rules";
    policy.en.legalWeight = "Departmental Rules";

    fs.writeFileSync(DB_PATH, JSON.stringify(db, null, 2), 'utf8');
    console.log(`[Success] Traceable Re-evaluation complete for ${targetId}.`);
}
