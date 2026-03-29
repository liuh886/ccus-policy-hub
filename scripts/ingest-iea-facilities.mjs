import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import initSqlJs from 'sql.js';
import XLSX from 'xlsx';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const DB_PATH = path.join(ROOT, 'agent/ccus-ai-agent/db/ccus_master.sqlite');
const LOCK_PATH = path.join(ROOT, 'agent/ccus-ai-agent/db/.lock');
const DICT_PATH = path.join(ROOT, 'src/data/i18n_dictionary.json');
const REPORT_DIR = path.join(ROOT, 'agent/ccus-ai-agent/governance/reports');
const DEFAULT_EXCEL_PATH = path.join(
  ROOT,
  'agent/ccus-ai-agent/assets/IEA CCUS Projects Database 2026.xlsx'
);
const DEFAULT_SHEET_NAME = 'DRAFT CCUS Projects Database';
const IMPORT_AUTHOR = 'IEA CCUS Projects Database 2026';

const args = process.argv.slice(2);

const TYPE_EN_MAP = new Map([
  ['CCU', 'CCU'],
  ['Capture', 'Capture'],
  ['Full Chain', 'Full chain'],
  ['Full chain', 'Full chain'],
  ['Storage', 'Storage'],
  ['T&S', 'T&S'],
  ['Transport', 'Transport'],
]);

const TYPE_ZH_MAP = {
  CCU: '碳利用',
  Capture: '碳捕集',
  'Full chain': '全流程项目',
  Storage: '碳封存',
  'T&S': '运输与封存',
  Transport: '碳运输',
};

const FATE_EN_MAP = new Map([
  ['Dedicated Storage', 'Dedicated storage'],
  ['Dedicated storage', 'Dedicated storage'],
  ['EOR', 'EOR'],
  ['EOR and storage', 'EOR and storage'],
  ['EOR and use', 'EOR and use'],
  ['Mixed', 'Mixed'],
  ['Unknown/unspecified', 'Unknown/unspecified'],
  ['Use', 'Use'],
  ['Use and storage', 'Use and storage'],
  ['Use low impact', 'Use low impact'],
  ['Vented', 'Vented'],
]);

const FATE_ZH_MAP = {
  'Dedicated storage': '永久封存',
  EOR: '强化采油 (EOR)',
  'EOR and storage': 'EOR与封存',
  'EOR and use': 'EOR与利用',
  Mixed: '混合去向',
  'Unknown/unspecified': '未知/未指定',
  Use: '工业利用',
  'Use and storage': '利用与封存',
  'Use low impact': '低影响利用',
  Vented: '直接排放',
};

const STATUS_ZH_MAP = {
  Cancelled: '已取消',
  Decommissioned: '已退役',
  Operational: '运行中',
  Planned: '计划中',
  Suspended: '已中止',
  'Under construction': '建设中',
};

const REGION_ZH_MAP = {
  Africa: '非洲',
  'Australia and New Zealand': '澳大利亚与新西兰',
  'Australia and Other Asia Pacific': '澳大利亚及其他亚太地区',
  'Central and South America': '中南美洲',
  Eurasia: '欧亚大陆',
  Europe: '欧洲',
  'Japan and Other Asia Pacific': '日本及其他亚太地区',
  'Middle East': '中东',
  'North America': '北美',
  'Other Asia Pacific': '其他亚太地区',
  Unknown: '未知',
};

const COUNTRY_TOKEN_EN_MAP = new Map([
  ["People's Republic of China", 'China'],
  ['Lybia', 'Libya'],
  ['Island', 'Iceland'],
]);

const COUNTRY_TOKEN_ZH_EXTRA = new Map([
  ['Chinese Taipei', '中国台湾'],
  ['Slovakia', '斯洛伐克'],
  ['Timor Leste', '东帝汶'],
]);

