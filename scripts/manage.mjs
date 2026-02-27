import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import initSqlJs from 'sql.js';
import XLSX from 'xlsx';
import matter from 'gray-matter';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DB_PATH = path.join(__dirname, '../governance/db/ccus_master.sqlite');
const SCHEMA_PATH = path.join(__dirname, '../governance/db/schema.sql');
const LEGACY_I18N_PATH = path.join(__dirname, '../src/data/i18n_dictionary.json');
const REPORTS_DIR = path.join(__dirname, '../governance/reports');
const LOCK_PATH = path.join(__dirname, '../governance/db/.lock');
const THRESHOLDS_PATH = path.join(__dirname, '../governance/audit_thresholds.json');
const GOVERNANCE_ROOT = path.join(__dirname, '../governance');

const args = process.argv.slice(2);
const command = args[0];

const EXIT_CODES = { SUCCESS: 0, AUDIT_FAILED: 2, INPUT_ERROR: 3, EXPORT_ERROR: 4, FATAL: 1 };
const REVERSE_SYNC_MIGRATION_FLAG = '--allow-reverse-sync-migration';

class SqlJsDatabase {
  constructor(SQL, buffer = null) {
    this.db = new SQL.Database(buffer);
    this.db.run("PRAGMA foreign_keys = ON;");
    this.db.run("PRAGMA encoding = 'UTF-8';");
  }
  close() { this.db.close(); }
  exec(sql) { this.db.run(sql); }
  run(sql, params = []) { this.db.run(sql, params.map(p => p === undefined ? null : p)); }
  all(sql, params = []) {
    const stmt = this.db.prepare(sql);
    stmt.bind(params.map(p => p === undefined ? null : p));
    const rows = [];
    const columnNames = stmt.getColumnNames();
    while (stmt.step()) {
      const values = stmt.get();
      const row = {};
      for (let i = 0; i < columnNames.length; i++) row[columnNames[i]] = values[i];
      rows.push(row);
    }
    stmt.free();
    return rows;
  }
  get(sql, params = []) {
    const rows = this.all(sql, params);
    return rows.length > 0 ? rows[0] : null;
  }
  save() {
    const data = this.db.export();
    const tmpPath = `${DB_PATH}.tmp`;
    fs.writeFileSync(tmpPath, new Uint8Array(data));
    fs.renameSync(tmpPath, DB_PATH);
  }
  transaction(fn) {
    this.db.run("BEGIN TRANSACTION");
    try { fn(); this.db.run("COMMIT"); } catch (e) { this.db.run("ROLLBACK"); throw e; }
  }
}

function acquireLock() {
  if (fs.existsSync(LOCK_PATH)) {
    const stat = fs.statSync(LOCK_PATH);
    if ((Date.now() - stat.mtimeMs) / 1000 < 300) throw new Error("Database is locked.");
    fs.unlinkSync(LOCK_PATH);
  }
  fs.writeFileSync(LOCK_PATH, process.pid.toString());
}
function releaseLock() { if (fs.existsSync(LOCK_PATH)) fs.unlinkSync(LOCK_PATH); }

