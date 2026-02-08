const fs = require('fs');

const polishData = {
  'cn-national-standards': `## 1. 2026 实施背景
中国 CCUS 12 项国家标准 (GB/T 46870.1~46880) 是由国家标准委于 2025 年底发布，标志着中国 CCUS 迈入“有标可依”的工业化阶段。

## 2. 核心技术指标
- **捕集端**：GB/T 46870.1 定义了电厂燃烧后捕集的性能评估边界，要求捕集率与能耗必须经过第三方现场试验验证。
- **封存端**：GB/T 46878 (地质封存) 强制要求建立 AoR (影响范围) 动态监测机制。
- **品质要求**：GB/T 46875 规定了进入长输管道的 CO2 杂质阈值，以防止超临界状态下的管壁腐蚀。

## 3. 对集群项目的意义
这些标准为集群化 CCUS 的“交接计量 (Q-02)”与“损耗归属 (Q-04)”提供了国家级技术基准，是数字化 MRV 平台建设的底座。`,

  'us-45q-ira': `## 1. IRA 2022 变革
通过《通胀削减法案》，45Q 税收抵免从原来的 50 美元/吨跃升至 85 美元/吨，且将项目开工截止日期延长至 2033 年。

## 2. 激励分级
- **专用封存**：$85/t
- **EOR 利用**：$60/t
- **直接空气捕集 (DAC)**：最高可达 $180/t

## 3. 严谨的 MRV 门槛
获得抵免的前提是必须通过 EPA 的 **Subpart RR** 审核，证明二氧化碳被“永久且安全”地封存于地下。该政策通过经济手段，强制将工程数据转化为可审计的财务凭证。`,

  'japan-ccs-act': `## 1. 立法背景
日本 2024 年通过的《CCS 商业法》旨在为 2030 年实现商业化规模封存提供法律框架。

## 2. 关键创新
- **咸水层许可权**：首次明确了运营商在咸水层进行二氧化碳封存的特许经营权。
- **责任转移机制**：规定在场址关闭并监测一定年限后，剩余地质风险由 JOGMEC (日本石油天然气金属矿物资源机构) 承担。
- **安全性义务**：强制要求运营商提供实时压力与温度数据接口给监管部门。`,

  'ca-ccus-itc': `## 1. 投资税收抵免 (ITC)
加拿大联邦政府通过 ITC 提供高达 50% 的捕集设备成本抵免，旨在降低 CCUS 项目的沉没成本。

## 2. 排除条款
与美国不同，加拿大 ITC 明确将 EOR (提高石油采收率) 项目排除在补贴范围之外，体现了其对“纯减排”路径的政策偏好。

## 3. DQI 要求
申请 ITC 的项目必须提交详尽的 **Knowledge Sharing** 报告，披露其监测技术方案与实际封存效果。`
};

Object.entries(polishData).forEach(([id, body]) => {
  const filePath = `./src/content/policies/zh/${id}.md`;
  if (fs.existsSync(filePath)) {
    let content = fs.readFileSync(filePath, 'utf-8');
    const parts = content.split('---');
    if (parts.length >= 3) {
      const newContent = `${parts[0]}---${parts[1]}---

${body}
`;
      fs.writeFileSync(filePath, newContent, 'utf-8');
      console.log(`Polished: ${id}`);
    }
  }
});