const SECTOR_MAP = new Map([
  ['CO2 T&S|CO2 T&S', 'T&S'],
  ['CO2 T&S|CO2 storage', 'Storage'],
  ['CO2 T&S|CO2 transport', 'Transport'],
  ['DAC|Direct Air Capture', 'DAC'],
  ['Fuel transformation|Biodiesel', 'Biofuels'],
  ['Fuel transformation|Bioethanol', 'Biofuels'],
  ['Fuel transformation|Biogas', 'Biofuels'],
  ['Fuel transformation|Coal-to-gas', 'Coal-to-gas'],
  ['Fuel transformation|Coal-to-liquids', 'Coal-to-liquids'],
  ['Fuel transformation|Gas-to-liquids', 'Gas-to-liquids'],
  ['Fuel transformation|Hydrogen or ammonia', 'Hydrogen or ammonia'],
  ['Fuel transformation|Natural gas processing/LNG', 'Natural gas processing/LNG'],
  ['Fuel transformation|Oil and gas extraction', 'Oil and gas extraction'],
  ['Fuel transformation|Refining', 'Refining'],
  ['Industry|Aluminium', 'Aluminium'],
  ['Industry|Cement', 'Cement'],
  ['Industry|Chemicals', 'Chemicals'],
  ['Industry|Fertiliser', 'Fertilizer'],
  ['Industry|Gas-to-liquids', 'Gas-to-liquids'],
  ['Industry|Iron and steel', 'Iron and steel'],
  ['Industry|Lime', 'Lime'],
  ['Industry|Other industry', 'Other industry'],
  ['Industry|Pulp and paper', 'Pulp and paper'],
  ['Power and heat|Power (bioenergy)', 'Power and heat'],
  ['Power and heat|Power (coal)', 'Power and heat'],
  ['Power and heat|Power (gas)', 'Power and heat'],
  ['Power and heat|Power and heat (waste)', 'Power and heat'],
  ['TBD|TBD', 'TBD'],
]);

const SECTOR_ZH_MAP = {
  Aluminium: '铝行业',
  Biofuels: '生物燃料',
  'Coal-to-gas': '煤制气',
  'Coal-to-liquids': '煤制油',
  Cement: '水泥行业',
  Chemicals: '化工行业',
  DAC: '直接空气捕集 (DAC)',
  Fertilizer: '化肥生产',
  'Gas-to-liquids': '气制液体燃料',
  'Hydrogen or ammonia': '制氢/氨',
  'Iron and steel': '钢铁行业',
  Lime: '石灰行业',
  'Natural gas processing/LNG': '天然气处理/LNG',
  'Oil and gas extraction': '油气开采',
  'Other industry': '其他工业',
  'Power and heat': '电力与供热',
  'Pulp and paper': '造纸行业',
  Refining: '炼油行业',
  Storage: '封存设施',
  'T&S': '运输与封存',
  TBD: '待定',
  Transport: '运输设施',
};

function getArgValue(flag, fallback = '') {
  const index = args.indexOf(flag);
  if (index === -1) return fallback;
  return args[index + 1] || fallback;
}

function resolveExcelPath() {
  const explicit = getArgValue('--excel');
  if (explicit) return path.resolve(explicit);
  return DEFAULT_EXCEL_PATH;
}

function resolveSheetName() {
  return getArgValue('--sheet', DEFAULT_SHEET_NAME);
}

function todayIso() {
  return new Date().toISOString().slice(0, 10);
}

function timestampTag() {
  return new Date().toISOString().replace(/[:.]/g, '-');
}

function acquireLock() {
  if (fs.existsSync(LOCK_PATH)) {
    const stat = fs.statSync(LOCK_PATH);
    if ((Date.now() - stat.mtimeMs) / 1000 < 300) {
      throw new Error('Database is locked.');
    }
    fs.unlinkSync(LOCK_PATH);
  }
  fs.writeFileSync(LOCK_PATH, String(process.pid));
}

function releaseLock() {
  if (fs.existsSync(LOCK_PATH)) fs.unlinkSync(LOCK_PATH);
}

function cleanString(value) {
  if (value === null || value === undefined) return '';
  return String(value).replace(/\s+/g, ' ').trim();
}

function normalizeId(value) {
  if (value === null || value === undefined || value === '') return '';
  if (typeof value === 'number') {
    return Number.isInteger(value) ? String(value) : String(value);
  }
  const text = cleanString(value);
  if (/^\d+\.0+$/.test(text)) return String(Number(text));
  return text;
}