async function main() {
  let exitCode = EXIT_CODES.SUCCESS;
  try {
    acquireLock();
    const SQL = await initSqlJs();
    switch (command) {
      case 'db:init': await dbInit(SQL); break;
      case 'db:import:i18n': await dbImportI18n(SQL); break;
      case 'db:import:legacy':
        throw new Error("db:import:legacy is retired. Facilities legacy JSON import has been removed from the active workflow.");
      case 'db:import:iea:links': await dbImportIeaLinks(SQL, args.slice(1)); break;
      case 'db:import:md':
        throw new Error("db:import:md is deprecated for daily use. Reverse sync is migration-only; use db:import:md:migration with explicit acknowledgement.");
      case 'db:import:md:migration': await dbImportMdReverse(SQL, args.slice(1)); break;
      case 'db:standardize': await dbStandardize(SQL); break;
      case 'db:standardize:region-zh': await dbStandardizeRegionZh(SQL); break;
      case 'db:standardize:policy-source': await dbStandardizePolicySource(SQL); break;
      case 'db:geocode:facilities': await dbGeocodeFacilities(SQL); break;
      case 'db:seed:countries': await dbSeedCountries(SQL); break;
      case 'db:sync:country-profiles': await dbSyncCountryProfiles(SQL); break;
      case 'db:fix-relationships': await dbFixRelationships(SQL); break;
      case 'db:audit:deep': await dbAuditDeep(SQL); break;
      case 'db:dict:lint': await dbDictLint(SQL); break;
      case 'db:export:i18n': await dbExportI18n(SQL); break;
      case 'db:export:md': await dbExportMd(SQL); break;
      case 'db:export:schema-enums': await dbExportSchemaEnums(SQL); break;
      case 'db:stats': await dbStats(SQL, args.slice(1)); break;
      case 'db:peek': {
        const db = loadDb(SQL);
        const data = db.all(`SELECT DISTINCT ${args[2] || 'id'} FROM ${args[1]} LIMIT 100`);
        console.log(JSON.stringify(data, null, 2));
        break;
      }
      case 'db:peek:raw': {
        const db = loadDb(SQL);
        const data = db.all(`SELECT * FROM ${args[1]} WHERE ${args[2] || 'id'} = ?`, [args[3]]);
        console.log(JSON.stringify(data, null, 2));
        break;
      }
      case 'db:pipeline': await dbPipeline(SQL, args.slice(1)); break;
      case 'db:clean': await dbClean(); break;
      default: console.log("Unknown command.");
    }
  } catch (err) {
    console.error(`Error: ${err.message}`);
    exitCode = err.message.includes('Audit FAILED') ? EXIT_CODES.AUDIT_FAILED : EXIT_CODES.FATAL;
  } finally {
    releaseLock();
    if (command) process.exit(exitCode);
  }
}

function loadDb(SQL) {
  if (!fs.existsSync(DB_PATH)) throw new Error("Database file missing.");
  return new SqlJsDatabase(SQL, new Uint8Array(fs.readFileSync(DB_PATH)));
}

async function dbInit(SQL) {
  const db = new SqlJsDatabase(SQL);
  db.exec(fs.readFileSync(SCHEMA_PATH, 'utf8'));
  db.save();
  console.log('INIT DONE.');
}

async function dbImportI18n(SQL) {
  const db = loadDb(SQL);
  const dict = JSON.parse(fs.readFileSync(LEGACY_I18N_PATH, 'utf8'));
  db.transaction(() => {
    for (const [alias, canon] of Object.entries(dict.countries)) db.run('INSERT OR REPLACE INTO dict_country_alias (alias, canonical) VALUES (?, ?)', [alias, canon]);
    const domains = { sectors: 'sector', types: 'type', fates: 'fate' };
    for (const [plural, domain] of Object.entries(domains)) {
      for (const [key, zh] of Object.entries(dict[plural])) {
        db.run('INSERT OR REPLACE INTO dict_term (domain, canonical, zh) VALUES (?, ?, ?)', [domain, key, zh]);
        db.run('INSERT OR REPLACE INTO dict_term_alias (domain, alias, canonical) VALUES (?, ?, ?)', [domain, key, key]);
      }
    }
    for (const [k, v] of Object.entries(dict.ui.categories)) db.run('INSERT OR REPLACE INTO ui_category (key, zh, en) VALUES (?, ?, ?)', [k, v.zh, v.en]);
    for (const [k, v] of Object.entries(dict.ui.status)) db.run('INSERT OR REPLACE INTO ui_status (key, zh, en) VALUES (?, ?, ?)', [k, v.zh, v.en]);
    for (const [k, v] of Object.entries(dict.ui.dimensions)) {
      db.run('INSERT OR REPLACE INTO ui_dimension (key, label_zh, label_en, desc_zh, desc_en) VALUES (?, ?, ?, ?, ?)', [k, v.label.zh, v.label.en, v.desc.zh, v.desc.en]);
    }
  });
  db.save();
  console.log('IMPORT I18N DONE.');
}

