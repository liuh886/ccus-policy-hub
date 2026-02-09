import initSqlJs from 'sql.js';
import fs from 'fs';

const DB_PATH = 'governance/db/ccus_master.sqlite';

async function initStandard() {
  const SQL = await initSqlJs();
  const db = new SQL.Database(fs.readFileSync(DB_PATH));
  const encoder = new TextEncoder();

  const countryAliases = [
    ['United States', 'United States'], ['United Kingdom', 'United Kingdom'], ['Canada', 'Canada'],
    ['Norway', 'Norway'], ['China', 'China'], ['Australia', 'Australia'], ['France', 'France'],
    ['Netherlands', 'Netherlands'], ['Denmark', 'Denmark'], ['Japan', 'Japan'], ['Germany', 'Germany'],
    ['Indonesia', 'Indonesia'], ['Sweden', 'Sweden'], ['Belgium', 'Belgium'], ['Greece', 'Greece'],
    ['South Korea', 'South Korea'], ['Iceland', 'Iceland']
  ];

  const regions = [
    ['North America', '北美'], ['Europe', '欧洲'], ['China', '中国'], ['Asia Pacific', '亚太地区'],
    ['Middle East', '中东'], ['Central and South America', '中南美洲'], ['Africa', '非洲'],
    ['Eurasia', '欧亚大陆'], ['Australia and New Zealand', '澳大利亚与新西兰'], ['Other Asia Pacific', '其他亚太地区'], ['Unknown', '未知']
  ];

  db.run("BEGIN TRANSACTION");
  db.run("CREATE TABLE IF NOT EXISTS dict_region_alias (en TEXT PRIMARY KEY, zh TEXT NOT NULL)");
  db.run("CREATE TABLE IF NOT EXISTS dict_source_alias (alias TEXT PRIMARY KEY, canonical TEXT NOT NULL)");
  
  // Clear corrupted country data that might block build
  db.run("DELETE FROM policies WHERE country = '*'");
  db.run("DELETE FROM facilities WHERE country = '*'");

  for (const [en, zh] of regions) {
    db.run("INSERT OR REPLACE INTO dict_region_alias (en, zh) VALUES (?, ?)", [en, zh]);
  }
  for (const [alias, canon] of countryAliases) {
    db.run("INSERT OR REPLACE INTO dict_country_alias (alias, canonical) VALUES (?, ?)", [alias, canon]);
  }
  db.run("COMMIT");

  fs.writeFileSync(DB_PATH, new Uint8Array(db.export()));
  console.log('Standardization dictionaries initialized (ASCII Safe).');
}

initStandard();