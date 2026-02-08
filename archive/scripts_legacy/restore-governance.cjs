const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const governanceMap = [
  // 核心治理技能还原
  { hash: '77fb730ea4c6fcfbf94fd1843b3f988acaf79897', target: '.gemini/skills/ccus-db-governance.md' },
  { hash: '4113c08ff81466df37e4f39316da3e618c03cbcf', target: '.gemini/skills/ccus-report-ingestion.md' },
  { hash: 'df53bc51b4f654fbaa802bfb795aa3c573bb05ab', target: '.gemini/skills/ccus-self-check.md' },
  // 首页与文档还原
  { hash: 'e7a490e49e357ce047e4fe7d445b60eca0cb1b73', target: 'README.zh.md' },
  { hash: 'b4ca182d3d32e68dffdedc3219aa9781c3183d0f', target: 'src/content/docs/guide.md' },
  { hash: 'ae348f00b14fea7d8478000a00b7563920f1549b', target: 'src/content/docs/esg30-dmrv-standards.md' }
];

governanceMap.forEach(item => {
  try {
    const content = execSync(`git cat-file -p ${item.hash}`);
    const dir = path.dirname(item.target);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(item.target, content);
    console.log(`Governance file restored: ${item.target}`);
  } catch (e) {
    console.error(`Failed to restore ${item.target}: ${e.message}`);
  }
});

console.log('✅ Entire Governance System Infrastructure Restored.');
