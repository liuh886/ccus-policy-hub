# Agent-ready context data: scope index

本规格遵循 [产品边界](PRODUCT_BOUNDARIES.md)，接口契约见
[context-layer-functional-spec.md](context-layer-functional-spec.md)。
任务、依赖、实施状态只在 [主路线图](ROADMAP.md) 维护，本文件不是第二份待办。

首个数据消费样例为 `us_45q_context_consumption`：外部消费者从公开 manifest
发现静态 JSON/Markdown，校验 schema、来源引用、版本、语言和缺口。
本站不实现问答 Agent、答案评测、项目资格判断或税额计算。

## 现有基线与依赖

主干 `aa68b45f`：130 条政策、1,110 条设施、65 份国家概况；
4,796 条政策设施关联包括 4,287 条 country 和 509 条 subnational_region，
sector/evidence 均为 0。地方匹配不等于已核验项目法律适用性。

- #105 定义唯一产品边界和主路线图，本规格以其为前提。
- #102 是数据口径、来源维护和翻译基础，feature branch 不等于主干或公开发布。
- #103 提供待审的静态 bundle、索引、schema、CLI 和生成检查。
- #104 只以一份历史官方原文验证版本和定位路径，不预设新表或重复正文存储。

## 架构停止点

复用 SQLite 已接受事实、Git 哈希固定的原文输入及现有只读发布管线。
先验证静态消费闭环；没有实际多文档查询或维护瓶颈，不增加存储层。
人工复核未完成时，锚点保留 draft，消费者必须看见缺口。
2024 法典快照不能证明当前法律状态。

条件记录只有在确有可复用数据需求时才单独设计；不推进批量条件卡或判定引擎。
MCP、图谱、向量库及服务层均非预设交付项。
