const fs = require('fs');
const path = require('path');

const DB_FILE = path.join(__dirname, '../src/data/policy_database.json');
const data = JSON.parse(fs.readFileSync(DB_FILE, 'utf-8'));

// 预定义的一些已知正确的中英文标题映射，用于修复乱码标题
const titleCorrections = {
  "us-45q-ira": "美国 45Q 碳氧化物封存税收抵免 (IRA 2022)",
  "eu-nzia": "欧盟净零工业法案 (NZIA)",
  "cn-pboc-cerf": "中国碳减排支持工具 (CERF)",
  "no-storage-regulations": "挪威二氧化碳存储监管体系",
  "eu-cbam": "欧盟碳边境调节机制 (CBAM)",
  "cn-ccer": "中国自愿减排交易机制 (CCER)",
  "canada-itc": "加拿大 CCUS 投资税收抵免"
};

data.policies.forEach(p => {
  // 1. 修复标题
  if (titleCorrections[p.id]) {
    if (p.zh) p.zh.title = titleCorrections[p.id];
  }

  // 2. 如果中文 description 包含乱码（通过检测非中文字符比例或特定损坏特征），则尝试修复
  if (p.zh && p.zh.description && (p.zh.description.includes('鈹') || p.zh.description.includes('鉁'))) {
     console.log(`Cleaning garbled text in ${p.id}...`);
     // 如果中文损坏严重，暂时用一个占位符或简短描述代替，或者保留其原样由用户手动确认
     // 这里我们做一个基础的字符串清理
     p.zh.description = p.zh.description.replace(/[鈹鉁鈻鈹溾攢鈹斺攢]/g, '').trim();
  }
  
  // 3. 确保所有政策都有 countryZh 映射
  if (p.zh && !p.zh.country) {
     p.zh.country = "未知";
  }
});

fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2), 'utf8');
console.log("Cleanup complete!");
