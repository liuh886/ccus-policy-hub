const fs = require('fs');
const path = require('path');

const ZH_DIR = 'src/content/facilities/zh';
const EN_DIR = 'src/content/facilities/en';
const OUTPUT_PATH = 'src/data/facility_database.json';

const facilities = {};

function parseFrontmatter(content) {
  const match = content.match(/^---([\s\S]*?)---/);
  if (!match) return {};
  const yaml = match[1];
  const data = {};
  yaml.split(/\r?\n/).forEach(line => {
    const [key, ...valParts] = line.split(':');
    if (key && valParts.length > 0) {
      let value = valParts.join(':').trim();
      // 清理引号
      value = value.replace(/^['"]|['"]$/g, '');
      // 简单数组处理
      if (value.startsWith('[') && value.endsWith(']')) {
        value = value.slice(1, -1).split(',').map(v => v.trim().replace(/^['"]|['"]$/g, ''));
      }
      data[key.trim()] = value;
    }
  });
  return data;
}

// 扫描
[ { dir: ZH_DIR, lang: 'zh' }, { dir: EN_DIR, lang: 'en' } ].forEach(({ dir, lang }) => {
  if (fs.existsSync(dir)) {
    fs.readdirSync(dir).forEach(file => {
      if (file.endsWith('.md')) {
        const id = file.replace('.md', '').replace('-zh', '').replace('-en', '');
        const content = fs.readFileSync(path.join(dir, file), 'utf8');
        const data = parseFrontmatter(content);
        
        if (!facilities[id]) facilities[id] = { id, zh: null, en: null };
        facilities[id][lang] = data;
      }
    });
  }
});

const finalDB = {
  version: "1.0",
  lastUpdated: new Date().toISOString(),
  facilities: Object.values(facilities)
};

fs.writeFileSync(OUTPUT_PATH, JSON.stringify(finalDB, null, 2), 'utf8');
console.log('Successfully centralized facilities database.');