import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import initSqlJs from 'sql.js';
import XLSX from 'xlsx';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DB_PATH = path.join(__dirname, '../governance/db/ccus_master.sqlite');
const SCHEMA_PATH = path.join(__dirname, '../governance/db/schema.sql');
const LEGACY_POLICY_PATH = path.join(__dirname, '../src/data/policy_database.json');
const LEGACY_FACILITY_PATH = path.join(__dirname, '../src/data/facility_database.json');
const LEGACY_I18N_PATH = path.join(__dirname, '../src/data/i18n_dictionary.json');
const REPORTS_DIR = path.join(__dirname, '../governance/reports');
const LOCK_PATH = path.join(__dirname, '../governance/db/.lock');
const THRESHOLDS_PATH = path.join(__dirname, '../governance/audit_thresholds.json');

const args = process.argv.slice(2);
const command = args[0];

// --- Exit Codes (Gate B3) ---
const EXIT_CODES = {
  SUCCESS: 0,
  AUDIT_FAILED: 2,
  INPUT_ERROR: 3,
  EXPORT_ERROR: 4,
  FATAL: 1
};

class SqlJsDatabase {
  constructor(SQL, buffer = null) {
    this.db = new SQL.Database(buffer);
    this.db.run("PRAGMA foreign_keys = ON;");
    this.db.run("PRAGMA encoding = 'UTF-8';");
  }
  close() {
    this.db.close();
  }
  exec(sql) { this.db.run(sql); }
  run(sql, params = []) {
    const mappedParams = params.map(p => {
      if (p === undefined) return null;
      // If it's a string, we ensure it's not double-encoded if it's already UTF8
      return p;
    });
    this.db.run(sql, mappedParams);
  }
    all(sql, params = []) {
      const stmt = this.db.prepare(sql);
      stmt.bind(params.map(p => p === undefined ? null : p));
      const rows = [];
      const decoder = new TextDecoder('utf-8');
      const columnNames = stmt.getColumnNames();
      
      while (stmt.step()) {
        const values = stmt.get();
        const row = {};
        for (let i = 0; i < columnNames.length; i++) {
          const val = values[i];
          if (val instanceof Uint8Array) {
            row[columnNames[i]] = decoder.decode(val);
          } else {
            row[columnNames[i]] = val;
          }
        }
        rows.push(row);
      }
      stmt.free();
      return rows;
    }
  
  get(sql, params = []) {
    const rows = this.all(sql, params);
    return rows.length > 0 ? rows[0] : null;
  }
  // Safe helper to decode specific columns if they come out as raw bytes or corrupted strings
  decodeUTF8(str) {
    if (typeof str !== 'string') return str;
    try {
      // If it looks like corrupted UTF-8 (mojibake), try to recover
      // This is a common hack for when UTF-8 bytes are interpreted as Latin1
      return decodeURIComponent(escape(str));
    } catch (e) {
      return str;
    }
  }
  save() {
    const data = this.db.export();
    const tmpPath = `${DB_PATH}.tmp`;
    fs.writeFileSync(tmpPath, new Uint8Array(data)); // S1 Atomic Write
    // Removed unlink for Windows compatibility
    fs.renameSync(tmpPath, DB_PATH);
  }
  transaction(fn) {
    this.db.run("BEGIN TRANSACTION");
    try {
      fn();
      this.db.run("COMMIT");
    } catch (e) {
      this.db.run("ROLLBACK");
      throw e;
    }
  }
}

// --- Lock Mechanism (S3) ---
function acquireLock() {
  if (fs.existsSync(LOCK_PATH)) {
    const stat = fs.statSync(LOCK_PATH);
    const age = (Date.now() - stat.mtimeMs) / 1000;
    if (age < 300) { // 5 minutes TTL
      throw new Error(`Database is locked by another process. (Lock age: ${age.toFixed(1)}s)`);
    }
    fs.unlinkSync(LOCK_PATH);
  }
  fs.writeFileSync(LOCK_PATH, process.pid.toString());
}

function releaseLock() {
  if (fs.existsSync(LOCK_PATH)) fs.unlinkSync(LOCK_PATH);
}

async function main() {
  let exitCode = EXIT_CODES.SUCCESS;
  try {
    acquireLock();
    const SQL = await initSqlJs();
    switch (command) {
      case 'db:init': await dbInit(SQL); break;
      case 'db:import:i18n': await dbImportI18n(SQL); break;
      case 'db:import:legacy': await dbImportLegacy(SQL); break;
      case 'db:import:iea:links': await dbImportIeaLinks(SQL, args.slice(1)); break;
      case 'db:migrate:capacity-v2': await dbMigrateCapacityV2(SQL); break;
      case 'db:geocode:facilities': await dbGeocodeFacilities(SQL, args.slice(1)); break;
      case 'db:standardize': await dbStandardize(SQL); break;
      case 'db:standardize:region-zh': await dbStandardizeRegionZh(SQL); break;
      case 'db:standardize:policy-source': await dbStandardizePolicySource(SQL); break;
      case 'db:enrich:policy-url': await dbEnrichPolicyUrl(SQL, args.slice(1)); break;
      case 'db:peek:analysis': {
        const db = loadDb(SQL);
        const data = db.all("SELECT policy_id, evidence, citation FROM policy_analysis WHERE (evidence IS NOT NULL AND evidence != '') OR (citation IS NOT NULL AND citation != '') LIMIT 10");
        console.log(JSON.stringify(data, null, 2));
        break;
      }
      case 'db:fix-relationships': await dbFixRelationships(SQL); break;
      case 'db:audit:deep': await dbAuditDeep(SQL); break;
      case 'db:dict:lint': await dbDictLint(SQL); break;
      case 'db:export:i18n': await dbExportI18n(SQL); break;
      case 'db:export:md': await dbExportMd(SQL); break;
      case 'db:export:golden': await dbExportGolden(SQL); break;
      case 'db:test:golden': await dbTestGolden(SQL); break;
      case 'db:export:schema-enums': await dbExportSchemaEnums(SQL); break;
      case 'db:stats': await dbStats(SQL, args.slice(1)); break;
      case 'db:stats:missing-urls': {
        const db = loadDb(SQL);
        const data = db.all("SELECT id, country, source FROM policies WHERE url IS NULL OR url = ''");
        console.log(JSON.stringify(data, null, 2));
        break;
      }
      case 'db:backup': await dbBackup(args.slice(1)); break;
      case 'db:restore': await dbRestore(args[1]); break;
      case 'db:optimize': await dbOptimize(SQL); break;
      case 'db:clean': await dbClean(); break;
      default: printHelp();
    }
  } catch (err) {
    console.error(`\nError: ${err.message}`);
    if (err.message.includes('Audit FAILED')) exitCode = EXIT_CODES.AUDIT_FAILED;
    else if (err.message.includes('locked')) exitCode = EXIT_CODES.INPUT_ERROR;
    else exitCode = EXIT_CODES.FATAL;
  } finally {
    releaseLock();
    if (command) process.exit(exitCode);
  }
}

function printHelp() {
  console.log(`
CCUS Policy Hub Governance Tool (sql.js SSOT v6.0 - Hardened)
Usage:
  pnpm manage db:init
  pnpm manage db:import:i18n
  pnpm manage db:import:legacy
  pnpm manage db:import:iea:links --excel <path>
  pnpm manage db:migrate:capacity-v2
  pnpm manage db:geocode:facilities [--mode offline]
  pnpm manage db:standardize
  pnpm manage db:standardize:region-zh
  pnpm manage db:standardize:policy-source
  pnpm manage db:enrich:policy-url [--mode offline]
  pnpm manage db:fix-relationships
  pnpm manage db:audit:deep
  pnpm manage db:dict:lint
  pnpm manage db:export:i18n
  pnpm manage db:export:md
  pnpm manage db:export:golden
  pnpm manage db:test:golden
  pnpm manage db:stats [--output <path>]
  pnpm manage db:backup [--tag <name>]
  pnpm manage db:restore <filename>
  `);
}