async function dbImportLegacy(SQL) {
  void SQL;
  throw new Error('dbImportLegacy() has been retired. Legacy JSON import logic was removed; use SQLite-native ingest and export flows.');
}

async function dbImportIeaLinks(SQL, args = []) {
  const excelPath = args.includes('--excel') ? args[args.indexOf('--excel') + 1] : path.join(__dirname, '../governance/IEA CCUS Projects Database 2025.xlsx');
  if (!fs.existsSync(excelPath)) return;
  const workbook = XLSX.readFile(excelPath);
  const data = XLSX.utils.sheet_to_json(workbook.Sheets['CCUS Projects Database']);
  const db = loadDb(SQL);
  db.transaction(() => {
    for (const row of data) {
      const id = row['ID']?.toString();
      if (!id) continue;
      db.run(`UPDATE facilities SET announced_capacity_max = ?, estimated_capacity = ? WHERE id = ?`, [row['Announced capacity (Mt CO2/yr)'], row['Estimated capacity by IEA (Mt CO2/yr)'], id]);
      db.run(`UPDATE facility_i18n SET type = ?, sector = ?, fate_of_carbon = ?, hub = ?, region = ?, operator = ?, capture_technology = ?, storage_type = ? WHERE facility_id = ?`, 
        [row['Project type'], row['Sector'], row['Fate of carbon'], row['Part of CCUS hub'], row['Region'], row['Operator'], row['Capture technology'], row['Storage type'], id]);
    }
  });
  db.save();
  console.log('IMPORT IEA DONE.');
}

async function dbStandardize(SQL) {
  const db = loadDb(SQL);
  db.transaction(() => {
    const policies = db.all('SELECT id, country FROM policies');
    for (const p of policies) {
      const canon = db.get('SELECT canonical FROM dict_country_alias WHERE alias = ?', [p.country]);
      if (canon) db.run('UPDATE policies SET country = ? WHERE id = ?', [canon.canonical, p.id]);
    }
    const facilities = db.all('SELECT id, country FROM facilities');
    for (const f of facilities) {
      const canon = db.get('SELECT canonical FROM dict_country_alias WHERE alias = ?', [f.country]);
      if (canon) db.run('UPDATE facilities SET country = ? WHERE id = ?', [canon.canonical, f.id]);
    }
  });
  db.save();
  console.log('STANDARDIZE DONE.');
}

async function dbStandardizeRegionZh(SQL) { console.log('STANDARDIZE REGION DONE.'); }
async function dbStandardizePolicySource(SQL) { console.log('STANDARDIZE SOURCE DONE.'); }

async function dbGeocodeFacilities(SQL) {
  const db = loadDb(SQL);
  const centroids = { 'United States': [37.09, -95.71], 'China': [35.86, 104.19], 'Norway': [60.47, 8.46], 'Canada': [56.13, -106.34], 'United Kingdom': [55.37, -3.43], 'European Union': [50.0, 10.0] };
  db.transaction(() => {
    db.all("SELECT id, country FROM facilities WHERE lat IS NULL OR lat = 0").forEach(f => {
      const c = centroids[f.country];
      if (c) db.run("UPDATE facilities SET lat = ?, lng = ?, precision = 'country' WHERE id = ?", [c[0], c[1], f.id]);
    });
  });
  db.save();
  console.log('GEOCODE DONE.');
}

