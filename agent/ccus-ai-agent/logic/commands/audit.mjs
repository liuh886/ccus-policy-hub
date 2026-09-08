/**
 * Audit command: blocking deep-audit gates over the master database.
 *
 * Moved verbatim from `logic/manage.mjs` (behavior-preserving split).
 */

import fs from 'fs';
import {
  hasMeaningfulCoordinates,
  resolveFacilityCoordinates,
} from '../../../../scripts/content-export-utils.mjs';
import { THRESHOLDS_PATH, loadDb } from '../db.mjs';
import { coordinatesEqual } from './geocode.mjs';

export async function dbAuditDeep(
  SQL,
  { db: injectedDb = null, thresholds: injectedThresholds = null } = {}
) {
  // Test seam: pass { db, thresholds } to evaluate gates against an
  // in-memory database without touching the master file.
  const db = injectedDb ?? loadDb(SQL);
  const thresholds =
    injectedThresholds ?? JSON.parse(fs.readFileSync(THRESHOLDS_PATH, 'utf8'));
  const pCount = db.get('SELECT COUNT(*) as c FROM policies').c;
  const fCount = db.get('SELECT COUNT(*) as c FROM facilities').c;

  const regFields = [
    'pore_space_rights',
    'liability_transfer',
    'liability_period',
    'financial_assurance',
    'permitting_lead_time',
    'co2_definition',
    'cross_border_rules',
  ];
  const totalCells =
    db.get('SELECT COUNT(*) as c FROM country_i18n').c * regFields.length;
  let filledCells = 0;
  db.all('SELECT * FROM country_i18n').forEach((row) => {
    regFields.forEach((f) => {
      if (row[f] && !['Pending', '---', '待定', ''].includes(row[f]))
        filledCells++;
    });
  });
  const regFillRate = totalCells > 0 ? filledCells / totalCells : 0;
  const unresolvedFacilityCoordinates = db
    .all('SELECT id, country, precision, lat, lng FROM facilities')
    .filter((facility) => {
      if (hasMeaningfulCoordinates(facility.lat, facility.lng)) return false;
      return !resolveFacilityCoordinates({
        country: facility.country,
        precision: facility.precision || 'country',
        lat: facility.lat,
        lng: facility.lng,
        defaultFallback: null,
      });
    }).length;
  const countryAnchorDrift = db
    .all(
      "SELECT id, country, precision, lat, lng FROM facilities WHERE precision IN ('country', 'approximate')"
    )
    .filter((facility) => {
      if (!hasMeaningfulCoordinates(facility.lat, facility.lng)) return false;
      const expectedCoordinates = resolveFacilityCoordinates({
        country: facility.country,
        precision: 'country',
        lat: null,
        lng: null,
        defaultFallback: null,
      });
      if (!expectedCoordinates) return false;
      return !coordinatesEqual(
        [facility.lat, facility.lng],
        expectedCoordinates
      );
    }).length;

  const pass =
    pCount >= thresholds.min_policy_count &&
    fCount >= thresholds.min_facility_count &&
    regFillRate >= (thresholds.min_regulatory_fill_rate || 0) &&
    unresolvedFacilityCoordinates === 0 &&
    countryAnchorDrift === 0;
  db.run(
    "INSERT OR REPLACE INTO db_meta (key, value) VALUES ('last_audit_pass', ?)",
    [pass ? 'true' : 'false']
  );
  if (injectedDb == null) db.save();
  console.log(
    `AUDIT ${pass ? 'PASSED' : 'FAILED'} (Fill Rate: ${(regFillRate * 100).toFixed(1)}%, unresolved facility coordinates: ${unresolvedFacilityCoordinates}, country anchor drift: ${countryAnchorDrift})`
  );
  if (!pass) throw new Error('Audit FAILED');
}
