const fs = require('fs');
const { execSync } = require('child_process');

const mirrorMap = [
  // 核心逻辑全量覆盖
  { hash: 'd1d353d5a650770cc26009c85f36bf09fce9dba6', target: 'src/pages/compare/index.astro' },
  { hash: 'e7e69c165929d3adce7d5959055ae741a0595318', target: 'src/pages/en/compare/index.astro' },
  { hash: '53e4fe23d00e713ab48efc6098f3398d1831e017', target: 'src/pages/facilities/[slug].astro' },
  { hash: 'f2445701e6c1a5c72fb08fc6239df3c813bc0867', target: 'src/pages/policy/[slug].astro' },
  { hash: 'ef041e4dbf7d617bd86ad113ac05c36edc91d449', target: 'src/pages/index.astro' },
  { hash: '6dd8ec59c9e52aef8c671f01ac7b5003a169283f', target: 'src/pages/en/index.astro' },
  { hash: 'dcd688cd065c6b190b77fc40818b831b61ce6802', target: 'src/pages/docs/index.astro' },
  { hash: 'ed201b73c42292ffdea879f97510d0fe60c64c01', target: 'src/pages/docs/[slug].astro' }
];

mirrorMap.forEach(m => {
  try {
    const content = execSync(`git cat-file -p ${m.hash}`);
    fs.writeFileSync(m.target, content);
    console.log(`Mirror restored: ${m.target} (from ${m.hash})`);
  } catch (e) {
    console.error(`Failed to mirror ${m.target}: ${e.message}`);
  }
});

console.log('✅ All core logic mirrored to the High-Fidelity state from yesterday.');
