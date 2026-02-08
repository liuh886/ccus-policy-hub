const fs = require('fs');

const DB_PATH = 'src/data/facility_database.json';
const raw = fs.readFileSync(DB_PATH, 'utf8');
const db = JSON.parse(raw.charCodeAt(0) === 0xFEFF ? raw.slice(1) : raw);

const standardizedFacilities = db.facilities.map(f => {
    // 如果已经是双语结构，保留并规范
    if (f.zh && f.en) {
        return f;
    }

    // 如果是旧的扁平结构，自动生成双语版
    const base = {
        name: f.name,
        country: f.country,
        location: f.location || f.country,
        type: f.type || "CCUS Project",
        status: f.status || "Planned",
        capacity: f.capacity || 0,
        sector: f.sector || "Other",
        coordinates: f.coordinates || [0, 0],
        precision: f.precision || "approximate",
        commencementYear: f.commencementYear,
        description: f.description || "Project details from global CCUS database.",
        relatedPolicies: f.relatedPolicies || []
    };

    return {
        id: f.id,
        zh: { ...base, lang: "zh" },
        en: { ...base, lang: "en" }
    };
});

db.facilities = standardizedFacilities;
db.lastUpdated = new Date().toISOString();
db.version = "5.0-Governance-Code";

fs.writeFileSync(DB_PATH, JSON.stringify(db, null, 2), 'utf8');
console.log(`Standardized ${standardizedFacilities.length} facilities into bilingual structure.`);