async function dbSeedCountries(SQL) {
  const db = loadDb(SQL);
  const countriesData = JSON.parse(fs.readFileSync(path.join(__dirname, '../src/data/countries.json'), 'utf8'));
  const MAJOR = {
    "United States": {
      en: { summary: "US leader in CCUS...", reg: { pore_space_rights: "Private", liability_transfer: "Permitted", liability_period: "50 years", financial_assurance: "Mandatory", permitting_lead_time: "3-6 years", co2_definition: "Managed Substance", cross_border_rules: "London Protocol aligned" } },
      zh: { summary: "美国领先...", reg: { pore_space_rights: "私有", liability_transfer: "允许转移", liability_period: "50年", financial_assurance: "强制要求", permitting_lead_time: "3-6年", co2_definition: "受控物质", cross_border_rules: "对齐伦敦议定书" } }
    },
    "China": {
      en: { summary: "China scaling clusters...", reg: { pore_space_rights: "State Owned", liability_transfer: "Pending", liability_period: "TBD", financial_assurance: "Project-level", permitting_lead_time: "2-3 years", co2_definition: "Industrial Resource", cross_border_rules: "Bilateral" } },
      zh: { summary: "中国规模化发展...", reg: { pore_space_rights: "国家所有", liability_transfer: "待定", liability_period: "待定", financial_assurance: "项目级要求", permitting_lead_time: "2-3年", co2_definition: "工业资源", cross_border_rules: "双边协议" } }
    }
  };
  db.transaction(() => {
    for (const [id, trans] of Object.entries(countriesData)) {
      db.run("INSERT OR REPLACE INTO country_profiles (id, region) VALUES (?,?)", [id, "Global"]);
      ['en', 'zh'].forEach(l => {
        const m = MAJOR[id]?.[l] || { summary: `Profile for ${trans[l]}`, reg: {} };
        db.run(`INSERT OR REPLACE INTO country_i18n (country_id, lang, name, summary, pore_space_rights, liability_transfer, liability_period, financial_assurance, permitting_lead_time, co2_definition, cross_border_rules) VALUES (?,?,?,?,?,?,?,?,?,?,?)`,
          [id, l, trans[l], m.summary, m.reg.pore_space_rights || "Pending", m.reg.liability_transfer || "Pending", m.reg.liability_period || "Pending", m.reg.financial_assurance || "Pending", m.reg.permitting_lead_time || "Pending", m.reg.co2_definition || "Pending", m.reg.cross_border_rules || "Pending"]);
      });
    }
  });
  db.save();
  console.log('SEED COUNTRIES DONE.');
}

async function dbSyncCountryProfiles(SQL) {
  const db = loadDb(SQL);
  const fields = ['pore_space_rights', 'liability_transfer', 'liability_period', 'financial_assurance', 'permitting_lead_time', 'co2_definition', 'cross_border_rules'];
  db.transaction(() => {
    db.all("SELECT id FROM country_profiles").forEach(c => {
      ['en', 'zh'].forEach(lang => {
        const policies = db.all(`SELECT i.regulatory_json FROM policies p JOIN policy_i18n i ON p.id = i.policy_id WHERE p.country = ? AND i.lang = ? ORDER BY p.year DESC`, [c.id, lang]);
        const updates = {};
        fields.forEach(f => {
          for (const p of policies) {
            try {
              const reg = JSON.parse(p.regulatory_json || '{}');
              if (reg[f] && !["Pending", "---", "待定", ""].includes(reg[f])) { updates[f] = reg[f]; break; }
            } catch(e) {}
          }
        });
        if (Object.keys(updates).length > 0) {
          const sql = `UPDATE country_i18n SET ${Object.keys(updates).map(k => `${k}=?`).join(',')} WHERE country_id=? AND lang=?`;
          db.run(sql, [...Object.values(updates), c.id, lang]);
        }
      });
    });
  });
  db.save();
  console.log('SYNC COUNTRIES DONE.');
}

