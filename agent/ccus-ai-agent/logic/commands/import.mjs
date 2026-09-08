/**
 * Import commands: seed the database from governed sources.
 *
 * Moved verbatim from `logic/manage.mjs` (behavior-preserving split).
 * Each command receives the initialized sql.js module and opens the master
 * database through `loadDb` (see `logic/db.mjs` for the write contract).
 */

import fs from 'fs';
import path from 'path';
import matter from 'gray-matter';
import XLSX from 'xlsx';
import {
  LEGACY_I18N_PATH,
  LOGIC_DIR,
  SCHEMA_PATH,
  SqlJsDatabase,
  loadDb,
} from '../db.mjs';

/** Acknowledgement flag for the destructive Markdown -> DB reverse sync. */
export const REVERSE_SYNC_MIGRATION_FLAG = '--allow-reverse-sync-migration';

export async function dbInit(SQL) {
  const db = new SqlJsDatabase(SQL);
  db.exec(fs.readFileSync(SCHEMA_PATH, 'utf8'));
  db.save();
  console.log('INIT DONE.');
}

export async function dbImportI18n(SQL) {
  const db = loadDb(SQL);
  const dict = JSON.parse(fs.readFileSync(LEGACY_I18N_PATH, 'utf8'));
  db.transaction(() => {
    for (const [alias, canon] of Object.entries(dict.countries))
      db.run(
        'INSERT OR REPLACE INTO dict_country_alias (alias, canonical) VALUES (?, ?)',
        [alias, canon]
      );
    const domains = { sectors: 'sector', types: 'type', fates: 'fate' };
    for (const [plural, domain] of Object.entries(domains)) {
      for (const [key, zh] of Object.entries(dict[plural])) {
        db.run(
          'INSERT OR REPLACE INTO dict_term (domain, canonical, zh) VALUES (?, ?, ?)',
          [domain, key, zh]
        );
        db.run(
          'INSERT OR REPLACE INTO dict_term_alias (domain, alias, canonical) VALUES (?, ?, ?)',
          [domain, key, key]
        );
      }
    }
    for (const [k, v] of Object.entries(dict.ui.categories))
      db.run(
        'INSERT OR REPLACE INTO ui_category (key, zh, en) VALUES (?, ?, ?)',
        [k, v.zh, v.en]
      );
    for (const [k, v] of Object.entries(dict.ui.status))
      db.run(
        'INSERT OR REPLACE INTO ui_status (key, zh, en) VALUES (?, ?, ?)',
        [k, v.zh, v.en]
      );
    if (dict.ui.dimensions) {
      for (const [k, v] of Object.entries(dict.ui.dimensions)) {
        db.run(
          'INSERT OR REPLACE INTO ui_dimension (key, label_zh, label_en, desc_zh, desc_en) VALUES (?, ?, ?, ?, ?)',
          [k, v.label.zh, v.label.en, v.desc.zh, v.desc.en]
        );
      }
    }
    for (const [alias, canon] of Object.entries(dict.sourceAliases || {}))
      db.run(
        'INSERT OR REPLACE INTO dict_source_alias (alias, canonical) VALUES (?, ?)',
        [alias, canon]
      );
  });
  db.save();
  console.log('IMPORT I18N DONE.');
}

