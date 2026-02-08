import fs from 'fs';

const DB_PATH = './src/data/policy_database.json';

// 1. Force Clean JSON
const dbRaw = fs.readFileSync(DB_PATH, 'utf8');
// Remove any possible invisible control characters or BOM
const dbClean = dbRaw.replace(/^\uFEFF/, '').replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F-\u009F]/g, '');
fs.writeFileSync(DB_PATH, dbClean, 'utf8');
console.log('✅ Single Source of Truth (JSON) cleaned and saved as pure UTF-8.');

// 2. Fix known garbled patterns in components/pages if they existed
// We'll read [slug].astro and fix the specific characters reported
const slugPath = './src/pages/policy/[slug].astro';
if (fs.existsSync(slugPath)) {
  let slugContent = fs.readFileSync(slugPath, 'utf8');
  slugContent = slugContent.replace(/鈼/g, '●').replace(/鉁/g, '✅');
  fs.writeFileSync(slugPath, slugContent, 'utf8');
  console.log('✅ Policy [slug].astro garbled characters fixed.');
}
