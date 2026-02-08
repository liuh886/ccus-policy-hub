const fs = require('fs');
const DB_PATH = 'src/data/policy_database.json';
const db = JSON.parse(fs.readFileSync(DB_PATH, 'utf-8'));

// 修复匈牙利 Danube Removals 相关政策 (使用 Unicode 避开编码陷阱)
const target = db.policies.find(p => p.id === 'is-cdr-framework' || p.country === 'Hungary');

if (target) {
  target.zh.description = "## \u5308\u7259\u5229 CDR \u6cbb\u7406\u6846\u67b6\n\u5308\u7259\u5229\u6b63\u5728\u901a\u8fc7 Danube Removals \u9879\u76ee\u786e\u7acb\u5176\u5728\u591a\u55 Nau\u6cb3\u5730\u533a\u7684\u78b3\u79fb\u9664\u9886\u5148\u5730\u4f4d\u3002";
  target.en.description = "## Hungary CDR Governance Framework\nHungary is establishing its CDR leadership via the Danube Removals project.";
  
  target.analysis = {
    incentive: { score: 65 },
    statutory: { score: 70 },
    liability: { score: 60 },
    mrv: { score: 85 },
    market: { score: 55 }
  };
  target.plr_index = 67;
}

fs.writeFileSync(DB_PATH, JSON.stringify(db, null, 2), 'utf-8');
console.log('✅ Hungary refined via safe-encoding.');