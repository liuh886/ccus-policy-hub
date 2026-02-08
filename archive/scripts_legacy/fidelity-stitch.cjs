const fs = require('fs');
const DB_PATH = 'src/data/policy_database.json';

const db = JSON.parse(fs.readFileSync(DB_PATH, 'utf8'));

// 专家内容恢复（使用 ASCII 避开编码陷阱）
const patches = [
  {
    id: "us-45q-ira",
    zh_desc: "## \u6838\u5fc3\u6761\u6b3e\n\n1. \u7a0e\u6536\u62b5\u514d\u5927\u5e45\u63d0\u5347: IRA \u5c06\u78b3\u5c01\u5b58\u7684\u7a0e\u6536\u62b5\u514d\u989d\u5ea6\u63d0\u5347\u81f3 $85/\u5428\uff08\u76d0\u6c34\u5c42\u5c01\u5b58\uff09\u548c $180/\u5428\uff08DAC\uff09\u3002",
    en_desc: "## Core Provisions\n\n1. Credit Increase: The IRA increased the 45Q credit to $85/t for saline storage."
  },
  {
    id: "cn-national-standards",
    zh_desc: "## 1. 2026 \u6cbb\u7406\u91cc\u7a0b\u7891\n\u4e2d\u56fd CCUS 12 \u9879\u56fd\u5bb6\u6807\u51c6 (GB/T 46870.1~46880) \u6b63\u5f0f\u786e\u7acb\u3002",
    en_desc: "## 1. 2026 Governance Milestone\nChina's 12 new national standards establish technical benchmarks."
  }
];

patches.forEach(patch => {
  const p = db.policies.find(x => x.id === patch.id);
  if (p) {
    if (p.zh) p.zh.description = patch.zh_desc;
    if (p.en) p.en.description = patch.en_desc;
  }
});

fs.writeFileSync(DB_PATH, JSON.stringify(db, null, 2), 'utf8');
console.log('✅ Expert details restored using safe-encoding transfer.');