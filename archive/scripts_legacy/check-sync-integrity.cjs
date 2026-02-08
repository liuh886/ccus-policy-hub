const fs = require('fs');
const path = require('path');

const POLICY_DB = 'src/data/policy_database.json';
const FACILITY_DB = 'src/data/facility_database.json';

const report = {
  policyDiffs: [],
  facilityDiffs: [],
  bodyEnrichment: []
};

function checkPolicyIntegrity() {
  const raw = fs.readFileSync(POLICY_DB, 'utf8');
  const db = JSON.parse(raw.charCodeAt(0) === 0xFEFF ? raw.slice(1) : raw);
  db.policies.forEach(p => {
    const zhPath = `src/content/policies/zh/${p.id}.md`;
    if (!fs.existsSync(zhPath)) {
      report.policyDiffs.push(`[MISSING_FILE] 政策 ${p.id} 缺失中文 MD`);
      return;
    }
    
    const mdContent = fs.readFileSync(zhPath, 'utf8');
    const h2Matches = mdContent.match(/^## (?!政策背景|FSRTM Dimensions|FSRTM 维度|Policy Background).+/gm);
    if (h2Matches && h2Matches.length > 0) {
      report.bodyEnrichment.push(`[EXTRA_CONTENT] 政策 ${p.id} 包含额外章节: ${h2Matches.join(', ')}`);
    }
  });
}

function checkFacilityIntegrity() {
  const raw = fs.readFileSync(FACILITY_DB, 'utf8');
  const db = JSON.parse(raw.charCodeAt(0) === 0xFEFF ? raw.slice(1) : raw);
  db.facilities.forEach(f => {
    const zhPath = `src/content/facilities/zh/${f.id}-zh.md`;
    if (!fs.existsSync(zhPath)) {
      report.facilityDiffs.push(`[MISSING_FILE] 设施 ${f.id} 缺失中文 MD`);
      return;
    }
    
    const mdContent = fs.readFileSync(zhPath, 'utf8');
    const capMatch = mdContent.match(/capacity:\s*([\d.]+)/);
    const dbCap = f.zh ? f.zh.capacity : 0;
    if (capMatch && Math.abs(parseFloat(capMatch[1]) - dbCap) > 0.01) {
      report.facilityDiffs.push(`[VALUE_MISMATCH] 设施 ${f.id}: MD ${capMatch[1]} vs DB ${dbCap}`);
    }
  });
}

checkPolicyIntegrity();
checkFacilityIntegrity();

console.log('--- MD Consistency Audit Report ---');
console.log('POLICY: ' + (report.policyDiffs.length + report.bodyEnrichment.length === 0 ? 'OK' : report.policyDiffs.length + report.bodyEnrichment.length + ' Issues'));
report.policyDiffs.forEach(d => console.log(' - ERR: ' + d));
report.bodyEnrichment.forEach(d => console.log(' - WARN: ' + d));

console.log('FACILITY: ' + (report.facilityDiffs.length === 0 ? 'OK' : report.facilityDiffs.length + ' Issues'));
report.facilityDiffs.slice(0, 5).forEach(d => console.log(' - ERR: ' + d));