function loadDb(SQL) {
  if (!fs.existsSync(DB_PATH)) throw new Error("Database file missing.");
  const buffer = fs.readFileSync(DB_PATH);
  return new SqlJsDatabase(SQL, new Uint8Array(buffer));
}

async function dbInit(SQL) {
  console.log('INIT: Initializing Database...');
  const db = new SqlJsDatabase(SQL);
  db.exec(fs.readFileSync(SCHEMA_PATH, 'utf8'));
  db.save();
  console.log('DONE.');
}

async function dbImportI18n(SQL) {
  console.log('IMPORT: i18n Dictionary...');
  const db = loadDb(SQL);
  const dict = JSON.parse(fs.readFileSync(LEGACY_I18N_PATH, 'utf8'));
  db.transaction(() => {
    for (const [alias, canon] of Object.entries(dict.countries)) {
      db.run('INSERT OR REPLACE INTO dict_country_alias (alias, canonical) VALUES (?, ?)', [alias, canon]);
    }
    const domains = { sectors: 'sector', types: 'type', fates: 'fate' };
    for (const [plural, domain] of Object.entries(domains)) {
      for (const [key, zh] of Object.entries(dict[plural])) {
        db.run('INSERT OR REPLACE INTO dict_term (domain, canonical, zh) VALUES (?, ?, ?)', [domain, key, zh]);
        db.run('INSERT OR REPLACE INTO dict_term_alias (domain, alias, canonical) VALUES (?, ?, ?)', [domain, key, key]);
      }
    }
    for (const [k, v] of Object.entries(dict.ui.categories)) db.run('INSERT OR REPLACE INTO ui_category (key, zh, en) VALUES (?, ?, ?)', [k, v.zh, v.en]);
    
    // Explicitly set policy statuses to avoid facility-policy mixup
    const validPolicyStatuses = {
      "Active": { zh: "现行", en: "Active" },
      "Planned": { zh: "计划中", en: "Planned" },
      "Under development": { zh: "制定中", en: "Under development" },
      "Upcoming": { zh: "即将实施", en: "Upcoming" },
      "Inactive": { zh: "失效", en: "Inactive" },
      "Superseded": { zh: "被取代", en: "Superseded" }
    };
    for (const [k, v] of Object.entries(validPolicyStatuses)) {
      db.run('INSERT OR REPLACE INTO ui_status (key, zh, en) VALUES (?, ?, ?)', [k, v.zh, v.en]);
    }

    for (const [k, v] of Object.entries(dict.ui.dimensions)) {
      db.run('INSERT OR REPLACE INTO ui_dimension (key, label_zh, label_en, desc_zh, desc_en) VALUES (?, ?, ?, ?, ?)', [k, v.label.zh, v.label.en, v.desc.zh, v.desc.en]);
    }
  });
  db.save();
  console.log('DONE.');
}

