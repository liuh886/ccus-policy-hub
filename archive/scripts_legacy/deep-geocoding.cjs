const fs = require('fs');
const DB_PATH = 'src/data/facility_database.json';
const db = JSON.parse(fs.readFileSync(DB_PATH, 'utf8'));

// --- 全球 CCUS 高精地理特征矩阵 ---
const geoAtlas = {
  // 美国州缩写 (括号匹配专用)
  ' (TX)': [31.96, -99.9], ' (LA)': [30.98, -91.96], ' (WY)': [42.75, -107.3],
  ' (ND)': [47.55, -101.0], ' (CA)': [36.77, -119.41], ' (IL)': [40.63, -89.39],
  ' (NM)': [34.51, -105.87], ' (OK)': [35.5, -97.0], ' (MI)': [44.31, -85.6],
  ' (IN)': [39.76, -86.15], ' (PA)': [41.2, -77.19], ' (WV)': [38.59, -80.45],
  ' (KS)': [38.5, -98.0], ' (MS)': [32.35, -89.39], ' (IA)': [41.87, -93.09],

  // 加拿大/澳洲缩写
  ' (ALB)': [53.93, -116.57], ' (SK)': [52.93, -106.45], ' (NSW)': [-31.25, 146.92],
  ' (QLD)': [-20.9, 142.7], ' (WA)': [-25.0, 121.0], ' (VIC)': [-37.0, 144.0],

  // 中国细分节点 (中英双语)
  '山东': [36.0, 118.0], 'Dongying': [37.43, 118.49], '东营': [37.43, 118.49], 'Shengli': [37.48, 118.49],
  'Xinjiang': [41.11, 85.29], '新疆': [41.11, 85.29], 'Karamay': [45.59, 84.87], '克拉玛依': [45.59, 84.87], '准东': [44.0, 89.0],
  'Inner Mongolia': [44.09, 113.94], '内蒙古': [44.09, 113.94], 'Ordos': [39.60, 109.78], '鄂尔多斯': [39.60, 109.78],
  'Shaanxi': [35.19, 108.87], '陕西': [35.19, 108.87], 'Yulin': [38.29, 109.74], '榆林': [38.29, 109.74],
  'Guangdong': [23.37, 113.76], '广东': [23.37, 113.76], 'Huizhou': [23.11, 114.41], '惠州': [23.11, 114.41],
  'Jiangsu': [32.97, 119.76], '江苏': [32.97, 119.76], 'Taizhou': [32.45, 119.92], '泰州': [32.45, 119.92],
  'Hebei': [38.04, 114.51], '河北': [38.04, 114.51], 'Tianjin': [39.08, 117.20], '天津': [39.08, 117.20],
  'Zhejiang': [29.14, 119.78], '浙江': [29.14, 119.78], 'Ningbo': [29.86, 121.54], '宁波': [29.86, 121.54],

  // 盆地与枢纽 (Basins & Hubs)
  'Permian': [31.5, -103.0], 'Appalachian': [40.0, -80.0], 'Gulf Coast': [29.0, -94.0],
  'Williston': [48.0, -103.0], 'North Sea': [58.0, 3.0], 'Rotterdam': [51.92, 4.47],
  'Humber': [53.68, -0.34], 'Teesside': [54.57, -1.23], 'Shetland': [60.3, -1.2],
  'Abu Dhabi': [24.45, 54.37], 'Jubail': [27.01, 49.65]
};

let refinedCount = 0;

db.facilities.forEach(f => {
  const zh = f.zh || {};
  const en = f.en || {};
  const name = (en.name || zh.name || "");
  const location = (en.location || zh.location || "");
  const fullSearch = (name + " " + location);

  let targetCoords = null;

  // 核心逻辑：从最细的特征词开始匹配
  for (const [key, coords] of Object.entries(geoAtlas)) {
    if (fullSearch.includes(key)) {
      targetCoords = coords;
      // 如果匹配到了括号里的州名（如 TX），则已经非常精准，可以停止
      if (key.startsWith(' (')) break;
    }
  }

  if (targetCoords) {
    if (f.zh) f.zh.coordinates = targetCoords;
    if (f.en) f.en.coordinates = targetCoords;
    refinedCount++;
  }
});

fs.writeFileSync(DB_PATH, JSON.stringify(db, null, 2), 'utf8');
console.log(`--- 深度地理对齐巡检报告 ---`);
console.log(`✅ 成功根据名称特征词校准: ${refinedCount} 项设施`);
