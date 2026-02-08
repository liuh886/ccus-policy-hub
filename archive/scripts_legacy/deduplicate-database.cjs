const fs = require('fs');
const DB_PATH = 'src/data/facility_database.json';

const raw = fs.readFileSync(DB_PATH, 'utf-8');
const db = JSON.parse(raw.charCodeAt(0) === 0xFEFF ? raw.slice(1) : raw);

console.log(`Starting De-duplication. Original count: ${db.facilities.length}`);

const uniqueMap = new Map();
let removed = 0;

db.facilities.forEach(f => {
  // 1. 字段清洗
  const id = f.id ? f.id.toString() : null;
  const name = (f.zh?.name || f.en?.name || f.name || "").trim();
  
  if (!id || !name) {
    removed++;
    return; // 剔除无效条目
  }

  // 2. 去重键：使用 ID 为主键
  if (uniqueMap.has(id)) {
    // 如果 ID 已存在，合并 relatedPolicies 并丢弃该条目
    const existing = uniqueMap.get(id);
    existing.relatedPolicies = [...new Set([...(existing.relatedPolicies || []), ...(f.relatedPolicies || [])])];
    removed++;
  } else {
    uniqueMap.set(id, f);
  }
});

const dedupedById = Array.from(uniqueMap.values());
console.log(`Phase 1: Removed ${removed} items based on ID collision. Remaining: ${dedupedById.length}`);

// 3. 第二轮去重：基于项目名称 (Case-insensitive)
const nameMap = new Map();
let nameRemoved = 0;
const finalFacilities = [];

dedupedById.forEach(f => {
  const nameKey = (f.zh?.name || f.en?.name || f.name || "").toLowerCase().trim();
  if (nameMap.has(nameKey)) {
    nameRemoved++;
    // 合并政策关联
    const existing = nameMap.get(nameKey);
    existing.relatedPolicies = [...new Set([...(existing.relatedPolicies || []), ...(f.relatedPolicies || [])])];
  } else {
    nameMap.set(nameKey, f);
    finalFacilities.push(f);
  }
});

db.facilities = finalFacilities;
fs.writeFileSync(DB_PATH, JSON.stringify(db, null, 2), 'utf-8');

console.log(`Phase 2: Removed ${nameRemoved} items based on Name collision.`);
console.log(`✅ Clean count: ${db.facilities.length} items.`);
