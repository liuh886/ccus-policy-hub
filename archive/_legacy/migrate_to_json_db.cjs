const fs = require('fs');
const path = require('path');
const matter = require('gray-matter');

const ZH_DIR = path.join(__dirname, '../src/content/policies/zh');
const EN_DIR = path.join(__dirname, '../src/content/policies/en');
const OUTPUT_FILE = path.join(__dirname, '../src/data/policy_database.json');

const database = {
  version: "1.0",
  lastUpdated: new Date().toISOString(),
  policies: []
};

// 获取所有唯一的 ID (文件名)
const zhFiles = fs.readdirSync(ZH_DIR).filter(f => f.endsWith('.md'));
const enFiles = fs.readdirSync(EN_DIR).filter(f => f.endsWith('.md'));
const allIds = Array.from(new Set([...zhFiles, ...enFiles])).map(f => f.replace('.md', ''));

console.log(`Found ${allIds.length} unique policy IDs.`);

allIds.forEach(id => {
  const zhPath = path.join(ZH_DIR, `${id}.md`);
  const enPath = path.join(EN_DIR, `${id}.md`);
  
  let entry = {
    id: id,
    zh: null,
    en: null
  };

  if (fs.existsSync(zhPath)) {
    try {
      const file = matter(fs.readFileSync(zhPath, 'utf8'));
      entry.zh = {
        ...file.data,
        content: file.content.trim()
      };
    } catch (e) {
      console.error(`Error parsing ZH ${id}:`, e.message);
    }
  }

  if (fs.existsSync(enPath)) {
    try {
      const file = matter(fs.readFileSync(enPath, 'utf8'));
      entry.en = {
        ...file.data,
        content: file.content.trim()
      };
    } catch (e) {
      console.error(`Error parsing EN ${id}:`, e.message);
    }
  }

  database.policies.push(entry);
});

// 确保目录存在
const dataDir = path.dirname(OUTPUT_FILE);
if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });

// 写入 JSON (强制使用 UTF-8)
fs.writeFileSync(OUTPUT_FILE, JSON.stringify(database, null, 2), 'utf8');
console.log(`Success! Database created at ${OUTPUT_FILE}`);