async function dbImportIeaLinks(SQL, args = []) {
  const excelIdx = args.indexOf('--excel');
  const excelPath = excelIdx !== -1 ? args[excelIdx + 1] : path.join(__dirname, '../governance/IEA CCUS Projects Database 2025.xlsx');

  if (!fs.existsSync(excelPath)) throw new Error(`Excel file not found: ${excelPath}`);
  console.log(`IMPORT: Data from IEA Excel: ${excelPath}`);

  const workbook = XLSX.readFile(excelPath);
  const sheet = workbook.Sheets['CCUS Projects Database'];
  if (!sheet) throw new Error("Sheet 'CCUS Projects Database' not found.");

  const data = XLSX.utils.sheet_to_json(sheet);
  if (data.length > 0) console.log('EXCEL COLUMNS:', Object.keys(data[0]));
  const db = loadDb(SQL);

  const normalize = (s) => (s || "").toLowerCase().replace(/[^a-z0-9]/g, '');
  const parseCapacity = (val) => {
    if (val === null || val === undefined || val === '') return { min: null, max: null, raw: null };
    if (typeof val === 'number') return { min: val, max: val, raw: val.toString() };
    const str = val.toString().trim();
    if (str.includes('-')) {
      const parts = str.split('-').map(p => parseFloat(p.trim().replace(/[^0-9.]/g, '')));
      return { min: parts[0], max: parts[1], raw: str };
    }
    const num = parseFloat(str.replace(/[^0-9.]/g, ''));
    return { min: num, max: num, raw: str };
  };

  const reports = { matched: [], unmatched: [], ambiguous: [] };

  db.transaction(() => {
    for (const row of data) {
      const ieaId = row['ID']?.toString();
      const ieaName = row['Project name'];
      const ieaCountry = row['Country or economy'];

      let facilityId = null;

      // 1. Try match by ID
      const byId = db.get('SELECT id FROM facilities WHERE id = ?', [ieaId]);
      if (byId) {
        facilityId = byId.id;
      } else {
        // 2. Try match by Name + Country
        const normName = normalize(ieaName);
        const countryCanon = db.get('SELECT canonical FROM dict_country_alias WHERE alias = ?', [ieaCountry]);
        const country = countryCanon ? countryCanon.canonical : ieaCountry;

        const candidates = db.all(`
          SELECT f.id, i.name
          FROM facilities f
          JOIN facility_i18n i ON f.id = i.facility_id
          WHERE i.lang = 'en' AND f.country = ?
        `, [country]);

        const matches = candidates.filter(c => normalize(c.name) === normName);
        if (matches.length === 1) {
          facilityId = matches[0].id;
        } else if (matches.length > 1) {
          reports.ambiguous.push({ ieaId, ieaName, ieaCountry, matches: matches.map(m => m.id) });
          continue;
        }
      }

      if (!facilityId) {
        reports.unmatched.push({ ieaId, ieaName, ieaCountry });
        continue;
      }

      // Extract capacity
      const announcedRaw = row['Announced capacity (Mt CO2/yr)'];
      const estimatedRaw = row['Estimated capacity by IEA (Mt CO2/yr)'];
      const cap = parseCapacity(announcedRaw);
      const est = estimatedRaw ? parseFloat(estimatedRaw.toString().replace(/[^0-9.]/g, '')) : null;

      db.run(`
        UPDATE facilities 
        SET announced_capacity_min = ?, announced_capacity_max = ?, announced_capacity_raw = ?, estimated_capacity = ?
        WHERE id = ?`, 
        [cap.min, cap.max, cap.raw, est, facilityId]
      );

            // Import i18n metadata
            const type = row['Project type'];
            const phase = row['Project phase'];
            const sector = row['Sector'];
            const fate = row['Fate of carbon'];
            const hub = row['Part of CCUS hub'];
            const region = row['Region'];
            const announcement = row['Announcement']?.toString();
            const fid = row['FID']?.toString();
            const operation = row['Operation']?.toString();
            const suspension = row['Suspension/decommissioning/cancellation']?.toString();
            
            const partnersRaw = row['Partners'] || "";
            const operatorMatch = partnersRaw.match(/([^,]+)\s*\(operator\)/i) || partnersRaw.match(/operator:\s*([^,]+)/i);
            const operator = operatorMatch ? operatorMatch[1].trim() : null;
      
            db.run(`
              INSERT OR REPLACE INTO facility_i18n (
                facility_id, lang, name, region, type, phase, sector, fate_of_carbon, hub, announcement, fid, operation, suspension_date, operator    
              ) VALUES (?, 'en', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
              [facilityId, ieaName, region, type, phase, sector, fate, hub, announcement, fid, operation, suspension, operator]
            );
      
            // Also insert zh record with basic translation if possible
            db.run(`
              INSERT OR IGNORE INTO facility_i18n (
                facility_id, lang, name, region, type, phase, sector, fate_of_carbon, hub, announcement, fid, operation, suspension_date, operator    
              ) VALUES (?, 'zh', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
              [facilityId, ieaName, region, type, phase, sector, fate, hub, announcement, fid, operation, suspension, operator]
            );
      // Extract links
      const links = new Set();
      for (let i = 1; i <= 7; i++) {
        const val = row[`Ref ${i}`];
        if (val && typeof val === 'string' && val.startsWith('http')) links.add(val.trim());
      }

      if (links.size > 0 || cap.raw !== null) {
        reports.matched.push({ ieaId, ieaName, facilityId, linksCount: links.size, hasCapacity: cap.raw !== null });
        
        if (links.size > 0) {
          db.run("DELETE FROM facility_links WHERE facility_id = ?", [facilityId]);
          const sortedLinks = Array.from(links).sort();
          sortedLinks.forEach((link, idx) => {
            db.run("INSERT INTO facility_links (facility_id, lang, order_index, link) VALUES (?, 'en', ?, ?)", [facilityId, idx, link]);
            db.run("INSERT INTO facility_links (facility_id, lang, order_index, link) VALUES (?, 'zh', ?, ?)", [facilityId, idx, link]);
          });
        }
      }
    }
  });

  db.save();
  // Write report
  const reportPath = path.join(REPORTS_DIR, 'iea_link_match_report.md');
  const reportContent = `# IEA Link Match Report
- Generated: ${new Date().toISOString()}
- Matched: ${reports.matched.length}
- Unmatched: ${reports.unmatched.length}
- Ambiguous: ${reports.ambiguous.length}

## Unmatched (Top 20)
${reports.unmatched.slice(0, 20).map(u => `- ${u.ieaId}: ${u.ieaName} (${u.ieaCountry})`).join('\n')}

## Ambiguous
${reports.ambiguous.map(a => `- ${a.ieaId}: ${a.ieaName} -> ${a.matches.join(', ')}`).join('\n')}
`;
  fs.writeFileSync(reportPath, reportContent);
  console.log(`DONE. Report written to ${reportPath}`);
}

async function dbImportLegacy(SQL) {

  console.log('IMPORT: Legacy Data...');

  const db = loadDb(SQL);

  const pRaw = fs.readFileSync(LEGACY_POLICY_PATH, 'utf8');

  const fRaw = fs.readFileSync(LEGACY_FACILITY_PATH, 'utf8');

  const policies = JSON.parse(pRaw).policies;

  const facilities = JSON.parse(fRaw).facilities;



  // Load HF Backup for additional metadata if exists

  const HF_BACKUP_PATH = path.join(__dirname, '../archive/policy_database.v4.backup.json');

  let hfPolicies = [];

  if (fs.existsSync(HF_BACKUP_PATH)) {

    hfPolicies = JSON.parse(fs.readFileSync(HF_BACKUP_PATH, 'utf8')).policies;

    console.log('HF BACKUP: Loaded for governance metadata.');

  }



  db.transaction(() => {

    // 1. Policies

    for (const p of policies) {

      const hfP = hfPolicies.find(hp => hp.id === p.id);



      db.run(`INSERT OR REPLACE INTO policies (id, country, year, status, category, review_status, legal_weight, source, url, pub_date

, provenance_author, provenance_reviewer, provenance_last_audit_date) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,

        [p.id, p.country, p.year, p.status, p.category, p.reviewStatus, p.legalWeight, p.source, p.url, p.pubDate, p.provenance?.author, p.provenance?.reviewer, p.provenance?.lastAuditDate]);

      

      ['en', 'zh'].forEach(lang => {

        const d = p[lang] || {};

        const hfD = hfP ? (hfP[lang] || {}) : {};



        const impact = d.impactAnalysis || p.impactAnalysis || hfD.impactAnalysis || null;

        const evolution = d.evolution || p.evolution || hfD.evolution || null;

        const interpretation = d.interpretation || p.interpretation || hfD.interpretation || null;

        

        const regulatory = {

          pore_space_rights: hfD.pore_space_rights || d.pore_space_rights || null,

          liability_transfer: hfD.liability_transfer || d.liability_transfer || null,

          liability_period: hfD.liability_period_years || d.liability_period_years || null,

          financial_assurance: hfD.financial_assurance || d.financial_assurance || null,

          permitting_lead_time: hfD.permitting_lead_time || d.permitting_lead_time || null,

          co2_definition: hfD.co2_definition || d.co2_definition || null,

          cross_border_rules: hfD.cross_border_rules || d.cross_border_rules || null

        };



        db.run(`INSERT OR REPLACE INTO policy_i18n (policy_id, lang, title, description, scope, tags_json, impact_analysis_json, interpretation, evolution_json, regulatory_json) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`, 

          [p.id, lang, d.title || p.title, d.description || p.description, d.scope || p.scope, JSON.stringify(d.tags || p.tags || []), 

           impact ? JSON.stringify(impact) : null, 

           interpretation, 

           evolution ? JSON.stringify(evolution) : null,

           JSON.stringify(regulatory)]);

      });



      if (p.analysis) {

        for (const d of ['incentive', 'statutory', 'market', 'strategic', 'mrv']) {

          const v = p.analysis[d];

          if (v) db.run(`INSERT OR REPLACE INTO policy_analysis (policy_id, dimension, score, label, evidence, citation, audit_note) VALUES (?, ?, ?, ?, ?, ?, ?)`, 

            [p.id, d, v.score || 0, v.label, v.evidence, v.citation, v.audit_note || v.auditNote]);

        }

      }

    }

                // 2. Facilities

                for (const f of facilities) {

                  const [lat, lng] = Array.isArray(f.location) ? f.location : [0, 0];

                  const annCap = f.announcedCapacity || f.announcedCapacityMax || f.announcedCapacityMin || f.capacity || 0;

                  const estCap = f.estimatedCapacity || f.capacity || 0;

                  const rawCap = f.announcedCapacityRaw || annCap.toString();

            

                  db.run(`INSERT OR REPLACE INTO facilities (id, country, status, review_status, announced_capacity_min, announced_capacity_max, announced_capacity_raw, estimated_capacity, lat, lng, precision, investment_scale, provenance_author, provenance_reviewer, provenance_last_audit_date) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,

                    [f.id, f.country, f.status, f.reviewStatus, f.announcedCapacityMin || annCap, f.announcedCapacityMax || annCap, rawCap, estCap, lat, lng, f.precision, f.investmentScale || null, f.provenance?.author, f.provenance?.reviewer, f.provenance?.lastAuditDate]);

                    for (const l of ['en', 'zh']) {

                      const d = f[l] || {};

                      db.run(`INSERT OR REPLACE INTO facility_i18n (facility_id, lang, name, description, region, type, phase, sector, fate_of_carbon, hub, operator, capture_technology, storage_type, announcement, fid, operation, suspension_date) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,

                        [f.id, l, d.name || f.name, d.description || f.description || null, d.region || f.region, d.type || f.type, d.phase || f.phase, d.sector || f.sector, d.fateOfCarbon || f.fateOfCarbon, d.hub || f.hub, d.operator || f.operator || null, d.captureTechnology || f.captureTechnology || null, d.storageType || f.storageType || null, d.announcement || f.announcement, d.fid || f.fid, d.operation || f.operation, d.suspensionDate || f.suspensionDate]);
        const pList = d.partners || f.partners || [];
        for (let i = 0; i < pList.length; i++) db.run(`INSERT OR REPLACE INTO facility_partners (facility_id, lang, order_index, partner) VALUES (?, ?, ?, ?)`, [f.id, l, i, pList[i]]);
                const lList = d.links || f.links || [];
                const filteredLinks = lList.filter(l => l && typeof l === 'string' && l.startsWith('http'));
                for (let i = 0; i < filteredLinks.length; i++) db.run(`INSERT OR REPLACE INTO facility_links (facility_id, lang, order_index, link) VALUES (?, ?, ?, ?)`, [f.id, l, i, filteredLinks[i]]);
              }
    }
    // 3. Links
    for (const p of policies) {
      if (p.relatedFacilities) {
        for (const fid of p.relatedFacilities) {
          try { db.run('INSERT OR REPLACE INTO policy_facility_links (policy_id, facility_id) VALUES (?, ?)', [p.id, fid]); } catch (e) {}
        }
      }
    }
    for (const f of facilities) {
      if (f.relatedPolicies) {
        for (const pid of f.relatedPolicies) {
          try { db.run('INSERT OR REPLACE INTO policy_facility_links (policy_id, facility_id) VALUES (?, ?)', [pid, f.id]); } catch (e) {}
        }
      }
    }
  });
  db.save();
  console.log('DONE.');
}

async function dbStandardize(SQL) {
  console.log('STANDARDIZE: Data...');
  const db = loadDb(SQL);
  const counts = {
    countries: db.get('SELECT COUNT(*) as c FROM dict_country_alias').c,
    terms: db.get('SELECT COUNT(*) as c FROM dict_term').c,
    ui: db.get('SELECT COUNT(*) as c FROM ui_category').c
  };
  if (counts.countries === 0 || counts.terms === 0 || counts.ui === 0) {
    throw new Error('Standardization blocked. Dictionary or UI tables are empty. (Gate B1)');
  }

  const unmapped = [];
  db.transaction(() => {
    const policies = db.all('SELECT id, country FROM policies');
    for (const p of policies) {
      const canon = db.get('SELECT canonical FROM dict_country_alias WHERE alias = ?', [p.country]);
      if (canon) db.run('UPDATE policies SET country = ? WHERE id = ?', [canon.canonical, p.id]);
      else unmapped.push({ domain: 'country', token: p.country, id: p.id });
    }
    const facilities = db.all('SELECT id, country FROM facilities');
    for (const f of facilities) {
      const canon = db.get('SELECT canonical FROM dict_country_alias WHERE alias = ?', [f.country]);
      if (canon) db.run('UPDATE facilities SET country = ? WHERE id = ?', [canon.canonical, f.id]);
      else unmapped.push({ domain: 'country', token: f.country, id: f.id });
    }
    const terms = db.all('SELECT facility_id, lang, sector, type, fate_of_carbon FROM facility_i18n');
    for (const t of terms) {
      const domains = { sector: t.sector, type: t.type, fate: t.fate_of_carbon };
      for (const [domain, alias] of Object.entries(domains)) {
        if (!alias) continue;
        const canon = db.get('SELECT canonical FROM dict_term_alias WHERE domain = ? AND alias = ?', [domain, alias]);
        if (canon) {
          const zhRow = db.get('SELECT zh FROM dict_term WHERE domain = ? AND canonical = ?', [domain, canon.canonical]);
          if (t.lang === 'zh' && zhRow) {
            const col = domain === 'fate' ? 'fate_of_carbon' : domain;
            db.run(`UPDATE facility_i18n SET ${col} = ? WHERE facility_id = ? AND lang = 'zh'`, [zhRow.zh, t.facility_id]);
          }
        } else unmapped.push({ domain, token: alias, id: t.facility_id });
      }
    }
  });
  if (!fs.existsSync(REPORTS_DIR)) fs.mkdirSync(REPORTS_DIR, { recursive: true });
  fs.writeFileSync(path.join(REPORTS_DIR, 'unmapped_tokens.json'), JSON.stringify(unmapped, null, 2));
  db.save();
  console.log(`DONE. (Unmapped: ${unmapped.length})`);
}

async function dbFixRelationships(SQL) {
  console.log('FIX: Broken Relationships...');
  const db = loadDb(SQL);
  db.transaction(() => {
    const broken = db.all(`SELECT policy_id, facility_id FROM policy_facility_links WHERE policy_id NOT IN (SELECT id FROM policies) OR facility_id NOT IN (SELECT id FROM facilities)`);
    for (const b of broken) {
      db.run('DELETE FROM policy_facility_links WHERE policy_id = ? AND facility_id = ?', [b.policy_id, b.facility_id]);
    }
  });
  db.save();
  console.log('DONE.');
}

async function dbAuditDeep(SQL) {
  console.log('AUDIT: Deep Check...');
  const db = loadDb(SQL);
  const thresholds = JSON.parse(fs.readFileSync(THRESHOLDS_PATH, 'utf8'));
  const polCount = (db.get('SELECT COUNT(*) as c FROM policies')).c;
  const facCount = (db.get('SELECT COUNT(*) as c FROM facilities')).c;
  const unmappedPath = path.join(REPORTS_DIR, 'unmapped_tokens.json');
  const unmappedCount = fs.existsSync(unmappedPath) ? JSON.parse(fs.readFileSync(unmappedPath, 'utf8')).length : 0;

  // --- Link Validation ---
  const invalidLinks = db.all(`
    SELECT facility_id, link 
    FROM facility_links 
    WHERE link NOT LIKE 'http%' OR link LIKE 'link%'
  `);
  if (invalidLinks.length > 0) {
    const linkReport = `# Facility Links Invalid Report
- Generated: ${new Date().toISOString()}
- Count: ${invalidLinks.length}

| Facility ID | Invalid Link |
|-------------|--------------|
${invalidLinks.map(l => `| ${l.facility_id} | ${l.link} |`).join('\n')}
`;
    fs.writeFileSync(path.join(REPORTS_DIR, 'facility_links_invalid.md'), linkReport);
  }

  // --- Geo Validation ---
  const invalidGeo = db.all(`
    SELECT id, country, lat, lng 
    FROM facilities 
    WHERE lat IS NULL OR lng IS NULL OR lat = 0 OR lng = 0
       OR lat < -90 OR lat > 90 OR lng < -180 OR lng > 180
  `);
  if (invalidGeo.length > 0) {
    const geoReport = `# Facility Geo Invalid Report
- Generated: ${new Date().toISOString()}
- Count: ${invalidGeo.length}

| ID | Country | Lat | Lng |
|----|---------|-----|-----|
${invalidGeo.map(g => `| ${g.id} | ${g.country} | ${g.lat} | ${g.lng} |`).join('\n')}
`;
    fs.writeFileSync(path.join(REPORTS_DIR, 'facility_geo_invalid.md'), geoReport);
  }

  const gates = {
    policies_ok: polCount >= thresholds.min_policy_count,
    facilities_ok: facCount >= thresholds.min_facility_count,
    unmapped_ok: unmappedCount <= thresholds.unmapped_token_count_max,
    links_ok: invalidLinks.length === 0,
    geo_ok: invalidGeo.length === 0,
    pass: false
  };
  gates.pass = gates.policies_ok && gates.facilities_ok && gates.unmapped_ok && gates.links_ok && gates.geo_ok;

  const heartbeat = { ts: new Date().toISOString(), counts: { policies: polCount, facilities: facCount }, metrics: { unmapped_tokens: unmappedCount, invalid_links: invalidLinks.length, invalid_geo: invalidGeo.length }, gates };
  if (!fs.existsSync(REPORTS_DIR)) fs.mkdirSync(REPORTS_DIR, { recursive: true });
  fs.writeFileSync(path.join(REPORTS_DIR, 'governance_heartbeat.json'), JSON.stringify(heartbeat, null, 2));

  // --- I1: Data Integrity Summary ---
  const summary = `# Data Integrity Summary (${heartbeat.ts})

## Counts
- Policies: ${polCount}
- Facilities: ${facCount}
- Unmapped Tokens: ${unmappedCount}
- Invalid Links: ${invalidLinks.length}
- Invalid Geo: ${invalidGeo.length}

## Quality Gates
- Policies Min Check: ${gates.policies_ok ? 'PASS' : 'FAIL'}
- Facilities Min Check: ${gates.facilities_ok ? 'PASS' : 'FAIL'}
- Token Mapping Check: ${gates.unmapped_ok ? 'PASS' : 'FAIL'}
- Link Quality Check: ${gates.links_ok ? 'PASS' : 'FAIL'}
- Geo Quality Check: ${gates.geo_ok ? 'PASS' : 'FAIL'}

## Status
**OVERALL: ${gates.pass ? 'PASS' : 'FAIL'}**
`;
  fs.writeFileSync(path.join(REPORTS_DIR, 'data_integrity_summary.md'), summary);

  db.transaction(() => {
    db.run('INSERT OR REPLACE INTO db_meta (key, value) VALUES (?, ?)', ['last_audit_pass', gates.pass ? 'true' : 'false']);     
    db.run('INSERT OR REPLACE INTO db_meta (key, value) VALUES (?, ?)', ['last_audit_ts', heartbeat.ts]);
  });
  db.save();

  if (!gates.pass) {
    console.error('Audit FAILED.');
    console.error(JSON.stringify(gates, null, 2));
    throw new Error('Audit FAILED');
  }
  console.log('Audit PASSED.');
}
function sortObject(obj) {
  return Object.keys(obj).sort().reduce((acc, key) => {
    acc[key] = obj[key];
    return acc;
  }, {});
}

async function dbDictLint(SQL) {
  console.log('DICT: Linting...');
  const db = loadDb(SQL);
  const errors = [];

  // Check aliases point to existing canonicals
  const orphans = db.all('SELECT * FROM dict_term_alias WHERE (domain, canonical) NOT IN (SELECT domain, canonical FROM dict_term)');
  orphans.forEach(o => errors.push(`Alias orphan: ${o.domain}/${o.alias} -> ${o.canonical} (canonical missing)`));

  // Check domain values
  const badDomains = db.all("SELECT DISTINCT domain FROM dict_term WHERE domain NOT IN ('sector','type','fate')");
  badDomains.forEach(d => errors.push(`Invalid domain: ${d.domain}`));

  if (errors.length > 0) {
    console.error('Lint FAILED:');
    errors.forEach(e => console.error(`- ${e}`));
    process.exit(EXIT_CODES.INPUT_ERROR);
  }
  console.log('Lint PASSED.');
}

async function dbExportI18n(SQL) {
  console.log('EXPORT: i18n Dictionary...');
  const db = loadDb(SQL);
  const auditPass = db.get("SELECT value FROM db_meta WHERE key = 'last_audit_pass'");
  if (!auditPass || auditPass.value !== 'true') throw new Error('Export blocked. Last audit failed. (Gate B2)');

  const out = { countries: {}, sectors: {}, types: {}, fates: {}, ui: { categories: {}, status: {}, dimensions: {} } };
  db.all('SELECT alias, canonical FROM dict_country_alias ORDER BY alias').forEach(c => out.countries[c.alias] = c.canonical);
  const termDomains = { sector: 'sectors', type: 'types', fate: 'fates' };
  for (const [domain, plural] of Object.entries(termDomains)) {
    out[plural] = {};
    db.all('SELECT canonical, zh FROM dict_term WHERE domain = ? ORDER BY canonical', [domain]).forEach(t => out[plural][t.canonical] = t.zh);
    db.all('SELECT alias, canonical FROM dict_term_alias WHERE domain = ? AND alias != canonical ORDER BY alias', [domain]).forEach(a => {
      const canonZh = db.get('SELECT zh FROM dict_term WHERE domain = ? AND canonical = ?', [domain, a.canonical]);
      if (canonZh) out[plural][a.alias] = canonZh.zh;
    });
    out[plural] = sortObject(out[plural]);
  }
  db.all('SELECT key, zh, en FROM ui_category ORDER BY key').forEach(c => out.ui.categories[c.key] = { zh: c.zh, en: c.en });
  db.all('SELECT key, zh, en FROM ui_status ORDER BY key').forEach(s => out.ui.status[s.key] = { zh: s.zh, en: s.en });
  db.all('SELECT * FROM ui_dimension ORDER BY key').forEach(d => {
    out.ui.dimensions[d.key] = { label: { zh: d.label_zh, en: d.label_en }, desc: { zh: d.desc_zh, en: d.desc_en } };
  });
  out.countries = sortObject(out.countries);
  out.ui.categories = sortObject(out.ui.categories);
  out.ui.status = sortObject(out.ui.status);
  out.ui.dimensions = sortObject(out.ui.dimensions);
  fs.writeFileSync(LEGACY_I18N_PATH, JSON.stringify(out, null, 2) + '\n');
  console.log('DONE.');
}

async function dbExportMd(SQL) {
  console.log('EXPORT: Markdown Content...');
  const db = loadDb(SQL);
  const auditPass = db.get("SELECT value FROM db_meta WHERE key = 'last_audit_pass'");
  if (!auditPass || auditPass.value !== 'true') throw new Error('Export blocked. Last audit failed. (Gate B2)');

  const deepClean = (obj) => {
    if (Array.isArray(obj)) return obj.map(deepClean);
    if (obj !== null && typeof obj === 'object') {
      const newObj = {};
      Object.keys(obj).sort().forEach(k => newObj[k] = deepClean(obj[k]));
      return newObj;
    }
    return obj === null ? "" : obj;
  };
  const cleanStr = (s) => (s || "").replace(/\r\n/g, '\n').trim();

  // Policies
  db.all('SELECT * FROM policies ORDER BY id').forEach(p => {
    const analysis = {};
    db.all('SELECT * FROM policy_analysis WHERE policy_id = ? ORDER BY dimension', [p.id]).forEach(r => {
      analysis[r.dimension] = { score: r.score || 0, label: r.label || "Pending", evidence: r.evidence || "No evidence provided yet.", citation: r.citation || "", auditNote: r.audit_note || "" };
    });
    const relatedFacs = db.all('SELECT facility_id FROM policy_facility_links WHERE policy_id = ? ORDER BY facility_id', [p.id]).map(r => r.facility_id);
        ['en', 'zh'].forEach(lang => {
          const i18n = db.get('SELECT * FROM policy_i18n WHERE policy_id = ? AND lang = ?', [p.id, lang]);
          if (!i18n) return;
          
                const safeParse = (str) => {
                  if (!str) return null;
                  try {
                    return JSON.parse(str);
                  } catch (e) {
                    // Attempt to clean control characters if parse fails
                    const cleaned = str.replace(/[\x00-\x1F\x7F-\x9F]/g, "");
                    try {
                      return JSON.parse(cleaned);
                    } catch (e2) {
                      console.error(`Failed to parse JSON: ${str.substring(0, 100)}...`);
                      return null;
                    }
                  }
                };
          
                      const impactAnalysis = safeParse(i18n.impact_analysis_json);
          
                      const evolution = safeParse(i18n.evolution_json);
          
                      const regulatory = safeParse(i18n.regulatory_json);
          
                
          
                      const frontmatter = deepClean({
          
                        id: p.id, title: i18n.title, country: p.country, year: p.year, status: p.status, category: p.category,
          
                        pubDate: p.pub_date || "2026-01-01", reviewStatus: p.review_status, legalWeight: p.legal_weight || "Guideline/Policy",        
          
                        source: p.source || "", sectors: [], description: (i18n.description || "").substring(0, 500).replace(/\n/g, ' '),
          
                        analysis, 
          
                        impactAnalysis,
          
                        interpretation: i18n.interpretation,
          
                        evolution,
          
                        regulatory,
          
                        relatedFacilities: relatedFacs, provenance: { author: p.provenance_author || "System", reviewer: p.provenance_reviewer || "", lastAuditDate: p.provenance_last_audit_date || "" }
          
                      });
          if (p.url && p.url.startsWith('http')) frontmatter.url = p.url;
          const contentDir = path.join(__dirname, '../src/content/policies', lang);
          if (!fs.existsSync(contentDir)) fs.mkdirSync(contentDir, { recursive: true });
          fs.writeFileSync(path.join(contentDir, `${p.id}.md`), `---\n${JSON.stringify(frontmatter, null, 2)}\n---\n\n${cleanStr(i18n.description)}\n`);
        });
  });

  // Facilities
  db.all('SELECT * FROM facilities ORDER BY id').forEach(f => {
    const relatedPols = db.all('SELECT policy_id FROM policy_facility_links WHERE facility_id = ? ORDER BY policy_id', [f.id]).map(r => r.policy_id);
    ['en', 'zh'].forEach(lang => {
      const i18n = db.get('SELECT * FROM facility_i18n WHERE facility_id = ? AND lang = ?', [f.id, lang]);
      if (!i18n) return;
            const partners = db.all('SELECT partner FROM facility_partners WHERE facility_id = ? AND lang = ? ORDER BY order_index', [f.id, lang]).map(r => r.partner);
            const links = db.all('SELECT link FROM facility_links WHERE facility_id = ? AND lang = ? ORDER BY order_index', [f.id, lang]).map(r => r.link);
            
            let description = i18n.description;
            if (!description || description.trim() === i18n.name) {
              if (lang === 'zh') {
                description = `### 项目概览\n\n该项目位于 ${f.country}${i18n.region ? ` (${i18n.region})` : ''}，属于 ${i18n.sector || 'CCUS'} 领域。设施类型为 ${i18n.type || '捕集设施'}，当前状态为 ${f.status}。${i18n.hub ? `作为 ${i18n.hub} 枢纽的一部分，` : ''}${i18n.operator ? `由 ${i18n.operator} 负责运营。` : ''}`;
              } else {
                description = `### Project Overview\n\nThis project is located in ${f.country}${i18n.region ? ` (${i18n.region})` : ''}, within the ${i18n.sector || 'CCUS'} sector. The facility is classified as ${i18n.type || 'Capture'} and is currently ${f.status}. ${i18n.hub ? `As part of the ${i18n.hub} hub, ` : ''}${i18n.operator ? `it is operated by ${i18n.operator}.` : ''}`;
              }
            }

            const frontmatter = deepClean({
                                      id: f.id, name: i18n.name, lang, country: f.country, region: i18n.region || "", type: i18n.type || "", status: f.status,
                                      announcedCapacityMin: f.announced_capacity_min || 0,
                                      announcedCapacityMax: f.announced_capacity_max || 0,
                                      announcedCapacityRaw: f.announced_capacity_raw || "",
                                      estimatedCapacity: f.estimated_capacity || 0,
                                      coordinates: [f.lat || 0, f.lng || 0], precision: f.precision || "approximate", sector: i18n.sector || "",
                                      fateOfCarbon: i18n.fate_of_carbon || "", hub: i18n.hub || "", phase: i18n.phase || "", 
                                      announcement: i18n.announcement || "",
                                      operator: i18n.operator,
                                      captureTechnology: i18n.capture_technology,
                                      storageType: i18n.storage_type,
                                      investmentScale: f.investment_scale,
                                      fid: i18n.fid || "", operation: i18n.operation || "", suspensionDate: i18n.suspension_date || "",
                                      partners: partners.sort(), links: links.filter(l => l.startsWith('http')).sort(), relatedPolicies: relatedPols.sort(),
                                      provenance: { author: f.provenance_author || "IEA Ingestion", reviewer: f.provenance_reviewer || "", lastAuditDate: f.provenance_last_audit_date || "" }
                                    });
      if (f.url && f.url.startsWith('http')) frontmatter.url = f.url;
            const contentDir = path.join(__dirname, '../src/content/facilities', lang);
            if (!fs.existsSync(contentDir)) fs.mkdirSync(contentDir, { recursive: true });
            fs.writeFileSync(path.join(contentDir, `${f.id}.md`), `---\n${JSON.stringify(frontmatter, null, 2)}\n---\n\n${cleanStr(description)}\n`);
          });
  });
  console.log('DONE.');
}

