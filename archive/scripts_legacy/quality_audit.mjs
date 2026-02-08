import fs from 'fs';

const DB_PATH = './src/data/policy_database.json';
const db = JSON.parse(fs.readFileSync(DB_PATH, 'utf-8'));

const findings = {
  vague_urls: [],
  incomplete_sectors: [],
  asymmetric_metadata: [],
  low_fidelity_descriptions: []
};

db.policies.forEach(p => {
  // 1. Vague URL Check (Generic homepages are considered low fidelity)
  const genericDomains = [
    'www.icao.int', 'www.imo.org', 'www.gov.uk', 'www.ca.gov', 
    'www.doe.gov', 'www.herema.gr', 'www.gov.eg', 'www.motie.go.kr',
    'www.jcm.go.jp', 'www.gov.br', 'www.ifrs.org', 'ec.europa.eu'
  ];
  const url = p.zh.url || p.en.url;
  if (genericDomains.some(d => url.includes(d) && url.length < (d.length + 10))) {
    findings.vague_urls.push({ id: p.id, url });
  }

  // 2. Sector Completeness
  if (!p.sectors || p.sectors.length === 0) {
    findings.incomplete_sectors.push(p.id);
  }

  // 3. Description Fidelity (Too short descriptions)
  if (p.zh.description.length < 30 || p.en.description.length < 50) {
    findings.low_fidelity_descriptions.push(p.id);
  }
});

console.log('--- CCUS QUALITY AUDIT REPORT ---');
console.log(`Total Scanned: ${db.policies.length}`);
console.log(`Vague URLs: ${findings.vague_urls.length}`);
console.log(`Incomplete Sectors: ${findings.incomplete_sectors.length}`);
console.log(`Low-Fidelity Descriptions: ${findings.low_fidelity_descriptions.length}`);

if (findings.vague_urls.length > 0) {
  console.log('\n[!] High Priority: Need to replace generic URLs with deep links for:');
  findings.vague_urls.forEach(f => console.log(` - ${f.id}: ${f.url}`));
}
