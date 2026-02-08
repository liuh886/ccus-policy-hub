import fs from 'fs';

const DB_PATH = 'src/data/policy_database.json';
const db = JSON.parse(fs.readFileSync(DB_PATH, 'utf8'));

let fixCount = 0;

db.policies.forEach(p => {
    ['zh', 'en'].forEach(lang => {
        // 如果 url 是空字符串，将其设置为 undefined (在 JSON 中移除) 
        // 或者设置为一个合法的占位符
        if (p[lang].url === "") {
            delete p[lang].url;
            fixCount++;
        }
    });
});

fs.writeFileSync(DB_PATH, JSON.stringify(db, null, 2), 'utf8');
console.log(`[Schema Alignment] Removed ${fixCount} invalid empty URLs to satisfy Zod.`);