function parseOptionalNumber(value) {
  if (value === null || value === undefined || value === '') return null;
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

function numericText(value) {
  const number = parseOptionalNumber(value);
  return number === null ? '' : String(Number.isInteger(number) ? number : number);
}

function normalizeCountry(rawCountry) {
  const value = cleanString(rawCountry);
  if (!value) return '';
  return value
    .split(/(\s*-\s*|\s*,\s*)/)
    .map((part) => {
      if (/^\s*-\s*$/.test(part) || /^\s*,\s*$/.test(part)) return part;
      return COUNTRY_TOKEN_EN_MAP.get(part) || part;
    })
    .join('');
}

function normalizeStatus(rawStatus) {
  const value = cleanString(rawStatus);
  if (!value) return '';
  return value === 'Under Construction' ? 'Under construction' : value;
}

function normalizeType(rawType) {
  const value = cleanString(rawType);
  return TYPE_EN_MAP.get(value) || value;
}

function normalizeFate(rawFate) {
  const value = cleanString(rawFate);
  return FATE_EN_MAP.get(value) || value;
}

function normalizeSector(rawSector, rawSubsector) {
  const sector = cleanString(rawSector);
  const subsector = cleanString(rawSubsector);
  const mapped = SECTOR_MAP.get(`${sector}|${subsector}`);
  if (mapped) return mapped;
  return subsector || sector;
}

function buildCountryZhMap(dict) {
  const map = new Map();
  for (const [alias, canonical] of Object.entries(dict.countries || {})) {
    if (/[\u4e00-\u9fff]/.test(alias)) {
      map.set(canonical, alias);
    }
  }
  for (const [canonical, zh] of COUNTRY_TOKEN_ZH_EXTRA.entries()) {
    map.set(canonical, zh);
  }
  return map;
}

function translateComposite(value, translator) {
  return value
    .split(/(\s*-\s*|\s*,\s*)/)
    .map((part) => {
      if (/^\s*-\s*$/.test(part) || /^\s*,\s*$/.test(part)) return part;
      return translator(part);
    })
    .join('');
}

function translateCountryZh(country, countryZhMap) {
  const exact = countryZhMap.get(country);
  if (exact) return exact;
  return translateComposite(country, (part) => countryZhMap.get(part) || part);
}

function translateRegionZh(region) {
  return REGION_ZH_MAP[region] || region;
}

function translateTypeZh(type) {
  return TYPE_ZH_MAP[type] || type;
}

function translateSectorZh(sector) {
  return SECTOR_ZH_MAP[sector] || sector;
}

function translateFateZh(fate) {
  return FATE_ZH_MAP[fate] || fate;
}

function translateStatusZh(status) {
  return STATUS_ZH_MAP[status] || status;
}

function splitPartners(rawPartners) {
  const value = cleanString(rawPartners);
  if (!value) return [];
  return value
    .split(',')
    .map((partner) => cleanString(partner))
    .filter(Boolean);
}

function extractLinks(row) {
  const links = [];
  for (let i = 1; i <= 7; i += 1) {
    const link = cleanString(row[`Ref ${i}`]);
    if (!link) continue;
    if (/^https?:\/\//i.test(link)) links.push(link);
  }
  return links;
}

function buildEnglishDescription(record) {
  const lines = [];
  lines.push('### Project Overview');
  lines.push('');
  lines.push(
    `This ${record.type.toLowerCase() || 'ccus'} project is located in ${record.country}${record.region ? ` (${record.region})` : ''} and is currently ${record.status}.`
  );
  if (record.sector) lines.push(`The primary sector classification is ${record.sector}.`);
  if (record.fate) lines.push(`The reported fate of captured carbon is ${record.fate}.`);
  if (record.hub) lines.push(`The project is associated with the ${record.hub} hub.`);
  if (record.announcement) lines.push(`Announcement year: ${record.announcement}.`);
  if (record.fid) lines.push(`Final investment decision year: ${record.fid}.`);
  if (record.operation) lines.push(`Planned or actual operation year: ${record.operation}.`);
  if (record.suspension) {
    lines.push(
      `Suspension, decommissioning, or cancellation year: ${record.suspension}.`
    );
  }
  if (record.partners.length) lines.push(`Reported partners: ${record.partners.join(', ')}.`);
  return lines.join('\n');
}

function buildChineseDescription(record) {
  const lines = [];
  lines.push('### 项目概览');
  lines.push('');
  lines.push(
    `该项目位于 ${record.country}${record.region ? `（${record.region}）` : ''}，项目类型为 ${record.type || 'CCUS'}，当前状态为 ${record.status}。`
  );
  if (record.sector) lines.push(`主要行业分类为 ${record.sector}。`);
  if (record.fate) lines.push(`二氧化碳去向为 ${record.fate}。`);
  if (record.hub) lines.push(`该项目与 ${record.hub} 枢纽相关。`);
  if (record.announcement) lines.push(`首次公开年份：${record.announcement}。`);
  if (record.fid) lines.push(`最终投资决策年份：${record.fid}。`);
  if (record.operation) lines.push(`投运或计划投运年份：${record.operation}。`);
  if (record.suspension) lines.push(`暂停、退役或取消年份：${record.suspension}。`);
  if (record.partners.length) lines.push(`已披露合作方：${record.partners.join('、')}。`);
  return lines.join('\n');
}

function rowsFromQuery(db, sql, params = []) {
  const stmt = db.prepare(sql);
  stmt.bind(params);
  const rows = [];
  const columns = stmt.getColumnNames();
  while (stmt.step()) {
    const values = stmt.get();
    const row = {};
    for (let i = 0; i < columns.length; i += 1) {
      row[columns[i]] = values[i];
    }
    rows.push(row);
  }
  stmt.free();
  return rows;
}

function tableHasColumn(db, tableName, columnName) {
  const rows = rowsFromQuery(db, `PRAGMA table_info(${tableName})`);
  return rows.some((row) => row.name === columnName);
}

function ensureDir(targetPath) {
  if (!fs.existsSync(targetPath)) fs.mkdirSync(targetPath, { recursive: true });
}

function markdownList(values) {
  if (!values.length) return '- None';
  return values.map((value) => `- ${value}`).join('\n');
}

async function run() {
  const excelPath = resolveExcelPath();
  const sheetName = resolveSheetName();

  if (!fs.existsSync(excelPath)) {
    throw new Error(`Excel file not found: ${excelPath}`);
  }
  if (!fs.existsSync(DB_PATH)) {
    throw new Error(`Database file not found: ${DB_PATH}`);
  }

  acquireLock();
  try {
    const SQL = await initSqlJs();
    const buffer = fs.readFileSync(DB_PATH);
    const db = new SQL.Database(new Uint8Array(buffer));
    db.run('PRAGMA foreign_keys = ON;');

    const dict = JSON.parse(fs.readFileSync(DICT_PATH, 'utf8'));
    const countryZhMap = buildCountryZhMap(dict);
    const hasMrvJson = tableHasColumn(db, 'facilities', 'mrv_json');

    const existingFacilities = new Map(
      rowsFromQuery(db, 'SELECT * FROM facilities').map((row) => [String(row.id), row])
    );
    const existingI18n = rowsFromQuery(db, 'SELECT * FROM facility_i18n');
    const existingEn = new Map(
      existingI18n.filter((row) => row.lang === 'en').map((row) => [String(row.facility_id), row])
    );
    const existingZh = new Map(
      existingI18n.filter((row) => row.lang === 'zh').map((row) => [String(row.facility_id), row])
    );

    const workbook = XLSX.readFile(excelPath, { raw: true });
    const sheet = workbook.Sheets[sheetName];
    if (!sheet) {
      throw new Error(`Worksheet not found: ${sheetName}`);
    }

    const sourceRows = XLSX.utils.sheet_to_json(sheet, { defval: '' });
    const seenIds = new Set();
    const imported = [];
    const sectorWarnings = new Set();
    const countryWarnings = new Set();
    const fateWarnings = new Set();
    const typeWarnings = new Set();

    for (const row of sourceRows) {
      const id = normalizeId(row.ID);
      const name = cleanString(row['Project name']);
      if (!id || !name) continue;
      if (seenIds.has(id)) {
        throw new Error(`Duplicate facility ID in workbook: ${id}`);
      }
      seenIds.add(id);

      const country = normalizeCountry(row['Country or economy']);
      const status = normalizeStatus(row['Project status']);
      const typeEn = normalizeType(row['Project type']);
      const fateEn = normalizeFate(row['Fate of carbon']);
      const sectorEn = normalizeSector(row.Sector, row.Subsector);

      if (!TYPE_EN_MAP.has(cleanString(row['Project type'])) && typeEn) {
        typeWarnings.add(cleanString(row['Project type']));
      }
      if (!FATE_EN_MAP.has(cleanString(row['Fate of carbon'])) && fateEn) {
        fateWarnings.add(cleanString(row['Fate of carbon']));
      }
      if (!SECTOR_MAP.has(`${cleanString(row.Sector)}|${cleanString(row.Subsector)}`) && sectorEn) {
        sectorWarnings.add(`${cleanString(row.Sector)}|${cleanString(row.Subsector)}`);
      }
      if (country !== cleanString(row['Country or economy'])) {
        countryWarnings.add(`${cleanString(row['Country or economy'])} -> ${country}`);
      }

      const existingFacility = existingFacilities.get(id) || {};
      const existingFacilityEn = existingEn.get(id) || {};
      const existingFacilityZh = existingZh.get(id) || {};

      const announcedCapacity = parseOptionalNumber(row['Announced capacity (Mt CO2/yr)']);
      const estimatedCapacity = parseOptionalNumber(row['Estimated capacity by IEA (Mt CO2/yr)']);
      const region = cleanString(row.Region);
      const phase = numericText(row['Project phase']);
      const announcement = numericText(row.Announcement);
      const fid = numericText(row.FID);
      const operation = numericText(row.Operation);
      const suspension = numericText(
        row['Suspension/decommissioning/cancellation']
      );
      const partners = splitPartners(row.Partners);
      const links = extractLinks(row);
      const hub = cleanString(row['Part of CCUS hub']);
      const today = todayIso();

      const enDescription = buildEnglishDescription({
        country,
        region,
        type: typeEn,
        status,
        sector: sectorEn,
        fate: fateEn,
        hub,
        announcement,
        fid,
        operation,
        suspension,
        partners,
      });

      const zhDescription = buildChineseDescription({
        country: translateCountryZh(country, countryZhMap),
        region: translateRegionZh(region),
        type: translateTypeZh(typeEn),
        status: translateStatusZh(status),
        sector: translateSectorZh(sectorEn),
        fate: translateFateZh(fateEn),
        hub,
        announcement,
        fid,
        operation,
        suspension,
        partners,
      });

      imported.push({
        id,
        main: {
          id,
          country,
          status,
          review_status: existingFacility.review_status ?? null,
          announced_capacity_min: announcedCapacity,
          announced_capacity_max: announcedCapacity,
          announced_capacity_raw: cleanString(
            row['Announced capacity (Mt CO2/yr)']
          ),
          estimated_capacity: estimatedCapacity,
          lat: existingFacility.lat ?? null,
          lng: existingFacility.lng ?? null,
          precision: existingFacility.precision ?? null,
          investment_scale: existingFacility.investment_scale ?? null,
          provenance_author: IMPORT_AUTHOR,
          provenance_reviewer: existingFacility.provenance_reviewer ?? '',
          provenance_last_audit_date: today,
          mrv_json: existingFacility.mrv_json ?? null,
        },
        en: {
          facility_id: id,
          lang: 'en',
          name,
          description: enDescription,
          region,
          type: typeEn,
          phase,
          sector: sectorEn,
          fate_of_carbon: fateEn,
          hub,
          operator: existingFacilityEn.operator ?? '',
          capture_technology: existingFacilityEn.capture_technology ?? '',
          storage_type: existingFacilityEn.storage_type ?? '',
          announcement,
          fid,
          operation,
          suspension_date: suspension,
        },
        zh: {
          facility_id: id,
          lang: 'zh',
          name,
          description: zhDescription,
          region,
          type: translateTypeZh(typeEn),
          phase,
          sector: translateSectorZh(sectorEn),
          fate_of_carbon: translateFateZh(fateEn),
          hub,
          operator: existingFacilityZh.operator ?? '',
          capture_technology: existingFacilityZh.capture_technology ?? '',
          storage_type: existingFacilityZh.storage_type ?? '',
          announcement,
          fid,
          operation,
          suspension_date: suspension,
        },
        partners,
        links,
      });
    }

    const importedIds = new Set(imported.map((row) => row.id));
    const previousIds = new Set(existingFacilities.keys());
    const addedIds = [...importedIds].filter((id) => !previousIds.has(id)).sort();
    const removedIds = [...previousIds].filter((id) => !importedIds.has(id)).sort();
    const persistedIds = [...importedIds].filter((id) => previousIds.has(id)).sort();

    let statusChanges = 0;
    let countryChanges = 0;
    let announcedCapacityChanges = 0;
    let estimatedCapacityChanges = 0;
    const statusChangeSamples = [];
    const countryChangeSamples = [];

    for (const record of imported) {
      const existingFacility = existingFacilities.get(record.id);
      if (!existingFacility) continue;

      if ((existingFacility.status || '') !== (record.main.status || '')) {
        statusChanges += 1;
        if (statusChangeSamples.length < 12) {
          statusChangeSamples.push(
            `${record.id}: ${existingFacility.status || '(blank)'} -> ${record.main.status || '(blank)'}`
          );
        }
      }

      if ((existingFacility.country || '') !== (record.main.country || '')) {
        countryChanges += 1;
        if (countryChangeSamples.length < 12) {
          countryChangeSamples.push(
            `${record.id}: ${existingFacility.country || '(blank)'} -> ${record.main.country || '(blank)'}`
          );
        }
      }

      if (
        Number(existingFacility.announced_capacity_max || 0) !==
        Number(record.main.announced_capacity_max || 0)
      ) {
        announcedCapacityChanges += 1;
      }

      if (
        Number(existingFacility.estimated_capacity || 0) !==
        Number(record.main.estimated_capacity || 0)
      ) {
        estimatedCapacityChanges += 1;
      }
    }

    db.run('BEGIN TRANSACTION');
    try {
      for (const id of removedIds) {
        db.run('DELETE FROM facilities WHERE id = ?', [id]);
      }

      for (const record of imported) {
        if (hasMrvJson) {
          db.run(
            `
              INSERT INTO facilities (
                id, country, status, review_status,
                announced_capacity_min, announced_capacity_max, announced_capacity_raw,
                estimated_capacity, lat, lng, precision, investment_scale,
                provenance_author, provenance_reviewer, provenance_last_audit_date, mrv_json
              ) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)
              ON CONFLICT(id) DO UPDATE SET
                country = excluded.country,
                status = excluded.status,
                review_status = excluded.review_status,
                announced_capacity_min = excluded.announced_capacity_min,
                announced_capacity_max = excluded.announced_capacity_max,
                announced_capacity_raw = excluded.announced_capacity_raw,
                estimated_capacity = excluded.estimated_capacity,
                lat = excluded.lat,
                lng = excluded.lng,
                precision = excluded.precision,
                investment_scale = excluded.investment_scale,
                provenance_author = excluded.provenance_author,
                provenance_reviewer = excluded.provenance_reviewer,
                provenance_last_audit_date = excluded.provenance_last_audit_date,
                mrv_json = excluded.mrv_json
            `,
            [
              record.main.id,
              record.main.country,
              record.main.status,
              record.main.review_status,
              record.main.announced_capacity_min,
              record.main.announced_capacity_max,
              record.main.announced_capacity_raw,
              record.main.estimated_capacity,
              record.main.lat,
              record.main.lng,
              record.main.precision,
              record.main.investment_scale,
              record.main.provenance_author,
              record.main.provenance_reviewer,
              record.main.provenance_last_audit_date,
              record.main.mrv_json,
            ]
          );
        } else {
          db.run(
            `
              INSERT INTO facilities (
                id, country, status, review_status,
                announced_capacity_min, announced_capacity_max, announced_capacity_raw,
                estimated_capacity, lat, lng, precision, investment_scale,
                provenance_author, provenance_reviewer, provenance_last_audit_date
              ) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)
              ON CONFLICT(id) DO UPDATE SET
                country = excluded.country,
                status = excluded.status,
                review_status = excluded.review_status,
                announced_capacity_min = excluded.announced_capacity_min,
                announced_capacity_max = excluded.announced_capacity_max,
                announced_capacity_raw = excluded.announced_capacity_raw,
                estimated_capacity = excluded.estimated_capacity,
                lat = excluded.lat,
                lng = excluded.lng,
                precision = excluded.precision,
                investment_scale = excluded.investment_scale,
                provenance_author = excluded.provenance_author,
                provenance_reviewer = excluded.provenance_reviewer,
                provenance_last_audit_date = excluded.provenance_last_audit_date
            `,
            [
              record.main.id,
              record.main.country,
              record.main.status,
              record.main.review_status,
              record.main.announced_capacity_min,
              record.main.announced_capacity_max,
              record.main.announced_capacity_raw,
              record.main.estimated_capacity,
              record.main.lat,
              record.main.lng,
              record.main.precision,
              record.main.investment_scale,
              record.main.provenance_author,
              record.main.provenance_reviewer,
              record.main.provenance_last_audit_date,
            ]
          );
        }

        for (const localized of [record.en, record.zh]) {
          db.run(
            `
              INSERT INTO facility_i18n (
                facility_id, lang, name, description, region, type, phase, sector,
                fate_of_carbon, hub, operator, capture_technology, storage_type,
                announcement, fid, operation, suspension_date
              ) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)
              ON CONFLICT(facility_id, lang) DO UPDATE SET
                name = excluded.name,
                description = excluded.description,
                region = excluded.region,
                type = excluded.type,
                phase = excluded.phase,
                sector = excluded.sector,
                fate_of_carbon = excluded.fate_of_carbon,
                hub = excluded.hub,
                operator = excluded.operator,
                capture_technology = excluded.capture_technology,
                storage_type = excluded.storage_type,
                announcement = excluded.announcement,
                fid = excluded.fid,
                operation = excluded.operation,
                suspension_date = excluded.suspension_date
            `,
            [
              localized.facility_id,
              localized.lang,
              localized.name,
              localized.description,
              localized.region,
              localized.type,
              localized.phase,
              localized.sector,
              localized.fate_of_carbon,
              localized.hub,
              localized.operator,
              localized.capture_technology,
              localized.storage_type,
              localized.announcement,
              localized.fid,
              localized.operation,
              localized.suspension_date,
            ]
          );
        }

        db.run('DELETE FROM facility_partners WHERE facility_id = ?', [record.id]);
        record.partners.forEach((partner, index) => {
          db.run(
            'INSERT INTO facility_partners (facility_id, lang, order_index, partner) VALUES (?,?,?,?)',
            [record.id, 'en', index, partner]
          );
          db.run(
            'INSERT INTO facility_partners (facility_id, lang, order_index, partner) VALUES (?,?,?,?)',
            [record.id, 'zh', index, partner]
          );
        });

        db.run('DELETE FROM facility_links WHERE facility_id = ?', [record.id]);
        record.links.forEach((link, index) => {
          db.run(
            'INSERT INTO facility_links (facility_id, lang, order_index, link) VALUES (?,?,?,?)',
            [record.id, 'en', index, link]
          );
          db.run(
            'INSERT INTO facility_links (facility_id, lang, order_index, link) VALUES (?,?,?,?)',
            [record.id, 'zh', index, link]
          );
        });
      }

      db.run(
        "INSERT OR REPLACE INTO db_meta (key, value) VALUES ('last_iea_facilities_import_source', ?)",
        [excelPath]
      );
      db.run(
        "INSERT OR REPLACE INTO db_meta (key, value) VALUES ('last_iea_facilities_import_sheet', ?)",
        [sheetName]
      );
      db.run(
        "INSERT OR REPLACE INTO db_meta (key, value) VALUES ('last_iea_facilities_import_timestamp', ?)",
        [new Date().toISOString()]
      );
      db.run(
        "INSERT OR REPLACE INTO db_meta (key, value) VALUES ('last_iea_facilities_import_rows', ?)",
        [String(imported.length)]
      );
      db.run('COMMIT');
    } catch (error) {
      db.run('ROLLBACK');
      throw error;
    }

    const data = db.export();
    fs.writeFileSync(DB_PATH, new Uint8Array(data));
    db.close();

    ensureDir(REPORT_DIR);

    const report = {
      generated_at: new Date().toISOString(),
      excel_path: excelPath,
      sheet_name: sheetName,
      source_rows: sourceRows.length,
      imported_rows: imported.length,
      previous_facility_count: previousIds.size,
      resulting_facility_count: importedIds.size,
      added_count: addedIds.length,
      removed_count: removedIds.length,
      persisted_count: persistedIds.length,
      status_changes: statusChanges,
      country_changes: countryChanges,
      announced_capacity_changes: announcedCapacityChanges,
      estimated_capacity_changes: estimatedCapacityChanges,
      samples: {
        added_ids: addedIds.slice(0, 20),
        removed_ids: removedIds.slice(0, 20),
        status_changes: statusChangeSamples,
        country_changes: countryChangeSamples,
      },
      warnings: {
        normalized_countries: [...countryWarnings].sort(),
        unmapped_types: [...typeWarnings].sort(),
        unmapped_fates: [...fateWarnings].sort(),
        passthrough_sector_pairs: [...sectorWarnings].sort(),
      },
    };

    const baseName = `iea_2026_facilities_refresh_${timestampTag()}`;
    const reportJsonPath = path.join(REPORT_DIR, `${baseName}.json`);
    const reportMdPath = path.join(REPORT_DIR, `${baseName}.md`);
    fs.writeFileSync(reportJsonPath, JSON.stringify(report, null, 2));
    fs.writeFileSync(
      reportMdPath,
      [
        '# IEA 2026 Facilities Refresh',
        '',
        `- Generated at: ${report.generated_at}`,
        `- Excel: ${excelPath}`,
        `- Sheet: ${sheetName}`,
        `- Source rows: ${sourceRows.length}`,
        `- Imported facilities: ${imported.length}`,
        `- Previous facility count: ${previousIds.size}`,
        `- Added IDs: ${addedIds.length}`,
        `- Removed IDs: ${removedIds.length}`,
        `- Persisted IDs: ${persistedIds.length}`,
        `- Status changes: ${statusChanges}`,
        `- Country changes: ${countryChanges}`,
        `- Announced capacity changes: ${announcedCapacityChanges}`,
        `- Estimated capacity changes: ${estimatedCapacityChanges}`,
        '',
        '## Sample Added IDs',
        markdownList(addedIds.slice(0, 20)),
        '',
        '## Sample Removed IDs',
        markdownList(removedIds.slice(0, 20)),
        '',
        '## Sample Status Changes',
        markdownList(statusChangeSamples),
        '',
        '## Sample Country Changes',
        markdownList(countryChangeSamples),
        '',
        '## Normalized Countries',
        markdownList([...countryWarnings].sort()),
        '',
        '## Passthrough Sector Pairs',
        markdownList([...sectorWarnings].sort()),
        '',
      ].join('\n')
    );

    console.log(
      JSON.stringify(
        {
          status: 'ok',
          excel_path: excelPath,
          sheet_name: sheetName,
          imported_rows: imported.length,
          added_count: addedIds.length,
          removed_count: removedIds.length,
          report_json: reportJsonPath,
          report_md: reportMdPath,
        },
        null,
        2
      )
    );
  } finally {
    releaseLock();
  }
}

run().catch((error) => {
  console.error(`Error: ${error.message}`);
  process.exit(1);
});
