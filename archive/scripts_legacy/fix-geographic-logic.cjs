const fs = require('fs');
const DB_PATH = 'src/data/facility_database.json';
const db = JSON.parse(fs.readFileSync(DB_PATH, 'utf8'));

// 扩充后的高精度中国工业地图集
const highResChinaAtlas = {
  '榆林': [38.2905, 109.7411], 'Yulin': [38.2905, 109.7411],
  '鄂尔多斯': [39.6082, 109.7813], 'Ordos': [39.6082, 109.7813],
  '准格尔': [39.86, 111.23], 'Jungar': [39.86, 111.23],
  '东营': [37.43, 118.49], 'Dongying': [37.43, 118.49],
  '齐鲁': [36.81, 118.05], 'Zibo': [36.81, 118.05],
  '大庆': [46.58, 125.11], 'Daqing': [46.58, 125.11],
  '松原': [45.14, 124.82], 'Songyuan': [45.14, 124.82],
  '长庆': [37.60, 107.79], 'Changqing': [37.60, 107.79],
  '泰州': [32.45, 119.92], 'Taizhou': [32.45, 119.92],
  '惠州': [23.11, 114.41], 'Huizhou': [23.11, 114.41],
  '兰州': [36.06, 103.83], 'Lanzhou': [36.06, 103.83],
  '宁东': [38.18, 106.60], 'Ningdong': [38.18, 106.60],
  '克拉玛依': [45.59, 84.87], 'Karamay': [45.59, 84.87],
  '哈密': [42.81, 93.51], 'Hami': [42.81, 93.51]
};

let fixCount = 0;

db.facilities.forEach(f => {
  const zh = f.zh || {};
  const en = f.en || {};
  const fullName = (zh.name || "") + (en.name || "");
  
  // 1. 修复 Location 字段 (如果是行业词，则强制尝试从 Name 中提取真实地名)
  const isBrokenLocation = (zh.location && (zh.location.includes('transformation') || zh.location.includes('Other')));
  
  let detectedCity = null;
  let detectedCoords = null;

  for (const [city, coords] of Object.entries(highResChinaAtlas)) {
    if (fullName.includes(city)) {
      detectedCity = city;
      detectedCoords = coords;
      break;
    }
  }

  // 2. 物理应用修复
  if (detectedCity) {
    if (zh) {
      zh.location = detectedCity;
      zh.coordinates = detectedCoords;
    }
    if (en) {
      en.location = detectedCity;
      en.coordinates = detectedCoords;
    }
    fixCount++;
  } else if (isBrokenLocation) {
    // 如果没匹配到，至少把那个错误的行业词从 Location 删掉，退避到 Country
    if (zh) zh.location = zh.country;
    if (en) en.location = en.country;
  }
});

fs.writeFileSync(DB_PATH, JSON.stringify(db, null, 2), 'utf8');
console.log(`✅ 地理与字段逻辑修复完成。精准校准了 ${fixCount} 个工业节点项目。`);
