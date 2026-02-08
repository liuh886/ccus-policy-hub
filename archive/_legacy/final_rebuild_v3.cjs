const fs = require('fs');
const path = require('path');

const DB_PATH = './src/data/policy_database.json';
const OUTPUT_DIR_ZH = './src/content/policies/zh';
const OUTPUT_DIR_EN = './src/content/policies/en';

const data = JSON.parse(fs.readFileSync(DB_PATH, 'utf-8'));

const generateBody = (id, zh) => {
  if (id === 'ca-ccus-itc') {
    return `## 1. 政策背景
加拿大 CCUS 投资税收抵免 (ITC) 是加政府实现 2030 年减排目标及 2050 净零排放的核心经济杠杆。该政策旨在通过降低高昂的初期资本支出，吸引私人资本进入碳捕集、运输、利用与封存领域。

## 2. 核心激励措施
- **捕集设备**：2022 年至 2030 年间投入使用的项目可获得 50% 的税收抵免；大气直接捕集 (DAC) 高达 60%。
- **运输与封存**：相关基础设施建设可获得 37.5% 的抵免。
- **劳动力要求**：享受全额抵免需符合特定的现行工资与学徒比例要求。

## 3. 适用限制
- 明确排除用于“提高石油采收率”(EOR) 的二氧化碳封存项目。
- 仅支持经加拿大环保署认可的地质封存场址。

## 4. 官方链接
如果您需要了解最新申请细则，请访问：[加拿大财政部官方公告](${zh.url})`;
  }

  if (id === 'cn-ccer') {
    return `## 1. 机制定义
中国核证自愿减排机制 (CCER) 是指对我国境内可再生能源、林业碳汇、甲烷利用等项目的温室气体减排效果进行量化核证，并在全国温室气体自愿减排交易市场登记、交易的机制。

## 2. 发展历程
- **2012年**：机制初步建立。
- **2017年**：由于交易量小、个别项目不规范等原因暂停受理。
- **2024年1月**：全国温室气体自愿减排交易市场正式重启，首批纳入造林碳汇、并网光热发电、并网海上风电、红树林营造四个方法学。

## 3. CCUS 与 CCER
目前，监管部门正积极开展 CCUS 专项方法学的编制工作。一旦纳入，CCUS 项目将能通过出售产生的减排量获得直接的市场化收益，显著提升项目的财务可行性。

## 4. 官方链接
权威管理办法请参阅：[生态环境部温室气体自愿减排管理办法](${zh.url})`;
  }

  // 其他政策的通用权威模板
  return `## 政策概览
${zh.description}

## 核心要点
- **实施年份**：${zh.year}
- **政策类型**：${zh.category}
- **当前状态**：${zh.status === 'Active' ? '正式施行' : '即将施行'}

## 战略影响
该政策为 ${zh.country} 在 ${zh.tags.join('、')} 等关键环节提供了法律与经济支撑，是全球 CCUS 监管版图中的重要组成部分。

${zh.url ? `## 官方入口
[点击查看政策原文及权威解读](${zh.url})` : ''}`;
};

data.policies.forEach(policy => {
  const { id, zh, en } = policy;
  if (zh) {
    const content = `---
title: "${zh.title}"
country: "${zh.country}"
year: ${zh.year}
status: "${zh.status || 'Active'}"
category: "${zh.category}"
tags: ${JSON.stringify(zh.tags || [])}
description: "${zh.description.replace(/"/g, '"')}"
pubDate: "${zh.pubDate || '2024-01-01'}"
url: "${zh.url || ''}"
---

${generateBody(id, zh)}
`;
    fs.writeFileSync(path.join(OUTPUT_DIR_ZH, `${id}.md`), content, 'utf8');
  }

  if (en) {
    const content = `---
title: "${en.title}"
country: "${en.country}"
year: ${en.year}
status: "${en.status || 'Active'}"
category: "${en.category}"
tags: ${JSON.stringify(en.tags || [])}
description: "${en.description.replace(/"/g, '"')}"
pubDate: "${en.pubDate || '2024-01-01'}"
url: "${en.url || ''}"
---

## Overview
${en.description}

## Key Features
- **Year**: ${en.year}
- **Category**: ${en.category}
- **Impact Areas**: ${en.tags.join(', ')}

${en.url ? `## Official Link
[Access Primary Source](${en.url})` : ''}
`;
    fs.writeFileSync(path.join(OUTPUT_DIR_EN, `${id}.md`), content, 'utf8');
  }
});

console.log('Rebuild Complete. Encoding: UTF-8 (No BOM). Removed Field ID internal notes.');
