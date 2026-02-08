const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// 定义要打捞的哈希值与目标的映射关系
const restorationMap = [
  { hash: 'd1d353d5a650770cc26009c85f36bf09fce9dba6', target: 'src/pages/compare/index.astro' },
  { hash: 'e7e69c165929d3adce7d5959055ae741a0595318', target: 'src/pages/en/compare/index.astro' },
  { hash: 'cd04edf3aa533b695656f7cb80d54d5f828397a0', target: 'src/pages/facilities/[slug].astro' },
  { hash: '6b5dc1d87a14daa73f5feb1f77df62c48189df67', target: 'src/components/CompareDrawer.astro' }
];

restorationMap.forEach(item => {
  try {
    // 使用 git cat-file 提取内容并强制以 utf8 写入，避免 PowerShell 的 utf16 干扰
    const content = execSync(`git cat-file -p ${item.hash}`);
    
    // 确保目录存在
    const dir = path.dirname(item.target);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    
    fs.writeFileSync(item.target, content);
    console.log(`Successfully stitched: ${item.target}`);
  } catch (e) {
    console.error(`Failed to stitch ${item.target}: ${e.message}`);
  }
});

console.log('✅ System Logic Fidelity Restoration Phase 2 Complete.');