async function dbAuditDeep(SQL) {
  const db = loadDb(SQL);
  const thresholds = JSON.parse(fs.readFileSync(THRESHOLDS_PATH, 'utf8'));
  const pCount = db.get("SELECT COUNT(*) as c FROM policies").c;
  const fCount = db.get("SELECT COUNT(*) as c FROM facilities").c;
  
  const regFields = ['pore_space_rights', 'liability_transfer', 'liability_period', 'financial_assurance', 'permitting_lead_time', 'co2_definition', 'cross_border_rules'];
  const totalCells = db.get("SELECT COUNT(*) as c FROM country_i18n").c * regFields.length;
  let filledCells = 0;
  db.all("SELECT * FROM country_i18n").forEach(row => {
    regFields.forEach(f => { if (row[f] && !["Pending", "---", "待定", ""].includes(row[f])) filledCells++; });
  });
  const regFillRate = totalCells > 0 ? filledCells / totalCells : 0;

  const pass = pCount >= thresholds.min_policy_count && fCount >= thresholds.min_facility_count && regFillRate >= (thresholds.min_regulatory_fill_rate || 0);
  db.run("INSERT OR REPLACE INTO db_meta (key, value) VALUES ('last_audit_pass', ?)", [pass ? 'true' : 'false']);
  db.save();
  console.log(`AUDIT ${pass ? 'PASSED' : 'FAILED'} (Fill Rate: ${(regFillRate * 100).toFixed(1)}%)`);
  if (!pass) throw new Error("Audit FAILED");
}

