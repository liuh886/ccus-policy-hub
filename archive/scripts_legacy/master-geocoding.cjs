const fs = require('fs');
const path = require('path');

const DB_PATH = 'src/data/facility_database.json';
const db = JSON.parse(fs.readFileSync(DB_PATH, 'utf8'));

// --- 全球 CCUS 地理编码主库 (Master Atlas) ---
const atlas = {
  // 美国 (States & Key Cities)
  'TX': [31.96, -99.9], 'Texas': [31.96, -99.9], 'Houston': [29.76, -95.36], 'Corpus Christi': [27.8, -97.39],
  'LA': [30.98, -91.96], 'Louisiana': [30.98, -91.96], 'New Orleans': [29.95, -90.07], 'Lake Charles': [30.22, -93.21],
  'WY': [42.75, -107.3], 'Wyoming': [42.75, -107.3], 'Casper': [42.85, -106.32],
  'ND': [47.55, -101.0], 'North Dakota': [47.55, -101.0], 'Beulah': [47.26, -101.77],
  'CA': [36.77, -119.41], 'California': [36.77, -119.41], 'Bakersfield': [35.37, -119.01],
  'IL': [40.63, -89.39], 'Illinois': [40.63, -89.39], 'Decatur': [39.84, -88.95],
  'OK': [35.5, -97.0], 'Oklahoma': [35.5, -97.0], 'Enid': [36.39, -97.87],
  'NM': [34.51, -105.87], 'New Mexico': [34.51, -105.87],

  // 加拿大
  'AB': [53.93, -116.57], 'Alberta': [53.93, -116.57], 'Edmonton': [53.54, -113.49], 'Fort McMurray': [56.72, -111.38],
  'SK': [52.93, -106.45], 'Saskatchewan': [52.93, -106.45], 'Regina': [50.44, -104.61],

  // 澳洲
  'WA': [-25.0, 121.0], 'Western Australia': [-25.0, 121.0], 'Barrow Island': [-20.8, 115.4], 'Gorgon': [-20.7, 115.4],
  'QLD': [-20.9, 142.7], 'Queensland': [-20.9, 142.7], 'Gladstone': [-23.8, 151.2],
  'VIC': [-37.0, 144.0], 'Victoria': [-37.0, 144.0], 'Otway': [-38.5, 142.8],

  // 欧洲
  'Norway': [60.47, 8.46], 'Oygarden': [60.56, 4.88], 'Mongstad': [60.8, 5.03], 'Stavanger': [58.96, 5.73],
  'UK': [55.37, -3.43], 'United Kingdom': [55.37, -3.43], 'Teesside': [54.57, -1.23], 'Humber': [53.68, -0.34], 'Shetland': [60.3, -1.2],
  'Netherlands': [52.13, 5.29], 'Rotterdam': [51.92, 4.47], 'Zeebrugge': [51.32, 3.2],
  'Denmark': [56.26, 9.5], 'Esbjerg': [55.47, 8.45], 'Havnso': [55.75, 11.32],
  'Germany': [51.16, 10.45], 'Wilhelmshaven': [53.53, 8.1],

  // 中东 & 东南亚
  'Saudi Arabia': [23.88, 45.07], 'Jubail': [27.01, 49.65], 'Yanbu': [24.02, 38.19],
  'UAE': [23.42, 53.84], 'Abu Dhabi': [24.45, 54.37],
  'Indonesia': [-0.78, 113.92], 'Gundih': [-7.1, 111.1], 'Tangguh': [-2.4, 133.1],
  'Malaysia': [4.21, 101.97], 'Bintulu': [3.16, 113.03], 'Kasawari': [4.0, 112.5],
  'Thailand': [15.87, 100.99], 'Arthit': [10.0, 101.0]
};

// --- 国家几何中心 (Safety Net) ---
const centers = {
  'United States': [37.09, -95.71], 'USA': [37.09, -95.71], 'China': [35.86, 104.19], '中国': [35.86, 104.19],
  'Canada': [56.13, -106.34], 'Australia': [-25.27, 133.77], 'Japan': [36.2, 138.25], 'France': [46.22, 2.21],
  'Italy': [41.87, 12.56], 'Brazil': [-14.23, -51.92], 'Mexico': [23.63, -102.55], 'United Kingdom': [55.37, -3.43]
};

let countFixed = 0;
let zeroFixed = 0;

db.facilities.forEach(f => {
  const zh = f.zh || {};
  const en = f.en || {};
  const country = (en.country || zh.country || "").trim();
  const location = (en.location || zh.location || "").trim();
  const name = (en.name || zh.name || "").trim();
  
  const currentCoords = zh.coordinates || [0, 0];
  const isInvalid = (currentCoords[0] === 0 && currentCoords[1] === 0);

  let bestCoords = null;

  // 1. 尝试关键词匹配
  for (const [key, val] of Object.entries(atlas)) {
    if (location.includes(key) || name.includes(key)) {
      bestCoords = val;
      break; 
    }
  }

  // 2. 兜底
  if (!bestCoords) {
    if (isInvalid) {
      bestCoords = centers[country] || centers[en.country] || [0, 0];
      zeroFixed++;
    }
  }

  if (bestCoords) {
    if (f.zh) f.zh.coordinates = bestCoords;
    if (f.en) f.en.coordinates = bestCoords;
    countFixed++;
  }
});

fs.writeFileSync(DB_PATH, JSON.stringify(db, null, 2), 'utf8');
console.log(`--- 数据库地理治理巡检报告 ---`);
console.log(`✅ 成功校准设施坐标: ${countFixed} 项`);
console.log(`✅ 物理抹除 [0,0] 漂移: ${zeroFixed} 项`);
