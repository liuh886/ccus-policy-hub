const fs = require('fs');
const POLICY_DB = 'src/data/policy_database.json';
const FACILITY_DB = 'src/data/facility_database.json';

function sanitize(path, key) {
  const raw = fs.readFileSync(path, 'utf8');
  const db = JSON.parse(raw.charCodeAt(0) === 0xFEFF ? raw.slice(1) : raw);
  
  const items = db[key];
  const newItems = [];
  const seen = new Set();

  items.forEach(item => {
    // 剥离 -zh, -en, zh/, en/ 等各种历史遗留后缀
    const cleanId = item.id.replace(/-(zh|en)$/, '').replace(/^(zh|en)\//, '');
    if (!seen.has(cleanId)) {
      item.id = cleanId;
      newItems.push(item);
      seen.add(cleanId);
    }
  });

  db[key] = newItems;
  fs.writeFileSync(path, JSON.stringify(db, null, 2), 'utf8');
  console.log(`✅ ${path} ID 洗白完成。`);
}

sanitize(POLICY_DB, 'policies');
sanitize(FACILITY_DB, 'facilities');
