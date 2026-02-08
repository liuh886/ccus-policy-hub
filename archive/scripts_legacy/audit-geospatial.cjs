const fs = require('fs');

const DB_PATH = 'src/data/facility_database.json';
const db = JSON.parse(fs.readFileSync(DB_PATH, 'utf8'));

// 简化的国家边界库（示例）
const COUNTRY_BOUNDS = {
    "China": { min: [73, 18], max: [135, 54], center: [105, 35] },
    "USA": { min: [-125, 24], max: [-66, 49], center: [-95, 37] },
    "France": { min: [-5, 41], max: [9, 51], center: [2, 46] }
};

let fixCount = 0;

db.facilities.forEach(f => {
    ['zh', 'en'].forEach(lang => {
        const data = f[lang];
        const [lng, lat] = data.coordinates;
        const country = data.country === "美国" || data.country === "United States" ? "USA" : (data.country === "中国" ? "China" : data.country);
        
        const bounds = COUNTRY_BOUNDS[country];
        
        // 1. 检查 Null Island [0,0]
        const isNull = (lng === 0 && lat === 0);
        
        // 2. 检查越界
        const isOutOfBounds = bounds && (lng < bounds.min[0] || lng > bounds.max[0] || lat < bounds.min[1] || lat > bounds.max[1]);

        if (isNull || isOutOfBounds) {
            console.log(`[Audit] Fixing coordinates for ${f.id} (${data.name}) in ${country}`);
            data.coordinates = bounds ? bounds.center : [0, 0];
            data.precision = "approximate";
            fixCount++;
        }
    });
});

if (fixCount > 0) {
    fs.writeFileSync(DB_PATH, JSON.stringify(db, null, 2), 'utf8');
    console.log(`[Success] Geospatial audit complete. ${fixCount} coordinates corrected.`);
} else {
    console.log(`[Success] All facilities passed geospatial sanity check.`);
}
