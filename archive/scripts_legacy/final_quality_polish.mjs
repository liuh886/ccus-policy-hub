import fs from 'fs';

const DB_PATH = './src/data/policy_database.json';
const db = JSON.parse(fs.readFileSync(DB_PATH, 'utf-8'));

const updates = {
  "kr-ccus-enforcement-2025": {
    "url": "https://www.law.go.kr/LSW/lsInfoP.do?lsiSeq=274000",
    "legal_citation": "Presidential Decree No. 35243"
  },
  "gr-law-4964-2022": {
    "url": "https://www.et.gr/api/DownloadFeksApi/?fek_pdf=20220100150",
    "legal_citation": "Official Gazette A' 150/2022"
  },
  "imo-igc-code-2024": {
    "url": "https://www.imo.org/en/MediaCentre/MeetingSummaries/Pages/MEPC-81st-session.aspx",
    "legal_citation": "MEPC.391(81)"
  },
  "jp-jcm-ccs-methodology-2024": {
    "url": "https://www.jcm.go.jp/id-jp/information/532",
    "legal_citation": "JCM Guidelines for CCS/CCUS Dec 2024"
  }
};

db.policies = db.policies.map(p => {
  // 1. Link & Citation Updates
  if (updates[p.id]) {
    p.zh.url = updates[p.id].url;
    p.en.url = updates[p.id].url;
    if (updates[p.id].legal_citation) {
      p.zh.legal_citation = updates[p.id].legal_citation;
      p.en.legal_citation = updates[p.id].legal_citation;
    }
  }

  // 2. Structural Fix: Ensure top-level sectors exist and are accurate
  // If top-level sectors missing, inherit from zh or default to Cross-cutting
  if (!p.sectors || p.sectors.length === 0) {
    const desc = (p.zh.description + p.en.description).toLowerCase();
    const detected = [];
    if (desc.includes('power') || desc.includes('电')) detected.push('Power');
    if (desc.includes('steel') || desc.includes('钢')) detected.push('Steel');
    if (desc.includes('cement') || desc.includes('水泥')) detected.push('Cement');
    if (desc.includes('dac') || desc.includes('removal')) detected.push('DAC');
    if (desc.includes('aviation') || desc.includes('航空')) detected.push('Aviation');
    if (desc.includes('shipping') || desc.includes('航运')) detected.push('Shipping');
    if (desc.includes('storage') || desc.includes('封存')) detected.push('Storage');
    
    p.sectors = detected.length > 0 ? [...new Set(detected)] : ["Cross-cutting"];
  }

  // 3. Consistency: Default mrv_rigor if missing
  if (!p.mrv_rigor) p.mrv_rigor = 3;

  return p;
});

fs.writeFileSync(DB_PATH, JSON.stringify(db, null, 2), 'utf-8');
console.log('✅ Final Quality Polish Complete: Deep links restored, sectors tagged, metadata aligned.');
