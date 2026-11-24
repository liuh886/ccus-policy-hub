import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import initSqlJs from 'sql.js';
import { queryRows } from './lib/sqlite-query.mjs';
import {
  IEA_SECTOR_SUBSECTOR_MAP,
  loadLookupMapsFromDb,
  normalizeCountry,
  normalizeFate,
  normalizeSector,
  normalizeStatus,
  normalizeType,
  translateCountryZh,
  translateFateZh,
  translateRegionZh,
  translateSectorZh,
  translateStatusZh,
  translateTypeZh,
} from './ingest-iea-facilities.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DB_PATH = path.resolve(
  __dirname,
  '../agent/ccus-ai-agent/db/ccus_master.sqlite'
);

async function openLiveDb() {
  const SQL = await initSqlJs();
  return new SQL.Database(fs.readFileSync(DB_PATH));
}

describe('ingest-iea-facilities DB-driven lookups', () => {
  it('covers every distinct type, fate_of_carbon, sector, status, and country in live SQLite with 0 missing translations', async () => {
    const db = await openLiveDb();
    try {
      const lookups = loadLookupMapsFromDb(db);

      const types = queryRows(
        db,
        "SELECT DISTINCT type FROM facility_i18n WHERE lang='en' AND type IS NOT NULL AND type != '' ORDER BY type"
      ).map((r) => r.type);
      const missingTypes = types.filter(
        (t) => !lookups.typeEnMap.has(t) || !lookups.typeZhMap.has(t)
      );
      assert.deepEqual(missingTypes, [], 'unmapped facility types');

      const fates = queryRows(
        db,
        "SELECT DISTINCT fate_of_carbon FROM facility_i18n WHERE lang='en' AND fate_of_carbon IS NOT NULL AND fate_of_carbon != '' ORDER BY fate_of_carbon"
      ).map((r) => r.fate_of_carbon);
      const missingFates = fates.filter(
        (f) => !lookups.fateEnMap.has(f) || !lookups.fateZhMap.has(f)
      );
      assert.deepEqual(missingFates, [], 'unmapped facility fates');

      const sectors = queryRows(
        db,
        "SELECT DISTINCT sector FROM facility_i18n WHERE lang='en' AND sector IS NOT NULL AND sector != '' ORDER BY sector"
      ).map((r) => r.sector);
      const missingSectors = sectors.filter(
        (s) => !lookups.sectorEnMap.has(s) || !lookups.sectorZhMap.has(s)
      );
      assert.deepEqual(missingSectors, [], 'unmapped facility sectors');

      const statuses = queryRows(
        db,
        "SELECT DISTINCT status FROM facilities WHERE status IS NOT NULL AND status != '' ORDER BY status"
      ).map((r) => r.status);
      const missingStatuses = statuses.filter(
        (s) => !lookups.statusZhMap.has(s)
      );
      assert.deepEqual(missingStatuses, [], 'unmapped facility statuses');

      const countries = queryRows(
        db,
        "SELECT DISTINCT country FROM facilities WHERE country IS NOT NULL AND country != '' ORDER BY country"
      ).map((r) => r.country);
      const missingCountryTokens = [];
      for (const country of countries) {
        if (lookups.countryZhMap.has(country)) continue;
        const tokens = country
          .split(/\s*-\s*|\s*,\s*/)
          .map((token) => token.trim())
          .filter(Boolean);
        for (const token of tokens) {
          if (!lookups.countryZhMap.has(token)) {
            missingCountryTokens.push(`${country} (token: ${token})`);
          }
        }
      }
      assert.deepEqual(
        missingCountryTokens,
        [],
        'unmapped facility country tokens'
      );

      const unmappedSectorTargets = [
        ...new Set(IEA_SECTOR_SUBSECTOR_MAP.values()),
      ].filter((target) => !lookups.sectorZhMap.has(target));
      assert.deepEqual(
        unmappedSectorTargets,
        [],
        'IEA_SECTOR_SUBSECTOR_MAP targets missing from dict_term'
      );
    } finally {
      db.close();
    }
  });

  it('normalizes and translates country, type, fate, sector, status, and region via DB lookups', async () => {
    const db = await openLiveDb();
    try {
      const lookups = loadLookupMapsFromDb(db);

      // Country normalization & translation (preserves canonical 中国台北)
      assert.equal(
        normalizeCountry("People's Republic of China", lookups.countryEnMap),
        'China'
      );
      assert.equal(normalizeCountry('Lybia', lookups.countryEnMap), 'Libya');
      assert.equal(normalizeCountry('Island', lookups.countryEnMap), 'Iceland');
      assert.equal(
        normalizeCountry(
          "People's Republic of China - Island",
          lookups.countryEnMap
        ),
        'China - Iceland'
      );
      assert.equal(normalizeCountry('', lookups.countryEnMap), '');
      assert.equal(
        translateCountryZh('Chinese Taipei', lookups.countryZhMap),
        '中国台北'
      );
      assert.equal(
        translateCountryZh('Slovakia', lookups.countryZhMap),
        '斯洛伐克'
      );
      assert.equal(
        translateCountryZh('Timor Leste', lookups.countryZhMap),
        '东帝汶'
      );
      assert.equal(
        translateCountryZh('Norway - Netherlands', lookups.countryZhMap),
        '挪威 - 荷兰'
      );

      // Type normalization & translation
      assert.equal(
        normalizeType('Full Chain', lookups.typeEnMap),
        'Full chain'
      );
      assert.equal(
        translateTypeZh('Full chain', lookups.typeZhMap),
        '全流程项目'
      );
      assert.equal(translateTypeZh('T&S', lookups.typeZhMap), '运输与封存');

      // Fate normalization & translation
      assert.equal(
        normalizeFate('Dedicated Storage', lookups.fateEnMap),
        'Dedicated storage'
      );
      assert.equal(
        translateFateZh('Dedicated storage', lookups.fateZhMap),
        '永久封存'
      );
      assert.equal(translateFateZh('Mixed', lookups.fateZhMap), '混合去向');
      assert.equal(
        translateFateZh('Use low impact', lookups.fateZhMap),
        '低影响利用'
      );
      assert.equal(translateFateZh('Vented', lookups.fateZhMap), '直接排放');

      // Sector two-column Excel adapter & translation
      assert.equal(
        normalizeSector('Industry', 'Fertiliser', lookups.sectorEnMap),
        'Fertilizer'
      );
      assert.equal(
        normalizeSector('Industry', 'Aluminium', lookups.sectorEnMap),
        'Aluminium'
      );
      assert.equal(
        normalizeSector('Power and heat', 'Power (gas)', lookups.sectorEnMap),
        'Power and heat'
      );
      assert.equal(
        normalizeSector(
          'Fuel transformation',
          'Coal-to-liquids',
          lookups.sectorEnMap
        ),
        'Coal-to-liquids'
      );
      assert.equal(
        translateSectorZh('Aluminium', lookups.sectorZhMap),
        '铝行业'
      );
      assert.equal(
        translateSectorZh('Coal-to-gas', lookups.sectorZhMap),
        '煤制气'
      );
      assert.equal(translateSectorZh('Lime', lookups.sectorZhMap), '石灰行业');
      assert.equal(
        translateSectorZh('Oil and gas extraction', lookups.sectorZhMap),
        '油气开采'
      );

      // Status normalization & translation
      assert.equal(normalizeStatus('Under Construction'), 'Under construction');
      assert.equal(normalizeStatus('Operational'), 'Operational');
      assert.equal(
        translateStatusZh('Under construction', lookups.statusZhMap),
        '建设中'
      );
      assert.equal(
        translateStatusZh('Operational', lookups.statusZhMap),
        '运行中'
      );

      // Region translation
      assert.equal(
        translateRegionZh(
          'Australia and Other Asia Pacific',
          lookups.regionZhMap
        ),
        '澳大利亚及其他亚太地区'
      );
      assert.equal(
        translateRegionZh('Japan and Other Asia Pacific', lookups.regionZhMap),
        '日本及其他亚太地区'
      );
    } finally {
      db.close();
    }
  });
});
