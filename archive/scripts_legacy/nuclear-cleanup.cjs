const fs = require('fs');
const path = require('path');

const DIRS = [
  'src/content/policies/zh',
  'src/content/policies/en',
  'src/content/facilities/zh',
  'src/content/facilities/en'
];

// 1. 彻底删除目录及其内容
DIRS.forEach(dir => {
  if (fs.existsSync(dir)) {
    console.log(`[CLEAN] 物理清理: ${dir}`);
    fs.readdirSync(dir).forEach(f => fs.unlinkSync(path.join(dir, f)));
  } else {
    fs.mkdirSync(dir, { recursive: true });
  }
});

console.log('✅ 物理环境已重置。');
