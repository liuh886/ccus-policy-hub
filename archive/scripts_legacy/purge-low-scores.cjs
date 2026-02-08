const fs = require('fs');
const path = 'src/data/policy_database.json';

let rawData = fs.readFileSync(path, 'utf8');
if (rawData.charCodeAt(0) === 0xFEFF) {
  rawData = rawData.slice(1);
}

const db = JSON.parse(rawData);
let purgedCount = 0;

db.policies.forEach(p => {
  Object.keys(p.analysis).forEach(dim => {
    // Physical purge: If score <= 50, set to 0
    if (p.analysis[dim] > 0 && p.analysis[dim] <= 50) {
      p.analysis[dim] = 0;
      purgedCount++;
    }
  });
});

fs.writeFileSync(path, JSON.stringify(db, null, 2), 'utf8');
console.log(`FSRTM 数据硬清零完成。物理抹除了 ${purgedCount} 个低效能评分维度。`);