export async function dbImportIeaLinks(SQL, args = []) {
  const excelPath = args.includes('--excel')
    ? args[args.indexOf('--excel') + 1]
    : path.join(LOGIC_DIR, '../assets/IEA CCUS Projects Database 2025.xlsx');
  if (!fs.existsSync(excelPath)) return;
  const workbook = XLSX.readFile(excelPath);
  const data = XLSX.utils.sheet_to_json(
    workbook.Sheets['CCUS Projects Database']
  );
  const db = loadDb(SQL);
  db.transaction(() => {
    for (const row of data) {
      const id = row['ID']?.toString();
      if (!id) continue;
      db.run(
        `UPDATE facilities SET announced_capacity_max = ?, estimated_capacity = ? WHERE id = ?`,
        [
          row['Announced capacity (Mt CO2/yr)'],
          row['Estimated capacity by IEA (Mt CO2/yr)'],
          id,
        ]
      );
      db.run(
        `UPDATE facility_i18n SET type = ?, sector = ?, fate_of_carbon = ?, hub = ?, region = ?, operator = ?, capture_technology = ?, storage_type = ? WHERE facility_id = ?`,
        [
          row['Project type'],
          row['Sector'],
          row['Fate of carbon'],
          row['Part of CCUS hub'],
          row['Region'],
          row['Operator'],
          row['Capture technology'],
          row['Storage type'],
          id,
        ]
      );
    }
  });
  db.save();
  console.log('IMPORT IEA DONE.');
}

