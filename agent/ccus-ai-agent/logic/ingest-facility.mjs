import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import initSqlJs from 'sql.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DB_PATH = path.join(__dirname, '../db/ccus_master.sqlite');

/**
 * Generic Facility Ingester (V2.2)
 * Usage: node logic/ingest-facility.mjs --json '{"id": "test-facility", "country": "Norway", ...}'
 */
async function ingest() {
  const args = process.argv.slice(2);
  const jsonArgIdx = args.indexOf('--json');
  if (jsonArgIdx === -1 || !args[jsonArgIdx + 1]) {
    console.error("Usage: node logic/ingest-facility.mjs --json '<json_string>'");
    process.exit(1);
  }

  const facility = JSON.parse(args[jsonArgIdx + 1]);
  const SQL = await initSqlJs();
  const buffer = fs.readFileSync(DB_PATH);
  const db = new SQL.Database(buffer);

  const lastAuditDate = new Date().toISOString().split('T')[0];

  db.run("BEGIN TRANSACTION");
  try {
    // 1. Ingest into facilities table
    db.run(`INSERT OR REPLACE INTO facilities (
      id, country, status, review_status, 
      announced_capacity_min, announced_capacity_max, announced_capacity_raw,
      estimated_capacity, lat, lng, precision, investment_scale,
      provenance_author, provenance_last_audit_date
    ) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)`, [
      facility.id, 
      facility.country || 'Unknown', 
      facility.status || 'Planned', 
      facility.review_status || 'draft',
      facility.announced_capacity_min || null,
      facility.announced_capacity_max || null,
      facility.announced_capacity_raw || null,
      facility.estimated_capacity || null,
      facility.lat || null,
      facility.lng || null,
      facility.precision || 'Country',
      facility.investment_scale || null,
      facility.provenance_author || 'CCUS AI Agent',
      lastAuditDate
    ]);

    // 2. Ingest into facility_i18n (English)
    db.run(`INSERT OR REPLACE INTO facility_i18n (
      facility_id, lang, name, description, region, type, phase, sector, 
      fate_of_carbon, hub, operator, capture_technology, storage_type,
      announcement, fid, operation
    ) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`, [
      facility.id, 'en',
      facility.en?.name || facility.id,
      facility.en?.description || null,
      facility.region || null,
      facility.type || null,
      facility.phase || null,
      facility.sector || null,
      facility.fate_of_carbon || 'Storage',
      facility.hub || null,
      facility.operator || null,
      facility.capture_technology || null,
      facility.storage_type || null,
      facility.announcement || null,
      facility.fid || null,
      facility.operation || null
    ]);

    // 3. Ingest into facility_i18n (Chinese)
    db.run(`INSERT OR REPLACE INTO facility_i18n (
      facility_id, lang, name, description, region, type, phase, sector, 
      fate_of_carbon, hub, operator, capture_technology, storage_type,
      announcement, fid, operation
    ) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`, [
      facility.id, 'zh',
      facility.zh?.name || facility.en?.name || facility.id,
      facility.zh?.description || null,
      facility.region || null,
      facility.type || null,
      facility.phase || null,
      facility.sector || null,
      facility.fate_of_carbon || 'Storage',
      facility.hub || null,
      facility.operator || null,
      facility.capture_technology || null,
      facility.storage_type || null,
      facility.announcement || null,
      facility.fid || null,
      facility.operation || null
    ]);

    // 4. Partners
    if (facility.partners && Array.isArray(facility.partners)) {
      db.run("DELETE FROM facility_partners WHERE facility_id = ?", [facility.id]);
      facility.partners.forEach((p, idx) => {
        db.run("INSERT INTO facility_partners (facility_id, lang, order_index, partner) VALUES (?,?,?,?)", [facility.id, 'en', idx, p]);
        db.run("INSERT INTO facility_partners (facility_id, lang, order_index, partner) VALUES (?,?,?,?)", [facility.id, 'zh', idx, p]);
      });
    }

    // 5. Links
    if (facility.links && Array.isArray(facility.links)) {
      db.run("DELETE FROM facility_links WHERE facility_id = ?", [facility.id]);
      facility.links.forEach((l, idx) => {
        db.run("INSERT INTO facility_links (facility_id, lang, order_index, link) VALUES (?,?,?,?)", [facility.id, 'en', idx, l]);
        db.run("INSERT INTO facility_links (facility_id, lang, order_index, link) VALUES (?,?,?,?)", [facility.id, 'zh', idx, l]);
      });
    }

    db.run("COMMIT");
    console.log(`Facility '${facility.id}' ingested successfully.`);
  } catch (e) {
    db.run("ROLLBACK");
    console.error(`Failed to ingest facility '${facility.id}':`, e);
    process.exit(1);
  }

  const data = db.export();
  fs.writeFileSync(DB_PATH, new Uint8Array(data));
  db.close();
}

ingest().catch(err => console.error(err));
