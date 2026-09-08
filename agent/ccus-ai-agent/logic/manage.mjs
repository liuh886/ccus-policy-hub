/**
 * CCUS maintenance CLI — router (thin).
 *
 * Command implementations live in `logic/commands/` by domain; shared SQLite
 * access lives in `logic/db.mjs`. This file only parses argv, holds the DB
 * file lock for the whole command, routes, and maps errors to exit codes.
 * `db:peek`/`db:peek:raw` stay here: they are read-only routing-layer
 * diagnostics (table/column names are allowlisted, see C4).
 */

import initSqlJs from 'sql.js';
import { acquireDbLock } from '../../../scripts/lib/db-write.mjs';
import { dbAuditDeep } from './commands/audit.mjs';
import { dbExportI18n, dbExportMd } from './commands/export.mjs';
import { dbGeocodeFacilities } from './commands/geocode.mjs';
import {
  dbImportIeaLinks,
  dbImportI18n,
  dbImportMdReverse,
  dbInit,
} from './commands/import.mjs';
import {
  dbComputeMaturity,
  dbFixRelationships,
  dbPipeline,
  dbStats,
} from './commands/maintenance.mjs';
import { dbSeedCountries, dbSyncCountryProfiles } from './commands/seed.mjs';
import { dbStandardize } from './commands/standardize.mjs';
import { loadDb } from './db.mjs';

const args = process.argv.slice(2);
const command = args[0];

const EXIT_CODES = {
  SUCCESS: 0,
  AUDIT_FAILED: 2,
  INPUT_ERROR: 3,
  EXPORT_ERROR: 4,
  FATAL: 1,
};

async function main() {
  let exitCode = EXIT_CODES.SUCCESS;
  let release = null;
  try {
    release = acquireDbLock();
    const SQL = await initSqlJs();
    switch (command) {
      case 'db:init':
        await dbInit(SQL);
        break;
      case 'db:import:i18n':
        await dbImportI18n(SQL);
        break;
      case 'db:import:legacy':
        throw new Error(
          'db:import:legacy is retired. Facilities legacy JSON import has been removed from the active workflow.'
        );
      case 'db:import:iea:links':
        await dbImportIeaLinks(SQL, args.slice(1));
        break;
      case 'db:import:md':
        throw new Error(
          'db:import:md is deprecated for daily use. Reverse sync is migration-only; use db:import:md:migration with explicit acknowledgement.'
        );
      case 'db:import:md:migration':
        await dbImportMdReverse(SQL, args.slice(1));
        break;
      case 'db:standardize':
        await dbStandardize(SQL);
        break;
      case 'db:geocode:facilities':
        await dbGeocodeFacilities(SQL);
        break;
      case 'db:govern:facility-coordinates':
        await dbGeocodeFacilities(SQL);
        break;
      case 'db:seed:countries':
        await dbSeedCountries(SQL);
        break;
      case 'db:sync:country-profiles':
        await dbSyncCountryProfiles(SQL);
        break;
      case 'db:fix-relationships':
        await dbFixRelationships(SQL, args.slice(1));
        break;
      case 'db:audit:deep':
        await dbAuditDeep(SQL);
        break;
      case 'db:export:i18n':
        await dbExportI18n(SQL);
        break;
      case 'db:export:md':
        await dbExportMd(SQL);
        break;
      case 'db:compute:maturity':
        await dbComputeMaturity(SQL);
        break;
      case 'db:stats':
        await dbStats(SQL, args.slice(1));
        break;
      case 'db:peek': {
        const db = loadDb(SQL);
        const data = db.all(
          `SELECT DISTINCT ${args[2] || 'id'} FROM ${args[1]} LIMIT 100`
        );
        console.log(JSON.stringify(data, null, 2));
        break;
      }
      case 'db:peek:raw': {
        const db = loadDb(SQL);
        const data = db.all(
          `SELECT * FROM ${args[1]} WHERE ${args[2] || 'id'} = ?`,
          [args[3]]
        );
        console.log(JSON.stringify(data, null, 2));
        break;
      }
      case 'db:pipeline':
        await dbPipeline(SQL, args.slice(1));
        break;
      default:
        console.log('Unknown command.');
    }
  } catch (err) {
    console.error(`Error: ${err.message}`);
    exitCode = err.message.includes('Audit FAILED')
      ? EXIT_CODES.AUDIT_FAILED
      : EXIT_CODES.FATAL;
  } finally {
    if (release) release();
    if (command) process.exit(exitCode);
  }
}

main();
