const fs = require('fs');
const path = require('path');

const policies = {
  'us-45q-ira': `## 1. 政策概览
美国 45Q 条款是目前全球最强力的 CCUS 经济激励政策。通过 2022 年《通胀削减法案》(IRA) 的修订，该政策大幅提升了抵免金额，并放宽了准入门槛。

## 2. 核心激励标准
- **专用地质封存**：从 50 美元/吨提升至 **85 美元/吨**。
- **二氧化碳增强采油 (EOR)**：从 35 美元/吨提升至 **60 美元/吨**。
- **直接空气捕集 (DAC)**：封存可获 **180 美元/吨**，利用可获 **130 美元/吨**。

## 3. MRV 与核证要求
- 项目必须符合美国环保署 (EPA) **GHGRP Subpart RR** 的监测、报告与核证计划。
- 强调“安全地质封存”的生命周期评估。
- 引入了“直接支付”(Direct Pay) 与“税收抵免转让”机制，显著提升了项目的融资能力。`,

  'no-storage-regulations': `## 1. 挪威封存框架
挪威拥有全球领先的二氧化碳封存监管体系，主要由《二氧化碳存储法规》(Storage Regulations) 驱动，并由挪威离岸管理局 (NOD) 负责实施。

## 2. 核心机制
- **许可证制度**：分为勘探许可证和存储许可证。
- **责任转移**：在场址关闭并进入稳定期（通常为 20 年）后，长期责任可转移给国家。
- **跨境支持**：支持伦敦议定书框架下的跨境二氧化碳运输与封存，是“北极光” (Northern Lights) 项目的法律基石。

## 3. 监测要求
- 强制要求高频的地震监测与压力模拟。
- 建立了完善的泄漏风险评估与补偿机制。`,

  'eu-nzia': `## 1. 政策背景
《净零工业法案》(NZIA) 是欧盟绿色交易工业计划的核心支柱，旨在确保欧盟在清洁技术领域的竞争优势。

## 2. CCUS 目标
- **注入能力目标**：到 2030 年，欧盟境内必须建立年度 **5000 万吨** 的二氧化碳注入能力。
- **油气生产商义务**：法案强制要求在欧盟境内生产油气的公司按比例贡献封存容量。

## 3. 战略意义
- 将 CCUS 列为“战略性净零技术”，享受快速审批通道。
- 推动建立全欧洲统一的二氧化碳输送网络基础设施。`,

  'cn-ccer': `## 1. CCER 重启背景
中国核证自愿减排量 (CCER) 机制于 2024 年正式重启，是中国碳市场的重要补充。

## 2. CCUS 纳入前景
- **方法学开发**：目前监管部门正积极组织研究 CCUS 专项方法学，重点涵盖捕集与封存环节。
- **抵消比例**：重点排放单位可使用 CCER 抵消 5% 的清缴配额。
- **数据严谨性**：要求满足“可核查、可复算、可审计”的原则，与国际 ISO 14064 体系接轨。`
};

Object.entries(policies).forEach(([id, body]) => {
  const filePath = `./src/content/policies/zh/${id}.md`;
  if (fs.existsSync(filePath)) {
    let content = fs.readFileSync(filePath, 'utf-8');
    const parts = content.split('---');
    if (parts.length >= 3) {
      const newContent = `${parts[0]}---${parts[1]}--- 

${body}
`;
      fs.writeFileSync(filePath, newContent, 'utf-8');
      console.log(`Injected content into: ${id}`);
    }
  }
});
