const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const DB_PATH = 'src/data/facility_database.json';
const db = JSON.parse(fs.readFileSync(DB_PATH, 'utf-8'));

const EXCEL_PATH = 'docs/IEA CCUS Projects Database 2025.xlsx';
const JSON_TMP = 'temp_iea_data.json';

const pythonScript = `
import pandas as pd
import json
import numpy as np

df = pd.read_excel(r'${EXCEL_PATH}')
# 将所有 NaN 替换为 None (JSON 中的 null)
df = df.replace({np.nan: None})
data = df.to_dict(orient='records')
with open(r'${JSON_TMP}', 'w', encoding='utf-8') as f:
    json.dump(data, f, ensure_ascii=False)
`;

fs.writeFileSync('temp_convert.py', pythonScript);
execSync('python temp_convert.py');

const ieaData = JSON.parse(fs.readFileSync(JSON_TMP, 'utf-8'));

const statusMap = {
  'Operational': '运行中',
  'Planned': '计划中',
  'Cancelled': '已取消',
  'Under construction': '在建',
  'Decommissioned': '已关停'
};

let updatedCount = 0;
let addedCount = 0;

ieaData.forEach(row => {
  const id = row['ID']?.toString();
  if (!id) return;

  const existingIdx = db.facilities.findIndex(f => f.id.toString() === id);
  
  const capacity = row['Estimated capacity by IEA (Mt CO2/yr)'] || row['Announced capacity (Mt CO2/yr)'] || 0;
  const status = statusMap[row['Project Status']] || row['Project Status'] || "未知";

  if (existingIdx > -1) {
    // 增量更新：仅更新状态、能力和投产年份
    Object.assign(db.facilities[existingIdx], {
      status: status,
      capacity: typeof capacity === 'number' ? capacity : parseFloat(capacity) || 0,
      commencementYear: row['Operation'] || db.facilities[existingIdx].commencementYear
    });
    updatedCount++;
  } else {
    // 新增条目
    db.facilities.push({
      id: id,
      name: row['Project name'] || "Unnamed Project",
      country: row['Country or economy'] || "Unknown",
      type: row['Project type'] || "Unknown",
      status: status,
      capacity: typeof capacity === 'number' ? capacity : parseFloat(capacity) || 0,
      sector: row['Sector'] || "General",
      storage_type: row['Fate of carbon'] || "Unknown",
      commencementYear: row['Operation'],
      coordinates: [0, 0],
      precision: 'approximate',
      description: `Entry from IEA 2025 Database. Developed by ${row['Partners'] || 'various partners'}.`,
      relatedPolicies: []
    });
    addedCount++;
  }
});

fs.writeFileSync(DB_PATH, JSON.stringify(db, null, 2), 'utf-8');
console.log(`✅ IEA 2025 Sync Complete: Added ${addedCount}, Updated ${updatedCount}. Total items: ${db.facilities.length}`);

fs.unlinkSync('temp_convert.py');
fs.unlinkSync(JSON_TMP);