export async function dbImportMdReverse(
  SQL,
  argv = [],
  { db: injectedDb = null, contentRoot = null } = {}
) {
  if (!argv.includes(REVERSE_SYNC_MIGRATION_FLAG)) {
    throw new Error(
      `Reverse sync is migration-only. Re-run with ${REVERSE_SYNC_MIGRATION_FLAG} to acknowledge DB overwrite risk.`
    );
  }
  // Test seam: pass { db, contentRoot } to run against an in-memory database
  // and fixture markdown without touching real artifacts.
  const db = injectedDb ?? loadDb(SQL);
  const CONTENT_ROOT =
    contentRoot ?? path.join(LOGIC_DIR, '../../../src/content');
  console.log('REVERSE IMPORT: Markdown -> DB...');

  const processDir = (dir, type) => {
    if (!fs.existsSync(dir)) return;
    fs.readdirSync(dir).forEach((file) => {
      if (!file.endsWith('.md')) return;
      const filePath = path.join(dir, file);
      const { data, content } = matter(fs.readFileSync(filePath, 'utf8'));
      const lang = dir.endsWith('zh') ? 'zh' : 'en';

      const fileId = String(data.id);
      if (type === 'policy') {
        // UPSERT, not REPLACE: REPLACE is DELETE + INSERT and would cascade
        // into the other language's policy_i18n / policy_analysis rows.
        db.run(
          `INSERT INTO policies (id, country, year, status, category, review_status, legal_weight, source, url, pub_date, provenance_author, provenance_reviewer, provenance_last_audit_date) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?) ON CONFLICT(id) DO UPDATE SET country=excluded.country, year=excluded.year, status=excluded.status, category=excluded.category, review_status=excluded.review_status, legal_weight=excluded.legal_weight, source=excluded.source, url=excluded.url, pub_date=excluded.pub_date, provenance_author=excluded.provenance_author, provenance_reviewer=excluded.provenance_reviewer, provenance_last_audit_date=excluded.provenance_last_audit_date`,
          [
            fileId,
            data.country,
            data.year,
            data.status,
            data.category,
            data.reviewStatus,
            data.legalWeight,
            data.source,
            data.url,
            data.pubDate,
            data.provenance?.author,
            data.provenance?.reviewer,
            data.provenance?.lastAuditDate,
          ]
        );

        db.run(
          `INSERT OR REPLACE INTO policy_i18n (policy_id, lang, title, description, interpretation, impact_analysis_json, evolution_json, regulatory_json) VALUES (?,?,?,?,?,?,?,?)`,
          [
            fileId,
            lang,
            data.title,
            content.trim(),
            data.interpretation,
            JSON.stringify(data.impactAnalysis || {}),
            JSON.stringify(data.evolution || {}),
            JSON.stringify(data.regulatory || {}),
          ]
        );

        if (data.analysis) {
          for (const [dim, v] of Object.entries(data.analysis)) {
            db.run(
              `INSERT OR REPLACE INTO policy_analysis (policy_id, dimension, score, label, evidence, citation, audit_note) VALUES (?,?,?,?,?,?,?)`,
              [
                fileId,
                dim,
                v.score || 0,
                v.label,
                v.evidence,
                v.citation,
                v.auditNote,
              ]
            );
          }
        }
      } else if (type === 'facility') {
        const [lat, lng] = Array.isArray(data.coordinates)
          ? data.coordinates
          : [0, 0];
        const precision =
          data.precision === 'approximate'
            ? 'country'
            : data.precision || 'country';

        // UPSERT, not REPLACE: REPLACE is DELETE + INSERT and would cascade
        // into the other language's facility_i18n / partners / links rows.
        db.run(
          `INSERT INTO facilities (id, country, status, announced_capacity_min, announced_capacity_max, announced_capacity_raw, estimated_capacity, lat, lng, precision, investment_scale, provenance_author, provenance_reviewer, provenance_last_audit_date) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?) ON CONFLICT(id) DO UPDATE SET country=excluded.country, status=excluded.status, announced_capacity_min=excluded.announced_capacity_min, announced_capacity_max=excluded.announced_capacity_max, announced_capacity_raw=excluded.announced_capacity_raw, estimated_capacity=excluded.estimated_capacity, lat=excluded.lat, lng=excluded.lng, precision=excluded.precision, investment_scale=excluded.investment_scale, provenance_author=excluded.provenance_author, provenance_reviewer=excluded.provenance_reviewer, provenance_last_audit_date=excluded.provenance_last_audit_date`,
          [
            fileId,
            data.country,
            data.status,
            data.announcedCapacityMin || 0,
            data.announcedCapacityMax || 0,
            data.announcedCapacityRaw || '',
            data.estimatedCapacity || 0,
            lat,
            lng,
            precision,
            data.investmentScale,
            data.provenance?.author,
            data.provenance?.reviewer,
            data.provenance?.lastAuditDate,
          ]
        );

        db.run(
          `INSERT OR REPLACE INTO facility_i18n (facility_id, lang, name, description, region, type, sector, fate_of_carbon, hub, operator, capture_technology, storage_type, announcement, fid, operation, suspension_date, phase) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
          [
            fileId,
            lang,
            data.name,
            content.trim(),
            data.region,
            data.type,
            data.sector,
            data.fateOfCarbon,
            data.hub,
            data.operator,
            data.captureTechnology,
            data.storageType,
            data.announcement,
            data.fid,
            data.operation,
            data.suspensionDate,
            data.phase,
          ]
        );

        if (data.partners) {
          db.run(
            `DELETE FROM facility_partners WHERE facility_id=? AND lang=?`,
            [fileId, lang]
          );
          data.partners.forEach((p, i) =>
            db.run(
              `INSERT INTO facility_partners (facility_id, lang, order_index, partner) VALUES (?,?,?,?)`,
              [fileId, lang, i, p]
            )
          );
        }
        if (data.links) {
          db.run(`DELETE FROM facility_links WHERE facility_id=? AND lang=?`, [
            fileId,
            lang,
          ]);
          data.links.forEach((l, i) =>
            db.run(
              `INSERT INTO facility_links (facility_id, lang, order_index, link) VALUES (?,?,?,?)`,
              [fileId, lang, i, l]
            )
          );
        }
        if (data.relatedPolicies) {
          data.relatedPolicies.forEach((pid) => {
            try {
              db.run(
                `INSERT OR IGNORE INTO policy_facility_links (policy_id, facility_id) VALUES (?,?)`,
                [String(pid), fileId]
              );
            } catch (e) {}
          });
        }
      }
    });
  };

  ['en', 'zh'].forEach((l) =>
    processDir(path.join(CONTENT_ROOT, 'policies', l), 'policy')
  );
  ['en', 'zh'].forEach((l) =>
    processDir(path.join(CONTENT_ROOT, 'facilities', l), 'facility')
  );

  if (injectedDb == null) db.save();
  console.log('REVERSE IMPORT DONE AND DB WRITTEN TO DISK.');
}