async function dbExportGolden(SQL) {
  console.log('GOLDEN: Exporting snapshots...');
  const db = loadDb(SQL);
  const policies = db.all('SELECT id FROM policies ORDER BY id LIMIT 10');
  const facilities = db.all('SELECT id FROM facilities ORDER BY id LIMIT 10');
  const snapshots = { policies: {}, facilities: {} };

  policies.forEach(p => {
    const i18n = db.get('SELECT * FROM policy_i18n WHERE policy_id = ? AND lang = "en"', [p.id]);
    snapshots.policies[p.id] = i18n;
  });
  facilities.forEach(f => {
    const i18n = db.get('SELECT * FROM facility_i18n WHERE facility_id = ? AND lang = "en"', [f.id]);
    snapshots.facilities[f.id] = i18n;
  });

  fs.writeFileSync(path.join(__dirname, '../tests/golden/snapshots.json'), JSON.stringify(snapshots, null, 2));
  console.log('DONE.');
}

async function dbTestGolden(SQL) {
  console.log('GOLDEN: Testing snapshots...');
  const db = loadDb(SQL);
  const goldenPath = path.join(__dirname, '../tests/golden/snapshots.json');
  if (!fs.existsSync(goldenPath)) throw new Error('Golden snapshots missing. Run db:export:golden first.');
  
  const golden = JSON.parse(fs.readFileSync(goldenPath, 'utf8'));
  let fails = 0;

  for (const [id, expected] of Object.entries(golden.policies)) {
    const actual = db.get('SELECT * FROM policy_i18n WHERE policy_id = ? AND lang = "en"', [id]);
    if (JSON.stringify(actual) !== JSON.stringify(expected)) {
      console.error(`Mismatch in policy: ${id}`);
      fails++;
    }
  }
  for (const [id, expected] of Object.entries(golden.facilities)) {
    const actual = db.get('SELECT * FROM facility_i18n WHERE facility_id = ? AND lang = "en"', [id]);
    if (JSON.stringify(actual) !== JSON.stringify(expected)) {
      console.error(`Mismatch in facility: ${id}`);
      fails++;
    }
  }

  if (fails > 0) throw new Error(`Golden test FAILED with ${fails} mismatches.`);
  console.log('Golden test PASSED.');
}

