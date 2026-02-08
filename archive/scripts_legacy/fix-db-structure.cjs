const fs = require('fs');
const DB_PATH = 'src/data/policy_database.json';

const raw = fs.readFileSync(DB_PATH, 'utf8');
const db = JSON.parse(raw.charCodeAt(0) === 0xFEFF ? raw.slice(1) : raw);

db.policies.forEach(p => {
  const dims = ['incentive', 'statutory', 'liability', 'mrv', 'market'];
  if (!p.analysis) p.analysis = {};

  dims.forEach(dim => {
    const current = p.analysis[dim];
    
    // 如果当前是数值，包装成对象
    if (typeof current === 'number') {
      p.analysis[dim] = {
        score: current,
        label: dim.toUpperCase(),
        description: ""
      };
    } 
    // 如果缺失，给默认对象
    else if (!current || typeof current !== 'object') {
      p.analysis[dim] = {
        score: 40,
        label: dim.toUpperCase(),
        description: ""
      };
    }
    // 如果已经是对象但缺失 score，确保 score 存在
    else if (current.score === undefined) {
      current.score = 0;
    }
  });
});

fs.writeFileSync(DB_PATH, JSON.stringify(db, null, 2), 'utf8');
console.log('✅ DATABASE LEVEL: All FSRTM dimensions promoted from Numbers to Objects.');
