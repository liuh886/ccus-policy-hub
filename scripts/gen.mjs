#!/usr/bin/env node
/**
 * Unified derived-artifact generator (`pnpm gen`).
 *
 * Loads sql.js and ccus_master.sqlite once under a single DB lock, then runs
 * all deterministic derived projections in order:
 * 1. i18n dictionary (`src/data/i18n_dictionary.json`)
 * 2. Clean-synced bilingual Markdown (`src/content/{policies,facilities,countries}`)
 * 3. Quality metrics (`src/data/quality_metrics.generated.json`)
 * 4. Public API/context/evidence/catalog payloads (`public/data/**`)
 * 5. Policy-link projection verification (`syncPolicyLinkProjections` check)
 */

import fs from 'fs';
import { pathToFileURL } from 'url';
import initSqlJs from 'sql.js';
import { dbExportI18n } from '../agent/ccus-ai-agent/logic/commands/export.mjs';
import { DB_PATH, SqlJsDatabase } from '../agent/ccus-ai-agent/logic/db.mjs';
import { acquireDbLock } from './lib/db-write.mjs';
import { runCleanExportSync } from './export-md-clean-sync.mjs';
import { generateMetrics } from './generate-quality-metrics.mjs';
import { generatePublicData } from './generate-public-data.mjs';
import { syncPolicyLinkProjections } from './sync-policy-link-projections.mjs';

export async function runGen() {
  if (!fs.existsSync(DB_PATH)) {
    throw new Error(`Database not found at: ${DB_PATH}`);
  }

  const release = acquireDbLock();
  try {
    const dbBytes = fs.readFileSync(DB_PATH);
    const SQL = await initSqlJs();
    const db = new SqlJsDatabase(SQL, new Uint8Array(dbBytes));
    try {
      await dbExportI18n(SQL, { db });
      await runCleanExportSync({ SQL, db });
      await generateMetrics({ db: db.db });
      await generatePublicData({ db: db.db, dbBytes });

      const linkCheck = await syncPolicyLinkProjections({
        db: db.db,
        write: false,
      });
      if (!linkCheck.pass) {
        throw new Error(
          `Policy-link projection check failed with ${linkCheck.mismatches.length} mismatch(es).`
        );
      }
      console.log(
        `Policy-link projections verified (${linkCheck.facilitiesWithLinks} facilities with links, 0 mismatches).`
      );
    } finally {
      db.close();
    }
  } finally {
    release();
  }
}

if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(process.argv[1]).href
) {
  runGen().catch((error) => {
    console.error(`pnpm gen failed: ${error.message}`);
    process.exitCode = 1;
  });
}