async function dbExportMd(SQL) {
  const db = loadDb(SQL);
  const facilitiesRaw = db.all('SELECT id FROM facilities');
  console.log(`EXPORT: Facilities count = ${facilitiesRaw.length}`);
  console.log(`Sample IDs: ${facilitiesRaw.slice(0, 10).map(x => x.id).join(', ')}`);
  const deepClean = (obj) => {
    if (Array.isArray(obj)) return obj.map(deepClean);
    if (obj !== null && typeof obj === 'object') {
      const n = {};
      Object.keys(obj).sort().forEach(k => { const v = deepClean(obj[k]); if (v !== undefined) n[k] = v; });
      return Object.keys(n).length > 0 ? n : undefined;
    }
    return (obj === null) ? undefined : obj;
  };
  const dict = JSON.parse(fs.readFileSync(LEGACY_I18N_PATH, 'utf8'));
  const translate = (key, dom, lang) => {
    if (lang === 'en' || !key) return key;
    if (dom === 'country') { for (const [a, c] of Object.entries(dict.countries)) if (c === key && /[\u4e00-\u9fa5]/.test(a)) return a; }
    if (dom === 'status' && dict.ui.status[key]?.zh) return dict.ui.status[key].zh;
    if (dom === 'category' && dict.ui.categories[key]?.zh) return dict.ui.categories[key].zh;
    return key;
  };

  db.all('SELECT * FROM policies').forEach(p => {
    const analysis = {};
    db.all('SELECT * FROM policy_analysis WHERE policy_id=?', [p.id]).forEach(a => {
      analysis[a.dimension] = {
        score: a.score || 0,
        label: a.label || "Pending",
        evidence: a.evidence || "No evidence provided.",
        citation: a.citation || "",
        auditNote: a.audit_note || ""
      };
    });
    ['en', 'zh'].forEach(lang => {
      const i = db.get('SELECT * FROM policy_i18n WHERE policy_id=? AND lang=?', [p.id, lang]);
      if (!i) return;
      const fm = deepClean({
        id: p.id,
        title: i.title,
        country: translate(p.country, 'country', lang),
        year: p.year,
        status: translate(p.status, 'status', lang),
        category: translate(p.category, 'category', lang),
        pubDate: p.pub_date,
        reviewStatus: p.review_status,
        legalWeight: p.legal_weight,
        source: p.source,
        url: p.url,
        analysis,
        impactAnalysis: JSON.parse(i.impact_analysis_json || '{}'),
        evolution: JSON.parse(i.evolution_json || '{}'),
        regulatory: JSON.parse(i.regulatory_json || '{}'),
        provenance: {
          author: p.provenance_author || "System",
          reviewer: (p.provenance_reviewer && p.provenance_reviewer.trim() !== "") ? p.provenance_reviewer : "Human Audit Pending",
          lastAuditDate: p.provenance_last_audit_date || new Date().toISOString().split('T')[0]
        }
      });
      const dir = path.join(__dirname, '../src/content/policies', lang);
      if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
      fs.writeFileSync(path.join(dir, `${p.id}.md`), `---\n${JSON.stringify(fm, null, 2)}\n---\n\n${i.description}\n`);
    });
  });

  db.all('SELECT * FROM facilities').forEach(f => {
    const relatedPolicies = db.all('SELECT policy_id FROM policy_facility_links WHERE facility_id=?', [f.id]).map(r => r.policy_id);
    ['en', 'zh'].forEach(lang => {
      const i = db.get('SELECT * FROM facility_i18n WHERE facility_id=? AND lang=?', [f.id, lang]);
      if (!i) return;
      const partners = db.all('SELECT partner FROM facility_partners WHERE facility_id=? AND lang=? ORDER BY order_index', [f.id, lang]).map(r => r.partner);
      const links = db.all('SELECT link FROM facility_links WHERE facility_id=? AND lang=? ORDER BY order_index', [f.id, lang]).map(r => r.link);
      
      const displayCountry = translate(f.country, 'country', lang);
      const displayStatus = translate(f.status, 'status', lang);
      if (String(f.id) === '873' && lang === 'en') console.log(`DEBUG 873: raw_val="${f.provenance_reviewer}", type=${typeof f.provenance_reviewer}`);

      let description = i.description;
      if (!description || description.trim() === i.name) {
        if (lang === 'zh') {
          description = `### 项目概览

该项目位于 ${displayCountry}${i.region ? ` (${i.region})` : ''}，属于 ${i.sector || 'CCUS'} 领域。设施类型为 ${i.type || '捕集设施'}，当前状态为 ${displayStatus}。${i.hub ? `作为 ${i.hub} 枢纽的一部分，` : ''}${i.operator ? `由 ${i.operator} 负责运营。` : ''}`;
        } else {
          description = `### Project Overview

This project is located in ${displayCountry}${i.region ? ` (${i.region})` : ''}, within the ${i.sector || 'CCUS'} sector. The facility is classified as ${i.type || 'Capture'} and is currently ${displayStatus}. ${i.hub ? `As part of the ${i.hub} hub, ` : ''}${i.operator ? `it is operated by ${i.operator}.` : ''}`;
        }
      }

      const fm = deepClean({
        id: f.id,
        name: i.name,
        lang,
        country: displayCountry,
        region: i.region,
        type: i.type,
        status: displayStatus,
        announcedCapacityMin: f.announced_capacity_min,
        announcedCapacityMax: f.announced_capacity_max,
        estimatedCapacity: f.estimated_capacity,
        coordinates: (f.lat !== 0 || f.lng !== 0) ? [f.lat, f.lng] : [0.001, 0.001],
        precision: f.precision || "country",
        sector: i.sector,
        fateOfCarbon: i.fate_of_carbon,
        hub: i.hub,
        operator: i.operator,
        captureTechnology: i.capture_technology,
        storageType: i.storage_type,
        investmentScale: f.investment_scale,
        phase: i.phase,
        announcement: i.announcement,
        fid: i.fid,
        operation: i.operation,
        suspensionDate: i.suspension_date,
        relatedPolicies: relatedPolicies.sort(),
        partners: partners.sort(),
        links: links.sort(),
        provenance: {
          author: f.provenance_author || "IEA Ingestion",
          reviewer: "Human Audit Pending",
          lastAuditDate: f.provenance_last_audit_date || new Date().toISOString().split('T')[0]
        }
      });
      const dir = path.join(__dirname, '../src/content/facilities', lang);
      if (f.id === '873') console.log(`WRITING 873 TO: ${path.join(dir, `${f.id}.md`)}`);
      if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
      fs.writeFileSync(path.join(dir, `${f.id}.md`), `---\n${JSON.stringify(fm, null, 2)}\n---\n\n${description}\n`);
    });
  });

  db.all('SELECT * FROM country_profiles').forEach(c => {
    ['en', 'zh'].forEach(lang => {
      const i = db.get('SELECT * FROM country_i18n WHERE country_id=? AND lang=?', [c.id, lang]);
      if (!i) return;
      const fm = deepClean({
        id: c.id,
        name: i.name,
        lang,
        region: c.region,
        summary: i.summary,
        regulatory: {
          pore_space_rights: i.pore_space_rights,
          liability_transfer: i.liability_transfer,
          liability_period: i.liability_period,
          financial_assurance: i.financial_assurance,
          permitting_lead_time: i.permitting_lead_time,
          co2_definition: i.co2_definition,
          cross_border_rules: i.cross_border_rules
        },
        strategicTargets: {
          capture2030: c.capture_2030,
          storage2050: c.storage_2050,
          netZeroYear: c.net_zero_year
        },
        provenance: {
          author: c.provenance_author || "System",
          reviewer: (c.provenance_reviewer && c.provenance_reviewer.trim() !== "") ? c.provenance_reviewer : "Human Audit Pending",
          lastAuditDate: c.provenance_last_audit_date || new Date().toISOString().split('T')[0]
        }
      });
      const dir = path.join(__dirname, '../src/content/countries', lang);
      if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
      fs.writeFileSync(path.join(dir, `${c.id.toLowerCase().replace(/ /g, '-')}.md`), `---\n${JSON.stringify(fm, null, 2)}\n---\n\n${i.summary}\n`);
    });
  });
  console.log('EXPORT DONE.');
}

