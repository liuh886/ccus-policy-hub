const fs = require('fs');
const DB_PATH = 'src/data/facility_database.json';

const db = JSON.parse(fs.readFileSync(DB_PATH, 'utf8'));

const precisePatches = {
  "project-444": [22.6000, 114.5500], // Daya Bay CCS Hub
  "project-601": [27.0117, 49.6582], // Jubail CCS Hub
  "project-49": [29.1000, -94.0000],  // Bayou Bend East (Offshore TX)
  "project-249": [51.9028, 4.2755],  // Porthos Rotterdam
  "project-101": [60.5604, 4.8848],  // Northern Lights Oygarden
  "project-967": [-27.8021, 140.2697], // Moomba CCS
  "project-446": [53.2768, -2.8433], // Hynet Northwest
  "project-628": [-20.7769, 115.4609], // Gorgon CCS
  "project-903": [37.4341, 118.4913], // Sinopec Shengli
  "project-25": [53.8318, -113.1144]  // ACTL Redwater
};

let patchCount = 0;
db.facilities.forEach(f => {
  if (precisePatches[f.id]) {
    const coords = precisePatches[f.id];
    if (f.zh) f.zh.coordinates = coords;
    if (f.en) f.en.coordinates = coords;
    patchCount++;
  }
});

fs.writeFileSync(DB_PATH, JSON.stringify(db, null, 2), 'utf8');
console.log(`✅ 已完成首批 ${patchCount} 个核心设施的精确坐标回填。`);