async function dbExportSchemaEnums(SQL) {
  console.log('ENUMS: Generating schema enums...');
  const db = loadDb(SQL);
  
  const categories = db.all('SELECT key FROM ui_category ORDER BY key').map(r => r.key);
  const policyStatuses = db.all('SELECT key FROM ui_status ORDER BY key').map(r => r.key);
  const facilityStatuses = ["Planned", "Under development", "Upcoming", "Active", "Inactive", "Superseded", "Cancelled", "Operational", "Under construction", "Decommissioned", "Suspended"];
  const dimensions = ['incentive', 'statutory', 'market', 'strategic', 'mrv'];
  
  const content = `// GENERATED FILE - DO NOT EDIT
export const POLICY_CATEGORIES = ${JSON.stringify(categories)} as const;
export const POLICY_STATUSES = ${JSON.stringify(policyStatuses)} as const;
export const ANALYSIS_DIMENSIONS = ${JSON.stringify(dimensions)} as const;
export const FACILITY_STATUSES = ${JSON.stringify(facilityStatuses)} as const;
`;

  fs.writeFileSync(path.join(__dirname, '../src/content/enums.generated.ts'), content);
  console.log('DONE.');
}

async function dbBackup(args = []) {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  let tag = '';
  const tagIdx = args.indexOf('--tag');
  if (tagIdx !== -1 && args[tagIdx + 1]) {
    tag = `_${args[tagIdx + 1]}`;
  }
  const backupPath = path.join(__dirname, `../governance/db/ccus_master${tag}_${timestamp}.sqlite`);
  fs.copyFileSync(DB_PATH, backupPath);
  console.log(`BACKUP: Created at ${backupPath}`);
}

