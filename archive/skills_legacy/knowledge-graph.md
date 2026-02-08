# CCUS 智力关联与神经网络治理技能

## 1. 神经网络规则
* **双向对齐**: 设施关联政策 A，则政策 A 必须反向列出该设施。该逻辑由 `scripts/fix-relationships.cjs` 自动维护。
* **治理底座 (The Foundation)**: 
  - 所有设施必须强制关联 `iso-standards` 和 `ipcc-guidelines`。
  - 国家核心政策（如美国 45Q）必须自动挂载至该国所有设施。

## 2. 智力矩阵 (Intelligence Matrix)
* **维度对齐**: 跨国政策对比必须基于 PLR 3.0 的 5 大指标：Incentive, Statutory, Liability, MRV, Market。
* **标杆推导**: 相似行业（Sector）的项目应在前端 UI 自动推导相关的 Benchmarking 政策。
