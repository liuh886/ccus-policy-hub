const fs = require('fs');
const FACILITY_DB = 'src/data/facility_database.json';

const fdb = JSON.parse(fs.readFileSync(FACILITY_DB, 'utf8'));

const chinaAtlas = {
  '胜利油田': [37.48, 118.49], '东营': [37.43, 118.49], 'Dongying': [37.43, 118.49],
  '大亚湾': [22.60, 114.55], '惠州': [23.11, 114.41], 'Huizhou': [23.11, 114.41],
  '鄂尔多斯': [39.60, 109.78], 'Ordos': [39.60, 109.78], '内蒙古': [44.09, 113.94],
  '榆林': [38.29, 109.74], '陕西': [35.19, 108.87], 'Yulin': [38.29, 109.74],
  '克拉玛依': [45.59, 84.87], '新疆': [41.11, 85.29], 'Karamay': [45.59, 84.87], '哈密': [42.81, 93.51],
  '宁东': [38.18, 106.60], '宁夏': [37.26, 106.16],
  '天津': [39.08, 117.20], '泰州': [32.45, 119.92], '江苏': [32.97, 119.76],
  '双鸭山': [46.63, 131.15], '黑龙江': [45.74, 127.14],
  '盘锦': [41.13, 122.07], '辽宁': [41.29, 122.60],
  '广东': [23.37, 113.76], '深圳': [22.54, 114.05],
  '四川': [30.65, 104.07], '重庆': [29.56, 106.55],
  '吉林': [43.83, 126.54], '松原': [45.14, 124.82]
};

let cnFixed = 0;

fdb.facilities.forEach(f => {
  const isChina = (f.zh?.country === '中国' || f.en?.country === 'China');
  if (isChina) {
    const loc = (f.zh?.location || "") + (f.zh?.name || "") + (f.en?.location || "") + (f.en?.name || "");
    
    let bestMatch = null;
    for (const [key, coords] of Object.entries(chinaAtlas)) {
      if (loc.includes(key)) {
        bestMatch = coords;
        // 城市级匹配具有最高优先级
        if (key !== '中国' && key !== 'China' && key !== '内蒙古' && key !== '新疆' && key !== '陕西') {
          break;
        }
      }
    }

    if (bestMatch) {
      if (f.zh) f.zh.coordinates = bestMatch;
      if (f.en) f.en.coordinates = bestMatch;
      cnFixed++;
    } else {
      // 降级使用中国中心点，确保不在 0,0
      const center = [35.86, 104.19];
      if (f.zh) f.zh.coordinates = center;
      if (f.en) f.en.coordinates = center;
    }
  }
});

fs.writeFileSync(FACILITY_DB, JSON.stringify(fdb, null, 2), 'utf8');
console.log(`✅ 中国区设施治理完成：成功校准了 ${cnFixed} 个项目的省级/城市级精确位置。`);
