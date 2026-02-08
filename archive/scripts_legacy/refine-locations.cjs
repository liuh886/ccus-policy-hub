const fs = require('fs');
const FACILITY_DB = 'src/data/facility_database.json';

const fdb = JSON.parse(fs.readFileSync(FACILITY_DB, 'utf8'));

const regionCoords = {
  // --- North America ---
  'Texas': [31.9686, -99.9018], 'Houston': [29.7604, -95.3698], 'Midland': [31.9973, -102.0779],
  'Louisiana': [30.9843, -91.9623], 'New Orleans': [29.9511, -90.0715], 'Baton Rouge': [30.4515, -91.1871],
  'Wyoming': [42.7560, -107.3025], 'Casper': [42.8501, -106.3252],
  'California': [36.7783, -119.4179], 'Bakersfield': [35.3733, -119.0187],
  'North Dakota': [47.5515, -101.0020], 'Beulah': [47.2644, -101.7774],
  'Alberta': [53.9333, -116.5765], 'Edmonton': [53.5461, -113.4938], 'Calgary': [51.0447, -114.0719],
  'Saskatchewan': [52.9399, -106.4509], 'Weyburn': [49.6611, -103.8511],

  // --- China ---
  'Xinjiang': [41.1129, 85.2947], 'Karamay': [45.5958, 84.8739], 'Hami': [42.8185, 93.5149],
  'Inner Mongolia': [44.0935, 113.9448], 'Ordos': [39.6082, 109.7813], '鄂尔多斯': [39.6082, 109.7813],
  'Shengli': [37.4871, 118.4913], 'Dongying': [37.4341, 118.4913], '东营': [37.4341, 118.4913],
  'Shaanxi': [35.1917, 108.8701], 'Yulin': [38.2905, 109.7411], '榆林': [38.2905, 109.7411],
  'Guangdong': [23.3790, 113.7633], 'Huizhou': [23.1108, 114.4128], '惠州': [23.1108, 114.4128],

  // --- Europe ---
  'Rotterdam': [51.9225, 4.4792], 'Zeeland': [51.4940, 3.8497],
  'Norway': [60.4720, 8.4689], 'Øygarden': [60.4800, 4.8500], 'Stavanger': [58.9690, 5.7331],
  'Teesside': [54.5762, -1.2348], 'Humber': [53.6800, -0.3400], 'Aberdeen': [57.1497, -2.0943],
  'Dunkirk': [51.0343, 2.3768], 'Le Havre': [49.4944, 0.1079],

  // --- Middle East & APAC ---
  'Abu Dhabi': [24.4539, 54.3773], 'Jubail': [27.0117, 49.6582], 'Yanbu': [24.0232, 38.1900],
  'Gladstone': [-23.8485, 151.2683], 'Darwin': [-12.4634, 130.8456], 'Moomba': [-28.1111, 140.1917],
  'Bintulu': [3.1667, 113.0333], 'Rayong': [12.6814, 101.2813]
};

let refinedCount = 0;

fdb.facilities.forEach(f => {
  const loc = (f.en?.location || f.zh?.location || "").trim();
  const name = (f.en?.name || f.zh?.name || "").trim();
  const country = (f.en?.country || f.zh?.country || "").trim();
  
  const c = f.zh?.coordinates || [0,0];
  // 即使现在不是 0,0，我们也尝试通过关键词匹配更精细的位置
  
  let bestMatch = null;
  for (const [key, coords] of Object.entries(regionCoords)) {
    if (loc.includes(key) || name.includes(key)) {
      bestMatch = coords;
      // 如果匹配到了城市级（如 Houston），优先级高于州级（如 Texas）
      if (key !== 'Texas' && key !== 'Louisiana' && key !== 'China' && key !== 'USA') {
        break; 
      }
    }
  }

  if (bestMatch) {
    if (f.zh) f.zh.coordinates = bestMatch;
    if (f.en) f.en.coordinates = bestMatch;
    refinedCount++;
  }
});

fs.writeFileSync(FACILITY_DB, JSON.stringify(fdb, null, 2), 'utf8');
console.log(`✅ 地理精细化完成：校准了 ${refinedCount} 个设施的精确坐标。`);