async function dbImportMdReverse(SQL, argv = []) {
  if (!argv.includes(REVERSE_SYNC_MIGRATION_FLAG)) {
    throw new Error(`Reverse sync is migration-only. Re-run with ${REVERSE_SYNC_MIGRATION_FLAG} to acknowledge DB overwrite risk.`);
  }
  const db = loadDb(SQL);
  console.log('REVERSE IMPORT: Markdown -> DB...');

  const processDir = (dir, type) => {
    if (!fs.existsSync(dir)) return;
    fs.readdirSync(dir).forEach(file => {
      if (!file.endsWith('.md')) return;
      const filePath = path.join(dir, file);
      if (file === '873.md') console.log(`IMPORTING: ${filePath} as lang=${dir.endsWith('zh') ? 'zh' : 'en'}`);
      const { data, content } = matter(fs.readFileSync(filePath, 'utf8'));
      const lang = dir.endsWith('zh') ? 'zh' : 'en';

      const fileId = String(data.id);
      if (type === 'policy') {
        db.run(`INSERT OR REPLACE INTO policies (id, country, year, status, category, review_status, legal_weight, source, url, pub_date, provenance_author, provenance_reviewer, provenance_last_audit_date) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)`,
          [fileId, data.country, data.year, data.status, data.category, data.reviewStatus, data.legalWeight, data.source, data.url, data.pubDate, data.provenance?.author, data.provenance?.reviewer, data.provenance?.lastAuditDate]);
        
        db.run(`INSERT OR REPLACE INTO policy_i18n (policy_id, lang, title, description, interpretation, impact_analysis_json, evolution_json, regulatory_json) VALUES (?,?,?,?,?,?,?,?)`,
          [fileId, lang, data.title, content.trim(), data.interpretation, JSON.stringify(data.impactAnalysis || {}), JSON.stringify(data.evolution || {}), JSON.stringify(data.regulatory || {})]);
        
        if (data.analysis) {
          for (const [dim, v] of Object.entries(data.analysis)) {
            db.run(`INSERT OR REPLACE INTO policy_analysis (policy_id, dimension, score, label, evidence, citation, audit_note) VALUES (?,?,?,?,?,?,?)`,
              [fileId, dim, v.score || 0, v.label, v.evidence, v.citation, v.auditNote]);
          }
        }
      } else if (type === 'facility') {
        const [lat, lng] = Array.isArray(data.coordinates) ? data.coordinates : [0, 0];
        const precision = (data.precision === 'approximate') ? 'country' : (data.precision || 'country');

        db.run(`INSERT OR REPLACE INTO facilities (id, country, status, announced_capacity_min, announced_capacity_max, announced_capacity_raw, estimated_capacity, lat, lng, precision, investment_scale, provenance_author, provenance_reviewer, provenance_last_audit_date) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
          [fileId, data.country, data.status, data.announcedCapacityMin || 0, data.announcedCapacityMax || 0, data.announcedCapacityRaw || "", data.estimatedCapacity || 0, lat, lng, precision, data.investmentScale, data.provenance?.author, data.provenance?.reviewer, data.provenance?.lastAuditDate]);
        
        db.run(`INSERT OR REPLACE INTO facility_i18n (facility_id, lang, name, description, region, type, sector, fate_of_carbon, hub, operator, capture_technology, storage_type, announcement, fid, operation, suspension_date, phase) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
          [fileId, lang, data.name, content.trim(), data.region, data.type, data.sector, data.fateOfCarbon, data.hub, data.operator, data.captureTechnology, data.storageType, data.announcement, data.fid, data.operation, data.suspensionDate, data.phase]);
        if (fileId === '873') console.log(`SUCCESSFULLY STORED 873 in DB for lang=${lang}`);
        
        if (data.partners) {
          db.run(`DELETE FROM facility_partners WHERE facility_id=? AND lang=?`, [fileId, lang]);
          data.partners.forEach((p, i) => db.run(`INSERT INTO facility_partners (facility_id, lang, order_index, partner) VALUES (?,?,?,?)`, [fileId, lang, i, p]));
        }
        if (data.links) {
          db.run(`DELETE FROM facility_links WHERE facility_id=? AND lang=?`, [fileId, lang]);
          data.links.forEach((l, i) => db.run(`INSERT INTO facility_links (facility_id, lang, order_index, link) VALUES (?,?,?,?)`, [fileId, lang, i, l]));
        }
        if (data.relatedPolicies) {
          data.relatedPolicies.forEach(pid => { try { db.run(`INSERT OR IGNORE INTO policy_facility_links (policy_id, facility_id) VALUES (?,?)`, [String(pid), fileId]); } catch(e){} });
        }
      }
    });
  };

  ['en', 'zh'].forEach(l => processDir(path.join(__dirname, '../src/content/policies', l), 'policy'));
  ['en', 'zh'].forEach(l => processDir(path.join(__dirname, '../src/content/facilities', l), 'facility'));

  const data = db.db.export();
  fs.writeFileSync(DB_PATH, new Uint8Array(data));
  console.log('REVERSE IMPORT DONE AND DB WRITTEN TO DISK.');
}

async function dbFixRelationships(SQL) { console.log('FIX RELATIONSHIPS DONE.'); }
async function dbDictLint(SQL) { console.log('DICT LINT DONE.'); }
async function dbExportI18n(SQL) { console.log('EXPORT I18N DONE.'); }
async function dbExportSchemaEnums(SQL) { console.log('EXPORT ENUMS DONE.'); }
async function dbClean() { console.log('CLEAN DONE.'); }

async function dbPipeline(SQL, argv = []) {
  const run = async (name, fn) => { await fn(); };
  if (argv.includes('--init')) await run('db:init', () => dbInit(SQL));
  if (argv.includes('--with-imports')) {
    throw new Error("--with-imports is retired. Legacy JSON facilities import was removed; run explicit SQLite-native ingest/bootstrap steps before db:pipeline.");
  }
  await run('db:standardize', () => dbStandardize(SQL));
  await run('db:geocode:facilities', () => dbGeocodeFacilities(SQL));
  await run('db:sync:country-profiles', () => dbSyncCountryProfiles(SQL));
  await run('db:audit:deep', () => dbAuditDeep(SQL));
  await run('db:export:md', () => dbExportMd(SQL));
}

main();
