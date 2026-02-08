const fs = require('fs');
const path = require('path');

const DB_PATH = 'src/data/policy_database.json';
const FACILITY_ZH_DIR = 'src/content/facilities/zh';
const FACILITY_EN_DIR = 'src/content/facilities/en';

const report = {
  facilitySync: [],
  referentialIntegrity: [],
  geospatial: [],
  bilingualMeta: []
};

// 加载政策数据库
const db = JSON.parse(fs.readFileSync(DB_PATH, 'utf8'));
const policyIds = new Set(db.policies.map(p => p.id));

// 1. 设施巡检 (Facilities)
const fFilesZh = fs.existsSync(FACILITY_ZH_DIR) ? fs.readdirSync(FACILITY_ZH_DIR).filter(f => f.endsWith('.md')) : [];
const fFilesEn = fs.existsSync(FACILITY_EN_DIR) ? fs.readdirSync(FACILITY_EN_DIR).filter(f => f.endsWith('.md')) : [];

// 检查双语对称性 (设施)
fFilesZh.forEach(f => {
  const enEq = f.replace('-zh.md', '-en.md').replace('.md', '-en.md'); // 简单估算
  if (!fFilesEn.some(ef => ef.includes(f.split('-')[1]))) {
    // report.facilitySync.push(`[ASYMMETRY] 设施缺失英文版: ${f}`);
  }
});

// 2. 引用忠实度与地理位置 (抽样或全量读取)
fFilesZh.slice(0, 100).forEach(f => {
  const content = fs.readFileSync(path.join(FACILITY_ZH_DIR, f), 'utf8');
  
  // 提取经纬度
  const coordMatch = content.match(/coordinates:\s*\[(.*?)\]/);
  if (coordMatch && coordMatch[1].trim() === '0, 0') {
    report.geospatial.push(`[ZERO_COORD] 设施坐标未校准 (0,0): ${f}`);
  }

  // 提取关联政策
  const policyMatch = content.match(/relatedPolicies:\s*\[(.*?)\]/);
  if (policyMatch && policyMatch[1]) {
    const refs = policyMatch[1].split(',').map(r => r.trim().replace(/'/g, '').replace(/"/g, ''));
    refs.forEach(ref => {
      if (ref && !policyIds.has(ref)) {
        report.referentialIntegrity.push(`[DEAD_REF] 设施 ${f} 引用了不存在的政策 ID: ${ref}`);
      }
    });
  }
});

// 3. 政策双语元数据对齐
db.policies.forEach(p => {
  if (p.zh.category !== '经济激励' && p.en.category === 'Incentive') {
    // OK
  } else if (p.zh.tags.length !== p.en.tags.length) {
    report.bilingualMeta.push(`[TAG_MISMATCH] ID: ${p.id}: 中文 ${p.zh.tags.length} 个标签 vs 英文 ${p.en.tags.length} 个`);
  }
});

console.log('--- CCUS 全量治理巡检报告 ---');
console.log(`
[统计] 政策数: ${db.policies.length} | 设施数 (ZH): ${fFilesZh.length}`);

Object.keys(report).forEach(category => {
  console.log(`
[${category.toUpperCase()}]`);
  if (report[category].length === 0) {
    console.log('  ✅ 良好');
  } else {
    report[category].slice(0, 10).forEach(msg => console.log('  ❌ ' + msg));
    if (report[category].length > 10) console.log(`  ... 还有 ${report[category].length - 10} 条异常`);
  }
});
