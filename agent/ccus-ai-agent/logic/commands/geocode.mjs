/**
 * Geocoding command: anchor facility coordinates to country centroids where
 * precision requires it, and emit the coordinate governance report.
 *
 * Moved verbatim from `logic/manage.mjs` (behavior-preserving split).
 * `coordinatesEqual` is shared with the deep audit (`audit.mjs`).
 */

import fs from 'fs';
import {
  hasMeaningfulCoordinates,
  resolveFacilityCoordinates,
} from '../../../../scripts/content-export-utils.mjs';
import {
  FACILITY_COORD_REPORT_JSON,
  FACILITY_COORD_REPORT_MD,
  REPORTS_DIR,
  loadDb,
} from '../db.mjs';

export function coordinatesEqual(a, b, epsilon = 1e-9) {
  if (!Array.isArray(a) || !Array.isArray(b) || a.length < 2 || b.length < 2) {
    return false;
  }
  return (
    Math.abs(Number(a[0]) - Number(b[0])) <= epsilon &&
    Math.abs(Number(a[1]) - Number(b[1])) <= epsilon
  );
}

export async function dbGeocodeFacilities(SQL) {
  const db = loadDb(SQL);
  const report = {
    generatedAt: new Date().toISOString(),
    resolvedMissingToCountryAnchor: [],
    normalizedToCountryAnchor: [],
    unresolved: [],
  };
  db.transaction(() => {
    db.all('SELECT id, country, precision, lat, lng FROM facilities').forEach(
      (f) => {
        const expectedCoordinates = resolveFacilityCoordinates({
          country: f.country,
          precision: 'country',
          lat: null,
          lng: null,
          defaultFallback: null,
        });
        const hasValidCoordinates = hasMeaningfulCoordinates(f.lat, f.lng);
        const shouldUseCountryAnchor =
          f.precision === 'country' ||
          f.precision === 'approximate' ||
          !hasValidCoordinates;

        if (!shouldUseCountryAnchor) return;

        if (!expectedCoordinates) {
          report.unresolved.push({
            id: String(f.id),
            country: f.country,
            precision: f.precision || null,
          });
          return;
        }

        if (
          hasValidCoordinates &&
          coordinatesEqual([f.lat, f.lng], expectedCoordinates) &&
          (f.precision === 'country' || f.precision === 'approximate')
        ) {
          return;
        }

        const targetPrecision =
          f.precision === 'approximate' ? 'approximate' : 'country';

        db.run(
          'UPDATE facilities SET lat = ?, lng = ?, precision = ? WHERE id = ?',
          [
            expectedCoordinates[0],
            expectedCoordinates[1],
            targetPrecision,
            f.id,
          ]
        );

        const bucket = hasValidCoordinates
          ? report.normalizedToCountryAnchor
          : report.resolvedMissingToCountryAnchor;

        bucket.push({
          id: String(f.id),
          country: f.country,
          previousCoordinates: hasValidCoordinates
            ? [Number(f.lat), Number(f.lng)]
            : null,
          previousPrecision: f.precision || null,
          coordinates: expectedCoordinates,
          precision: targetPrecision,
        });
      }
    );
  });
  db.save();

  fs.mkdirSync(REPORTS_DIR, { recursive: true });
  fs.writeFileSync(FACILITY_COORD_REPORT_JSON, JSON.stringify(report, null, 2));
  fs.writeFileSync(
    FACILITY_COORD_REPORT_MD,
    [
      '# Facility Coordinate Governance Report',
      '',
      `- Generated At: ${report.generatedAt}`,
      `- Resolved Missing To Country Anchor: ${report.resolvedMissingToCountryAnchor.length}`,
      `- Normalized Existing Country Anchors: ${report.normalizedToCountryAnchor.length}`,
      `- Unresolved: ${report.unresolved.length}`,
      '',
      '## Unresolved',
      '',
      ...(report.unresolved.length
        ? report.unresolved.map(
            (item) =>
              `- id=${item.id} country=${item.country || 'N/A'} precision=${item.precision || 'N/A'}`
          )
        : ['- None']),
      '',
    ].join('\n')
  );

  console.log(
    `GEOCODE DONE. resolved_missing=${report.resolvedMissingToCountryAnchor.length} normalized=${report.normalizedToCountryAnchor.length} unresolved=${report.unresolved.length}`
  );
}
