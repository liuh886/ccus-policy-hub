const fs = require('fs');
const path = require('path');
const yaml = require('js-yaml');

const auditTargets = [
  { dir: 'src/content/policies/zh', type: 'policy' },
  { dir: 'src/content/policies/en', type: 'policy' },
  { dir: 'src/content/facilities/zh', type: 'facility' },
  { dir: 'src/content/facilities/en', type: 'facility' }
];

console.log('--- CRITICAL SCHEMA-DRIVEN AUDIT ---');

let errors = 0;

auditTargets.forEach(target => {
  if (!fs.existsSync(target.dir)) return;
  const files = fs.readdirSync(target.dir);
  files.forEach(file => {
    if (!file.endsWith('.md')) return;
    const content = fs.readFileSync(path.join(target.dir, file), 'utf-8');
    try {
      const parts = content.split('---');
      const fm = yaml.load(parts[1]);
      
      // 1. 设施字段严格对齐
      if (target.type === 'facility') {
        const facilityRequired = ['name', 'lang', 'country', 'location', 'type', 'status', 'capacity', 'coordinates', 'description'];
        facilityRequired.forEach(field => {
          if (fm[field] === undefined || fm[field] === null || fm[field] === "") {
            console.error(`❌ [Facility: ${file}] Missing/Empty Required field: "${field}"`);
            errors++;
          }
        });
      } 
      // 2. 政策字段严格对齐
      else if (target.type === 'policy') {
        const policyRequired = ['id', 'title', 'country', 'year', 'status', 'category', 'pubDate', 'analysis', 'stats'];
        policyRequired.forEach(field => {
          if (fm[field] === undefined || fm[field] === null) {
            console.error(`❌ [Policy: ${file}] Missing Required field: "${field}"`);
            errors++;
          }
        });
      }
    } catch (e) {
      console.error(`💥 [${file}] YAML Error: ${e.message}`);
      errors++;
    }
  });
});

console.log(`\nAudit Complete. Critical Failures: ${errors}`);
if (errors > 0) process.exit(1);
else console.log('✅ ALL CLEAR: Synchronization logic is now perfectly aligned with Schema.');
