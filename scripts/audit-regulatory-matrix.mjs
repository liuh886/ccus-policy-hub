import fs from 'fs';
import path from 'path';
import matter from 'gray-matter';

const REG_FIELDS = [
  'pore_space_rights',
  'liability_transfer',
  'liability_period',
  'financial_assurance',
  'permitting_lead_time',
  'co2_definition',
  'cross_border_rules'
];

const locales = ['zh', 'en'];
const results = {
  by_country: {},
  summary: {
    total_policies: 0,
    fully_populated: 0,
    partially_populated: 0,
    empty: 0
  }
};

console.log("Starting Regulatory Matrix Audit (7 Pillars)...");

locales.forEach(lang => {
  const dir = path.join('src/content/policies', lang);
  if (!fs.existsSync(dir)) return;

  const files = fs.readdirSync(dir).filter(f => f.endsWith('.md'));
  
  files.forEach(file => {
    const filePath = path.join(dir, file);
    const content = fs.readFileSync(filePath, 'utf8');
    const { data } = matter(content);
    
    if (lang === 'en') results.summary.total_policies++;

    const country = data.country || "Unknown";
    const reg = data.regulatory || {};
    
    if (!results.by_country[country]) {
      results.by_country[country] = {
        name: country,
        policy_count: 0,
        fields: {}
      };
      REG_FIELDS.forEach(f => results.by_country[country].fields[f] = 0);
    }

    if (lang === 'en') results.by_country[country].policy_count++;

    let populatedCount = 0;
    REG_FIELDS.forEach(field => {
      const val = reg[field];
      if (val && val !== "" && val !== "---" && val !== "Pending") {
        results.by_country[country].fields[field]++;
        populatedCount++;
      }
    });

    if (lang === 'en') {
      if (populatedCount === REG_FIELDS.length) results.summary.fully_populated++;
      else if (populatedCount > 0) results.summary.partially_populated++;
      else results.summary.empty++;
    }
  });
});

let report = "# Regulatory Matrix Audit Report (The 7 Pillars)\n\n";
report += "- Generated: " + new Date().toISOString() + "\n";
report += "- Total Policies (EN): " + results.summary.total_policies + "\n";
report += "- Fully Populated: " + results.summary.fully_populated + "\n";
report += "- Partially Populated: " + results.summary.partially_populated + "\n";
report += "- Completely Empty: " + results.summary.empty + "\n\n";

report += "## Coverage by Country\n\n";
report += "| Country | Policies | " + REG_FIELDS.map(f => f.replace(/_/g, ' ')).join(' | ') + " | Fill Rate |\n";
report += "|---------|----------|" + REG_FIELDS.map(() => "---").join('|') + "|-----------|\n";

Object.values(results.by_country).sort((a, b) => b.policy_count - a.policy_count).forEach(c => {
  const row = [
    c.name,
    c.policy_count,
    ...REG_FIELDS.map(f => Math.round((c.fields[f] / c.policy_count) * 100) + "%"),
    Math.round((Object.values(c.fields).reduce((a, b) => a + b, 0) / (c.policy_count * REG_FIELDS.length)) * 100) + "%"
  ];
  report += "| " + row.join(' | ') + " |\n";
});

const reportPath = 'governance/reports/regulatory_matrix_gap_analysis.md';
fs.writeFileSync(reportPath, report);
console.log("\nAudit complete. Gap analysis written to " + reportPath);
