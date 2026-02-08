const fs = require('fs');
const path = require('path');

const ZH_FACILITIES_DIR = './src/content/facilities/zh';
const EN_FACILITIES_DIR = './src/content/facilities/en';

const policyMapping = {
  'China': ['cn-national-standards', 'cn-ccer', 'cn-pboc-cerf', 'cn-zero-carbon-parks'],
  '中国': ['cn-national-standards', 'cn-ccer', 'cn-pboc-cerf', 'cn-zero-carbon-parks'],
  'United States': ['us-45q-ira', 'california-lcfs', 'us-iija-hubs'],
  '美国': ['us-45q-ira', 'california-lcfs', 'us-iija-hubs'],
  'Norway': ['no-storage-regulations', 'norway-longship'],
  '挪威': ['no-storage-regulations', 'norway-longship'],
  'United Kingdom': ['uk-ccus-vision'],
  '英国': ['uk-ccus-vision'],
  'Canada': ['ca-ccus-itc', 'alberta-tier'],
  '加拿大': ['ca-ccus-itc', 'alberta-tier'],
  'European Union': ['eu-nzia', 'eu-ets', 'eu-innovation-fund', 'eu-cbam'],
  '欧盟': ['eu-nzia', 'eu-ets', 'eu-innovation-fund', 'eu-cbam'],
  'Brazil': ['br-bill-1425-2022'],
  '巴西': ['br-bill-1425-2022'],
  'Germany': ['de-icm-strategy'],
  '德国': ['de-icm-strategy'],
  'France': ['fr-ccus-roadmap'],
  '法国': ['fr-ccus-roadmap'],
  'Thailand': ['th-boi-incentives'],
  '泰国': ['th-boi-incentives']
};

function linkFacilities(dir) {
  if (!fs.existsSync(dir)) return;
  const files = fs.readdirSync(dir);

  files.forEach(file => {
    if (!file.endsWith('.md')) return;
    const filePath = path.join(dir, file);
    let content = fs.readFileSync(filePath, 'utf-8');
    
    const lines = content.split('\n');
    const countryLine = lines.find(l => l.trim().startsWith('country:'));
    if (!countryLine) return;

    const country = countryLine.split(':')[1].trim().replace(/['"]/g, '');
    const policies = policyMapping[country];

    if (policies && policies.length > 0) {
      // 移除旧的 relatedPolicies
      content = content.replace(/relatedPolicies:[\s\S]*?(?=\n\w)/, '');

      const policyList = policies.map(p => `  - ${p}`).join('\n');
      const newBlock = `relatedPolicies:\n${policyList}\n`;
      
      // 插入到 lang: 之前
      content = content.replace(/lang:/, newBlock + 'lang:');

      fs.writeFileSync(filePath, content, 'utf8');
    }
  });
}

linkFacilities(ZH_FACILITIES_DIR);
linkFacilities(EN_FACILITIES_DIR);
console.log('✅ Golden Links Restored.');