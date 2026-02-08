import fs from 'fs';

const DB_PATH = 'src/data/facility_database.json';
const db = JSON.parse(fs.readFileSync(DB_PATH, 'utf8'));

// 状态映射表：从中文业务词汇映射到 Schema 硬约束
const STATUS_MAP = {
    "计划中": "Planned",
    "建设中": "Under construction",
    "运行中": "Operational",
    "在运行": "Operational",
    "已暂停": "Suspended",
    "已退役": "Decommissioned",
    "Cancelled": "Suspended", // 额外映射
    "Operating": "Operational"
};

let fixCount = 0;

db.facilities.forEach(f => {
    ['zh', 'en'].forEach(lang => {
        const currentStatus = f[lang].status;
        if (STATUS_MAP[currentStatus]) {
            f[lang].status = STATUS_MAP[currentStatus];
            fixCount++;
        }
    });
});

fs.writeFileSync(DB_PATH, JSON.stringify(db, null, 2), 'utf8');
console.log(`[Enum Governance] Fixed ${fixCount} status values to match Schema.`);
