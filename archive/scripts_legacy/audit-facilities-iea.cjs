const fs = require('fs');

const FACILITY_DB_PATH = 'src/data/facility_database.json';
const IEA_DATA_PATH = 'src/data/iea_temp.json';

const facilityDb = JSON.parse(fs.readFileSync(FACILITY_DB_PATH, 'utf8'));
const ieaData = JSON.parse(fs.readFileSync(IEA_DATA_PATH, 'utf8'));

// 简化的国家经纬度边界框 (Approximate Bounding Boxes for Top Countries)
const countryBounds = {
  "United States": { minLat: 24.396308, maxLat: 49.384358, minLng: -124.848974, maxLng: -66.93457 },
  "China": { minLat: 18.16, maxLat: 53.55, minLng: 73.66, maxLng: 135.05 },
  "Norway": { minLat: 57.9, maxLat: 71.2, minLng: 4.6, maxLng: 31.1 },
  "United Kingdom": { minLat: 49.9, maxLat: 60.8, minLng: -8.6, maxLng: 1.76 },
  "Canada": { minLat: 41.6, maxLat: 83.1, minLng: -141.0, maxLng: -52.6 },
  "Australia": { minLat: -43.6, maxLat: -10.6, minLng: 113.0, maxLng: 153.6 },
  "Netherlands": { minLat: 50.7, maxLat: 53.6, minLng: 3.3, maxLng: 7.2 }
};

const report = {
  geospatialErrors: [],
  capacityDiscrepancies: [],
  statusDiscrepancies: [],
  orphansInDb: []
};

facilityDb.facilities.forEach(f => {
  const zh = f.zh || {};
  const en = f.en || {};
  
  const country = en.country || zh.country;
  const name = en.name || zh.name;
  const coords = en.coordinates || zh.coordinates || [0, 0];
  const capacity = en.capacity || zh.capacity || 0;

  // 1. 地理空间检查
  const bounds = countryBounds[country];
  if (bounds) {
    const [lat, lng] = coords;
    if (lat < bounds.minLat || lat > bounds.maxLat || lng < bounds.minLng || lng > bounds.maxLng) {
      report.geospatialErrors.push(`[OUT_OF_BOUNDS] Project: ${name}, Country: ${country}, Coords: [${lat}, ${lng}]`);
    }
  } else if (coords[0] === 0 && coords[1] === 0) {
    report.geospatialErrors.push(`[ZERO_COORDS] Project: ${name}, Country: ${country}`);
  }

  // 2. IEA 对标 (模糊匹配名称)
  const ieaMatch = ieaData.find(iea => 
    name.toLowerCase().includes(iea['Project name'].toLowerCase()) || 
    iea['Project name'].toLowerCase().includes(name.toLowerCase())
  );

  if (ieaMatch) {
    const ieaCap = parseFloat(ieaMatch['Announced capacity (Mt CO2/yr)']);
    if (ieaCap > 0 && Math.abs(ieaCap - capacity) > 0.1) {
      report.capacityDiscrepancies.push(`[CAPACITY_MISMATCH] Project: ${name}, DB: ${capacity}, IEA: ${ieaCap}`);
    }
  } else {
    report.orphansInDb.push(`[NOT_IN_IEA] Project: ${name} (${country})`);
  }
});

console.log('--- CCUS 设施数据质量审计 (IEA 2025 对标) ---');
console.log(`
[GEOSPATIAL ERRORS] - ${report.geospatialErrors.length} items`);
report.geospatialErrors.slice(0, 10).forEach(e => console.log('  ' + e));

console.log(`
[CAPACITY DISCREPANCIES] - ${report.capacityDiscrepancies.length} items`);
report.capacityDiscrepancies.slice(0, 10).forEach(e => console.log('  ' + e));

console.log(`
[IEA MATCH RATE] - ${((facilityDb.facilities.length - report.orphansInDb.length) / facilityDb.facilities.length * 100).toFixed(1)}%`);
