const fs = require('fs');
const path = 'src/data/policy_database.json';

let rawData = fs.readFileSync(path, 'utf8');
// 移除 BOM 字符
if (rawData.charCodeAt(0) === 0xFEFF) {
  rawData = rawData.slice(1);
}

const db = JSON.parse(rawData);

const rules = {
  incentive: {
    keys: ['tax', 'credit', 'subsidy', 'funding', 'grant', 'ccfd', 'incentive', 'money', 'investment', '拨款', '补贴', '财税', '抵免', '资金', '奖励', '投资', '激励'],
    category: ['经济激励', 'Incentive']
  },
  statutory: {
    keys: ['act', 'law', 'regulation', 'legal', 'decree', 'statutory', 'administrative', 'framework', '准入', '法案', '法规', '条例', '管理办法', '法律', '制度', '许可'],
    category: ['法律监管', 'Legal & Regulatory', '战略引导', 'Strategic Guidance']
  },
  liability: {
    keys: ['liability', 'risk', 'closure', 'long-term', 'monitoring', 'pore space', 'ownership', 'stewardship', 'assurance', '责任', '封存', '孔隙', '风险', '场址', '移交', '所有权'],
    category: []
  },
  mrv: {
    keys: ['standard', 'technical', 'mrv', 'iso', 'guideline', 'protocol', 'verification', 'accounting', 'measurement', 'data', 'dmrv', '标准', '核算', '监测', '规范', '技术', '基准'],
    category: []
  },
  market: {
    keys: ['market', 'trading', 'ets', 'article 6', 'itmo', 'cross-border', 'cbam', 'export', 'import', 'price', 'carbon tax', '碳市场', '碳交易', '跨境', '枢纽', '连接', '出口', '价格'],
    category: ['市场机制', 'Market Mechanisms']
  }
};

let cleanedCount = 0;

db.policies.forEach(p => {
  const content = (
    (p.zh.title || '') + 
    (p.zh.description || '') + 
    (p.zh.tags ? p.zh.tags.join(' ') : '') +
    (p.en.title || '') + 
    (p.en.description || '') + 
    (p.en.tags ? p.en.tags.join(' ') : '')
  ).toLowerCase();

  const category = p.zh.category || p.en.category || '';

  Object.keys(rules).forEach(dim => {
    const rule = rules[dim];
    const hasKey = rule.keys.some(k => content.includes(k.toLowerCase()));
    const isPrimaryCategory = rule.category.includes(category);

    if (!hasKey && !isPrimaryCategory) {
      if (p.analysis[dim] > 0) cleanedCount++;
      p.analysis[dim] = 0;
    } else if (p.analysis[dim] === 50 || p.analysis[dim] === 60) {
      if (isPrimaryCategory) p.analysis[dim] = 75;
      if (hasKey && isPrimaryCategory) p.analysis[dim] = 85;
    }
  });

  if (Object.values(p.analysis).every(v => v === 0)) {
    if (rules.incentive.category.includes(category)) p.analysis.incentive = 40;
    else if (rules.market.category.includes(category)) p.analysis.market = 40;
    else p.analysis.statutory = 40;
  }
});

fs.writeFileSync(path, JSON.stringify(db, null, 2), 'utf8');
console.log(`FSRTM 系统重估完成。清理了 ${cleanedCount} 个无关维度评分。`);