async function dbStats(SQL, args = []) {
  console.log('STATS: Generating data overview...');
  const db = loadDb(SQL);
  const getRate = (count, total) => total === 0 ? 0 : (count / total);

  const stats = {
    timestamp: new Date().toISOString(),
    facilities: {},
    policies: {}
  };

  // Facilities Stats
  const fTotal = db.get('SELECT COUNT(*) as c FROM facilities').c;
  const fWithLinks = db.get('SELECT COUNT(DISTINCT facility_id) as c FROM facility_links WHERE link IS NOT NULL AND link != ""').c;
  const fWithLat = db.get('SELECT COUNT(*) as c FROM facilities WHERE lat IS NOT NULL AND lat != 0').c;
  const fWithLng = db.get('SELECT COUNT(*) as c FROM facilities WHERE lng IS NOT NULL AND lng != 0').c;
  const fWithCap = db.get('SELECT COUNT(*) as c FROM facilities WHERE announced_capacity_min IS NOT NULL AND announced_capacity_min != 0').c;
  
  const regionsZh = db.all('SELECT region FROM facility_i18n WHERE lang = "zh"');
  const nonZhRegions = regionsZh.filter(r => r.region && /[a-zA-Z]/.test(r.region)).length;

  stats.facilities = {
    total: fTotal,
    with_links_count: fWithLinks,
    facility_links_non_empty_rate: getRate(fWithLinks, fTotal),
    with_lat_lng_count: fWithLat, 
    lat_lng_non_empty_rate: getRate(fWithLat, fTotal),
    with_capacity_count: fWithCap,
    facility_capacity_non_empty_rate: getRate(fWithCap, fTotal),
    non_zh_region_count: nonZhRegions,
    region_zh_non_chinese_rate: getRate(nonZhRegions, regionsZh.length)
  };

  // Policies Stats
  const pTotal = db.get('SELECT COUNT(*) as c FROM policies').c;
  const pWithUrl = db.get('SELECT COUNT(*) as c FROM policies WHERE url IS NOT NULL AND url != ""').c;
  
  stats.policies = {
    total: pTotal,
    with_url_count: pWithUrl,
    policy_url_non_empty_rate: getRate(pWithUrl, pTotal)
  };

  let outputPath = path.join(REPORTS_DIR, 'stats.json');
  const outIdx = args.indexOf('--output');
  if (outIdx !== -1 && args[outIdx + 1]) outputPath = path.resolve(args[outIdx + 1]);

  if (!fs.existsSync(path.dirname(outputPath))) fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  fs.writeFileSync(outputPath, JSON.stringify(stats, null, 2));
  console.log(`DONE. Stats written to ${outputPath}`);
}

