const fs = require('fs');
const path = require('path');

const DB_PATH = './src/data/policy_database.json';
const OUTPUT_DIR_ZH = './src/content/policies/zh';
const OUTPUT_DIR_EN = './src/content/policies/en';

if (!fs.existsSync(OUTPUT_DIR_ZH)) fs.mkdirSync(OUTPUT_DIR_ZH, { recursive: true });
if (!fs.existsSync(OUTPUT_DIR_EN)) fs.mkdirSync(OUTPUT_DIR_EN, { recursive: true });

const data = JSON.parse(fs.readFileSync(DB_PATH, 'utf-8'));

data.policies.forEach(policy => {
  const { id, zh, en } = policy;

  if (zh) {
    const zhContent = `---
title: "${zh.title}"
country: "${zh.country}"
year: ${zh.year}
status: "${zh.status || 'Active'}"
category: "${zh.category}"
tags: ${JSON.stringify(zh.tags || [])}
description: "${zh.description.replace(/"/g, '"')}"
pubDate: "${zh.pubDate || '2024-01-01'}"
---

${zh.description}
`;
    fs.writeFileSync(path.join(OUTPUT_DIR_ZH, `${id}.md`), zhContent, 'utf-8');
    console.log(`Updated ZH: ${id}`);
  }

  if (en) {
    const enContent = `---
title: "${en.title}"
country: "${en.country}"
year: ${en.year}
status: "${en.status || 'Active'}"
category: "${en.category}"
tags: ${JSON.stringify(en.tags || [])}
description: "${en.description.replace(/"/g, '"')}"
pubDate: "${en.pubDate || '2024-01-01'}"
---

${en.description}
`;
    fs.writeFileSync(path.join(OUTPUT_DIR_EN, `${id}.md`), enContent, 'utf-8');
    console.log(`Updated EN: ${id}`);
  }
});

console.log('Fidelity Restoration Complete. No more placeholders.');
