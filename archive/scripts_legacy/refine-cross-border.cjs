const fs = require('fs');
const DB_PATH = 'src/data/facility_database.json';
const db = JSON.parse(fs.readFileSync(DB_PATH, 'utf-8'));

// 1. Japan-Australia 跨境治理精修
const jpaus_facilities = ['1014', '359', '966', '967', '1070']; // Setouchi Hub, Moomba Phase 2-4, ENEOS MOL JX Shipping

db.facilities.forEach(f => {
  const id = f.id.toString();
  
  if (jpaus_facilities.includes(id)) {
    // 注入跨境政策关联
    const policies = ['london-protocol-2009', 'au-safeguard-mechanism', 'jp-ccs-business-act-2024'];
    f.relatedPolicies = [...new Set([...(f.relatedPolicies || []), ...policies])];
    
    // 注入坐标精修 (Setouchi Region approximate)
    if (id === '1014') {
      f.coordinates = [34.3, 133.5]; // Setouchi Inland Sea
      f.precision = 'approximate';
      f.description = "Setouchi / Shikoku CO2 Hub Concept: A flagship cross-border CCS initiative linking Japanese industrial clusters with Australian storage basins.";
    }
  }
});

// 2. 坐标 [0,0] 清理：如果 country 为 United States 且坐标为 [0,0]，给一个美国中部的默认坐标作为 Placeholder，避免地图崩掉
db.facilities.forEach(f => {
  if (f.coordinates && f.coordinates[0] === 0 && f.coordinates[1] === 0) {
    if (f.country === 'United States') f.coordinates = [37.09, -95.71];
    if (f.country === 'United Kingdom') f.coordinates = [55.37, -3.43];
    if (f.country === 'China') f.coordinates = [35.86, 104.19];
  }
});

fs.writeFileSync(DB_PATH, JSON.stringify(db, null, 2), 'utf-8');
console.log('✅ Cross-border intelligence links and [0,0] coordinates refined.');
