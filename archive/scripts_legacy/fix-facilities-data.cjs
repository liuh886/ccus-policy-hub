const fs = require('fs');

const DB_PATH = 'src/data/facility_database.json';
const IEA_PATH = 'src/data/iea_temp.json';

const db = JSON.parse(fs.readFileSync(DB_PATH, 'utf8'));
const ieaData = JSON.parse(fs.readFileSync(IEA_PATH, 'utf8'));

// 全球核心 CCUS 枢纽坐标映射表
const hubCoords = {
  'Tomakomai': [42.63, 141.60],
  'Alberta': [53.54, -113.49],
  'Saskatchewan': [52.93, -106.45],
  'Rotterdam': [51.92, 4.47],
  'Teesside': [54.57, -1.23],
  'Humber': [53.68, -0.34],
  'Texas': [31.96, -99.90],
  'Louisiana': [30.98, -91.96],
  'Xinjiang': [41.11, 85.29],
  'Inner Mongolia': [44.09, 113.94],
  'North Sea': [58.0, 3.0],
  'Gorgon': [-20.78, 115.44],
  'Sleipner': [58.36, 1.91],
  'Snøhvit': [71.58, 21.01]
};

// 国家中心点映射表 (防止 0,0 漂移)
const countryCenters = {
  'United States': [37.09, -95.71],
  'USA': [37.09, -95.71],
  'China': [35.86, 104.19],
  '中国': [35.86, 104.19],
  'Norway': [60.47, 8.46],
  'United Kingdom': [55.37, -3.43],
  'Canada': [56.13, -106.34],
  'Australia': [-25.27, 133.77],
  'Netherlands': [52.13, 5.29],
  'Germany': [51.16, 10.45],
  'Japan': [36.20, 138.25],
  'Saudi Arabia': [23.88, 45.07]
};

let capFixed = 0;
let coordFixed = 0;

db.facilities.forEach(f => {
  const zh = f.zh || {};
  const en = f.en || {};
  const name = en.name || zh.name || "";
  const country = en.country || zh.country || "";
  const location = en.location || zh.location || "";

  // 1. 属性修复 (IEA Match)
  const iea = ieaData.find(i => 
    name.toLowerCase().includes(i['Project name'].toLowerCase()) || 
    i['Project name'].toLowerCase().includes(name.toLowerCase())
  );

  if (iea) {
    const ieaCap = parseFloat(iea['Announced capacity (Mt CO2/yr)']);
    if (ieaCap > 0) {
      if (zh) zh.capacity = ieaCap;
      if (en) en.capacity = ieaCap;
      capFixed++;
    }
  }

  // 2. 坐标修复
  let currentCoords = en.coordinates || zh.coordinates || [0, 0];
  let isInvalid = (currentCoords[0] === 0 && currentCoords[1] === 0);

  if (isInvalid) {
    // 尝试 Hub 匹配
    let hubMatch = Object.keys(hubCoords).find(h => location.includes(h) || name.includes(h));
    if (hubMatch) {
      currentCoords = hubCoords[hubMatch];
    } else {
      // 降级到国家中心点
      currentCoords = countryCenters[country] || [0, 0];
    }
    
    if (zh) zh.coordinates = currentCoords;
    if (en) en.coordinates = currentCoords;
    coordFixed++;
  }
});

fs.writeFileSync(DB_PATH, JSON.stringify(db, null, 2), 'utf8');
console.log(`--- 设施治理修复报告 ---`);
console.log(`✅ 产能校准: ${capFixed} 项`);
console.log(`✅ 空间坐标纠偏: ${coordFixed} 项`);
