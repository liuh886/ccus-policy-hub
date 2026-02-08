const fs = require('fs');
const path = require('path');

const DB_PATH = 'src/data/policy_database.json';
const POLICY_MD_DIR = 'src/content/policies/zh';

const results = {
  json_valid: false,
  encoding_ok: true,
  expert_narrative_present: false,
  fsrtm_score_coverage: 0,
  mojibake_detected: []
};

try {
  // 1. JSON 结构校验
  const raw = fs.readFileSync(DB_PATH, 'utf8');
  const db = JSON.parse(raw.charCodeAt(0) === 0xFEFF ? raw.slice(1) : raw);
  results.json_valid = true;
  
  // 2. 核心政策 FSRTM 覆盖率检查
  const diamondPolicies = ['us-45q-ira', 'eu-nzia', 'cn-national-standards'];
  let scoresFound = 0;
  diamondPolicies.forEach(id => {
    const p = db.policies.find(x => x.id === id);
    if (p && p.analysis && p.analysis.incentive && p.analysis.incentive.score > 0) {
      scoresFound++;
    }
  });
  results.fsrtm_score_coverage = scoresFound / diamondPolicies.length;

  // 3. 乱码检测 (扫描中文字符有效性)
  const files = fs.readdirSync(POLICY_MD_DIR);
  files.slice(0, 10).forEach(file => {
    const content = fs.readFileSync(path.join(POLICY_MD_DIR, file), 'utf8');
    // 如果包含大量的锟斤拷或閿涘苯，标记为乱码
    if (content.includes('锟斤拷') || content.includes('閿涘苯')) {
      results.mojibake_detected.push(file);
    }
  });

  // 4. 专家内容检查
  const us45q = db.policies.find(p => p.id === 'us-45q-ira');
  if (us45q && us45q.zh && us45q.zh.description && us45q.zh.description.includes('税收抵免')) {
    results.expert_narrative_present = true;
  }

  console.log('--- DEEP AUDIT REPORT ---');
  console.log(JSON.stringify(results, null, 2));
} catch (e) {
  console.error('Audit failed critical step:', e.message);
}