async function dbStandardizeRegionZh(SQL) {
  console.log('STANDARDIZE: region.zh...');
  const db = loadDb(SQL);
  const regions = db.all("SELECT facility_id, region FROM facility_i18n WHERE lang = 'en'");
  const dict = {};
  db.all("SELECT en, zh FROM dict_region_alias").forEach(r => dict[r.en] = r.zh);

  const fallbackList = [];
  let matched = 0;

  db.transaction(() => {
    for (const r of regions) {
      if (!r.region) continue;
      const zh = dict[r.region];
      if (zh) {
        db.run("UPDATE facility_i18n SET region = ? WHERE facility_id = ? AND lang = 'zh'", [zh, r.facility_id]);
        matched++;
      } else {
        // Fallback: keep en region but log it
        db.run("UPDATE facility_i18n SET region = ? WHERE facility_id = ? AND lang = 'zh'", [r.region, r.facility_id]);
        fallbackList.push({ id: r.facility_id, en: r.region });
      }
    }
  });

  db.save();

  const fillRate = matched / regions.filter(r => r.region).length;
  const reportPath = path.join(REPORTS_DIR, 'region_zh_fill_rate.md');
  const reportContent = `# Region ZH Fill Rate Report
- Generated: ${new Date().toISOString()}
- Total with Region (EN): ${regions.filter(r => r.region).length}
- Translated to ZH: ${matched}
- Fill Rate: ${(fillRate * 100).toFixed(2)}%

## Fallback List (Kept as English)
${fallbackList.map(f => `- ${f.id}: ${f.en}`).join('\n')}
`;
  fs.writeFileSync(reportPath, reportContent);
  
  if (fallbackList.length > 0) {
    const csvPath = path.join(REPORTS_DIR, 'region_zh_fallback_list.csv');
    const csvContent = "facility_id,region_en\n" + fallbackList.map(f => `${f.id},"${f.en}"`).join('\n');
    fs.writeFileSync(csvPath, csvContent);
  }

  console.log(`DONE. Fill Rate: ${(fillRate * 100).toFixed(2)}%. Report: ${reportPath}`);
}

async function dbStandardizePolicySource(SQL) {
  console.log('STANDARDIZE: policy.source...');
  const db = loadDb(SQL);
  const policies = db.all("SELECT id, source FROM policies");
  const dict = {};
  db.all("SELECT alias, canonical FROM dict_source_alias").forEach(r => dict[r.alias] = r.canonical);

  const unmapped = new Set();
  let matched = 0;

  db.transaction(() => {
    for (const p of policies) {
      if (!p.source) continue;
      const canon = dict[p.source];
      if (canon) {
        db.run("UPDATE policies SET source = ? WHERE id = ?", [canon, p.id]);
        matched++;
      } else {
        unmapped.add(p.source);
      }
    }
  });

  db.save();

  const reportPath = path.join(REPORTS_DIR, 'policy_source_unmapped.md');
  const reportContent = `# Policy Source Unmapped Report
- Generated: ${new Date().toISOString()}
- Matched: ${matched}
- Unmapped Unique Sources: ${unmapped.size}

## Unmapped List
${Array.from(unmapped).map(s => `- ${s}`).join('\n')}
`;
  fs.writeFileSync(reportPath, reportContent);
  console.log(`DONE. Matched: ${matched}. Report: ${reportPath}`);
}

async function dbEnrichPolicyUrl(SQL, args = []) {
  console.log('ENRICH: policy.url...');
  const db = loadDb(SQL);
  const policies = db.all("SELECT id, url FROM policies");
  const analysis = db.all("SELECT policy_id, evidence, citation FROM policy_analysis");

  const urlRegex = /(https?:\/\/[^\s\)]+)/g;
  let filled = 0;
  const fillDetails = [];

  db.transaction(() => {
    for (const p of policies) {
      if (p.url && p.url.startsWith('http')) continue;

      // Try extract from analysis
      const pAnalysis = analysis.filter(a => a.policy_id === p.id);
      let foundUrl = null;

      for (const a of pAnalysis) {
        const text = `${a.evidence || ""} ${a.citation || ""}`;
        const matches = text.match(urlRegex);
        if (matches && matches.length > 0) {
          foundUrl = matches[0].replace(/[.,;]$/, ''); // Basic cleanup
          break;
        }
      }

      if (foundUrl) {
        db.run("UPDATE policies SET url = ? WHERE id = ?", [foundUrl, p.id]);
        filled++;
        fillDetails.push({ id: p.id, url: foundUrl });
      }
    }
  });

  db.save();

  const reportPath = path.join(REPORTS_DIR, 'policy_url_fill_report.md');
  const reportContent = `# Policy URL Fill Report
- Generated: ${new Date().toISOString()}
- Newly Filled: ${filled}

## Filled Details
${fillDetails.map(f => `- ${f.id}: ${f.url}`).join('\n')}
`;
  fs.writeFileSync(reportPath, reportContent);
  console.log(`DONE. Filled: ${filled}. Report: ${reportPath}`);
}

