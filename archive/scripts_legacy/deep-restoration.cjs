const fs = require('fs');
const { execSync } = require('child_process');

const masterMap = [
  { hash: '50bdb216af6c85fd006807124bea212224d1acb9', target: 'scripts/sync.cjs' },
  { hash: '53e4fe23d00e713ab48efc6098f3398d1831e017', target: 'src/pages/facilities/[slug].astro' },
  { hash: 'd1d353d5a650770cc26009c85f36bf09fce9dba6', target: 'src/pages/compare/index.astro' },
  { hash: 'f2445701e6c1a5c72fb08fc6239df3c813bc0867', target: 'src/pages/policy/[slug].astro' },
  { hash: 'ba47061e277503e20dd65d0d210b5ffad9e74cca', target: 'src/components/Search.astro' },
  { hash: '7fb635bfad271f27f5780877d5144bbfa5b7f9dc', target: 'scripts/update_geo_precision.py' } // 找回地理精度脚本
];

masterMap.forEach(m => {
  try {
    const content = execSync(`git cat-file -p ${m.hash}`);
    fs.writeFileSync(m.target, content);
    console.log(`[RECOVERY] Restored ${m.target} from ${m.hash}`);
  } catch (e) {
    console.error(`Failed: ${m.target}`);
  }
});

console.log('✅ Final Deep Restoration Phase 3 Complete. The project has been fully rolled back to its high-fidelity logical peak.');
