const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const restorationMap = [
  // 首页还原
  { hash: 'ef041e4dbf7d617bd86ad113ac05c36edc91d449', target: 'src/pages/index.astro' },
  // 文档中心还原
  { hash: 'dcd688cd065c6b190b77fc40818b831b61ce6802', target: 'src/pages/docs/index.astro' },
  { hash: 'ed201b73c42292ffdea879f97510d0fe60c64c01', target: 'src/pages/docs/[slug].astro' },
  // 补充：英文首页 (基于 6dd8ec59... 打捞出的特征)
  { hash: '6dd8ec59c9e52aef8c671f01ac7b5003a169283f', target: 'src/pages/en/index.astro' }
];

restorationMap.forEach(item => {
  try {
    const content = execSync(`git cat-file -p ${item.hash}`);
    const dir = path.dirname(item.target);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(item.target, content);
    console.log(`Successfully stitched: ${item.target}`);
  } catch (e) {
    console.error(`Failed to stitch ${item.target}: ${e.message}`);
  }
});

console.log('✅ Home & Docs Fidelity Restoration Complete.');