async function dbMigrateCapacityV2(SQL) {
  console.log('MIGRATE: capacity v2...');
  const db = loadDb(SQL);
  const oldData = db.all("SELECT * FROM facilities");

  db.transaction(() => {
    // 1. Recreate table
    db.run("DROP TABLE facilities");
    db.run(`
      CREATE TABLE facilities (
        id TEXT PRIMARY KEY,
        country TEXT NOT NULL,
        status TEXT,
        review_status TEXT,
        announced_capacity_min REAL,
        announced_capacity_max REAL,
        announced_capacity_raw TEXT,
        estimated_capacity REAL,
        lat REAL,
        lng REAL,
        precision TEXT,
        provenance_author TEXT,
        provenance_reviewer TEXT,
        provenance_last_audit_date TEXT
      )
    `);

    // 2. Migrate data
    for (const f of oldData) {
      let min = null, max = null, raw = null;
      // In old schema, announced_capacity was a REAL. 
      // If it was already a number, min=max=val
      if (f.announced_capacity !== null) {
        min = max = f.announced_capacity;
        raw = f.announced_capacity.toString();
      }
      
      db.run(`
        INSERT INTO facilities (
          id, country, status, review_status, 
          announced_capacity_min, announced_capacity_max, announced_capacity_raw, 
          estimated_capacity, lat, lng, precision, 
          provenance_author, provenance_reviewer, provenance_last_audit_date
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          f.id, f.country, f.status, f.review_status,
          min, max, raw,
          f.estimated_capacity, f.lat, f.lng, f.precision,
          f.provenance_author, f.provenance_reviewer, f.provenance_last_audit_date
        ]
      );
    }
  });

  db.save();
  console.log(`DONE. Migrated ${oldData.length} facilities.`);
}

async function dbGeocodeFacilities(SQL, args = []) {
  console.log('GEOCODE: facilities (offline centroids)...');
  const db = loadDb(SQL);
  const facilities = db.all("SELECT id, country, lat, lng FROM facilities");
  
  // Minimal Country Centroids for major CCUS countries
  const countryCentroids = {
    'United States': [37.0902, -95.7129],
    'China': [35.8617, 104.1954],
    'Canada': [56.1304, -106.3468],
    'United Kingdom': [55.3781, -3.436],
    'Norway': [60.472, 8.4689],
    'Australia': [-25.2744, 133.7751],
    'Netherlands': [52.1326, 5.2913],
    'Japan': [36.2048, 138.2529],
    'Germany': [51.1657, 10.4515],
    'France': [46.2276, 2.2137],
    'Brazil': [-14.235, -51.9253],
    'United Arab Emirates': [23.4241, 53.8478],
    'Saudi Arabia': [23.8859, 45.0792],
    'Indonesia': [-0.7893, 113.9213],
    'Malaysia': [4.2105, 101.9758],
    'Belgium': [50.5039, 4.4699],
    'Denmark': [56.2639, 9.5018],
    'Sweden': [60.1282, 18.6435],
    'Iceland': [64.9631, -19.0208],
    'Italy': [41.8719, 12.5674],
    'India': [20.5937, 78.9629],
    'South Korea': [35.9078, 127.7669],
    'Greece': [39.0742, 21.8243],
    'Ireland': [53.4129, -8.2439],
    'Poland': [51.9194, 19.1451],
    'Finland': [61.9241, 25.7482],
    'Croatia': [45.1, 15.2],
    'Spain': [40.4637, -3.7492],
    'Hungary': [47.1625, 19.5033],
    'Kenya': [-1.286389, 36.817223],
    'Oman': [21.5126, 55.9233],
    'Qatar': [25.3548, 51.1839],
    'Thailand': [15.87, 100.9925],
    'Switzerland': [46.8182, 8.2275],
    'Singapore': [1.3521, 103.8198],
    'Portugal': [39.3999, -8.2245],
    'Bahrain': [26.0667, 50.55],
    'Austria': [47.5162, 14.5501],
    'New Zealand': [-40.9006, 174.886],
    'Russia': [61.524, 105.3188],
    'Algeria': [28.0339, 1.6596],
    'Mexico': [23.6345, -102.5528],
    'Papua New Guinea': [-6.315, 143.9555],
    'Bulgaria': [42.7339, 25.4858],
    'Libya': [26.3351, 17.2283],
    'Lithuania': [55.1694, 23.8813],
    'Romania': [45.9432, 24.9668],
    'Chile': [-35.6751, -71.543],
    'Uruguay': [-32.5228, -55.7658],
    'Latvia': [56.8796, 24.6032],
    'Georgia': [42.3154, 43.3569],
    'Luxembourg': [49.8153, 6.1296],
    'European Union': [50.0, 10.0],
    'Other': [0.001, 0.001]
  };

  let filled = 0;
  const reports = { filled: [], skipped: [] };

  db.transaction(() => {
    for (const f of facilities) {
      if (f.lat !== null && f.lat !== 0 && f.lng !== null && f.lng !== 0) continue;

      const centroid = countryCentroids[f.country];
      if (centroid) {
        db.run("UPDATE facilities SET lat = ?, lng = ?, precision = 'country' WHERE id = ?", [centroid[0], centroid[1], f.id]);
        filled++;
        reports.filled.push({ id: f.id, country: f.country });
      } else {
        reports.skipped.push({ id: f.id, country: f.country });
      }
    }
  });

  db.save();

  const reportPath = path.join(REPORTS_DIR, 'geocode_fill_report.md');
  const reportContent = `# Geocode Fill Report (Offline)
- Generated: ${new Date().toISOString()}
- Total Facilities: ${facilities.length}
- Newly Filled (Country Level): ${filled}
- Skipped (No Centroid): ${reports.skipped.length}

## Skipped Countries (Unique)
${Array.from(new Set(reports.skipped.map(s => s.country))).map(c => `- ${c}`).join('\n')}
`;
  fs.writeFileSync(reportPath, reportContent);
  console.log(`DONE. Filled: ${filled}. Report: ${reportPath}`);
}

async function dbRestore(file) {
  if (!file) throw new Error('Specify backup file to restore: pnpm manage db:restore <filename>');
  const backupPath = path.join(__dirname, `../governance/db/${file}`);
  if (!fs.existsSync(backupPath)) throw new Error(`Backup file not found: ${backupPath}`);
  fs.copyFileSync(backupPath, DB_PATH);
  console.log(`RESTORE: Restored from ${file}`);
}

async function dbOptimize(SQL) {
  console.log('OPTIMIZE: Vacuuming and Analyzing Database...');
  const db = loadDb(SQL);
  db.exec('VACUUM;');
  db.exec('ANALYZE;');
  db.save();
  console.log('DONE.');
}

async function dbClean() {
  console.log('CLEAN: Removing temporary files and reports...');
  
  // 1. Clean governance/reports
  if (fs.existsSync(REPORTS_DIR)) {
    const files = fs.readdirSync(REPORTS_DIR);
    files.forEach(f => {
      // Keep governance_heartbeat.json as it's useful for the dashboard
      if (f !== 'governance_heartbeat.json') {
        fs.unlinkSync(path.join(REPORTS_DIR, f));
      }
    });
  }

  // 2. Clean scripts/_tmp
  const tmpDir = path.join(__dirname, '_tmp');
  if (fs.existsSync(tmpDir)) {
    const files = fs.readdirSync(tmpDir);
    files.forEach(f => fs.unlinkSync(path.join(tmpDir, f)));
  }

  console.log('DONE.');
}

main();