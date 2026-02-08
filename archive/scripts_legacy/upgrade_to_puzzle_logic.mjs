import fs from 'fs';

const DB_PATH = './src/data/policy_database.json';
const db = JSON.parse(fs.readFileSync(DB_PATH, 'utf-8'));

db.policies = db.policies.map(p => {
  const desc = (p.zh.description + p.en.description).toLowerCase();
  
  // Assign Puzzle Roles based on content
  let role = "Strategic Vision";
  if (desc.includes('act') || desc.includes('law') || desc.includes('法')) role = "Anchor Law";
  if (desc.includes('tax') || desc.includes('credit') || desc.includes('incentive') || desc.includes('补贴')) role = "Financial Pillar";
  if (desc.includes('standard') || desc.includes('protocol') || desc.includes('mrv')) role = "Technical Protocol";

  p.governance_role = role;

  // Refine scores to reflect "Completeness Contribution"
  // Example: An Anchor Law should inherently score high on statutory dimension
  if (role === "Anchor Law" && p.analysis.statutory < 80) p.analysis.statutory = 85;
  if (role === "Financial Pillar" && p.analysis.incentive < 80) p.analysis.incentive = 90;
  
  return p;
});

fs.writeFileSync(DB_PATH, JSON.stringify(db, null, 2), 'utf-8');
console.log('✅ Puzzle Logic Integrated: All policies now have a "governance_role".');
