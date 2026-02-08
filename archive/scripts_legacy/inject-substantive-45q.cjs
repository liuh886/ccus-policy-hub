const fs = require('fs');
const DB_PATH = 'src/data/policy_database.json';

const raw = fs.readFileSync(DB_PATH, 'utf8');
const db = JSON.parse(raw.charCodeAt(0) === 0xFEFF ? raw.slice(1) : raw);

const targetId = "us-45q-ira";
const policy = db.policies.find(p => p.id === targetId);

if (policy) {
  const updatedAnalysis = {
    incentive: {
      score: 95,
      label: "$85/t (Saline) / $180/t (DAC)",
      evidence: "[AI-Generated] IRA 2022 & OBBBA 2025 set global gold standard. Provides $85/t for industrial/power and $180/t for DAC. Direct pay and transferability added.",
      citation: "26 U.S. Code § 45Q & OBBBA 2025"
    },
    statutory: {
      score: 85,
      label: "Class VI Permitting",
      evidence: "[AI-Generated] Established federal Class VI injection well regulatory framework via EPA. Defines pore space and long-term storage requirements.",
      citation: "40 CFR Part 146"
    },
    market: {
      score: 75,
      label: "Direct Pay & Transfer",
      evidence: "[AI-Generated] Created a monetizable credit market via Direct Pay for tax-exempts and Transferability for taxable entities.",
      citation: "IRC Section 6417 & 6418"
    },
    strategic: {
      score: 90,
      label: "Net Zero Infrastructure Pillar",
      evidence: "[AI-Generated] Extended construction start deadline to 2033. Positioned CCUS as a core pillar of the US national decarbonization strategy.",
      citation: "Inflation Reduction Act 2022"
    },
    mrv: {
      score: 100,
      label: "EPA Subpart RR",
      evidence: "[AI-Generated] Mandatory high-precision DMRV via Greenhouse Gas Reporting Program. Requires mass balance and independent verification.",
      citation: "40 CFR Part 98 Subpart RR"
    }
  };

  policy.zh.analysis = updatedAnalysis;
  policy.en.analysis = updatedAnalysis;
  policy.zh.description = "## 政策核心

IRA 与 OBBBA 法案将 45Q 税收抵免提升至 **$85/t** (盐水层封存) 和 **$180/t** (DAC)。这是全球 CCUS 商业化的黄金标准，极大地降低了捕集项目的财务风险。";
  
  fs.writeFileSync(DB_PATH, JSON.stringify(db, null, 2), 'utf8');
  console.log(`[Injection Success] ${targetId} has been updated with substantive analysis.`);
} else {
  console.error("Policy not found.");
}
