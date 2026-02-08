# CCUS 治理体系评估协议 (FSRTM 4.7)

## 1. 全字段入库解析逻辑 (Data Parsing Logic)
每项新政策必须完成以下 20+ 个字段的“地毯式扫描”：

| 字段类别 | 关键字段 | 解析要求 |
| :--- | :--- | :--- |
| **治理DNA** | analysis.[f,s,r,t,m] | 严禁平庸值，不涉及维度强制清零 |
| **法律支柱** | pore_space_rights | 必须明确地权属性，不可模糊 |
| **法律支柱** | liability_transfer | 必须包含年限，如 "20 years post-closure" |
| **关键技术** | mrv_rigor | 必须与分析项 T 维度保持强一致性 |
| **经济定量** | incentive_usd_per_ton | 必须进行货币与单位折算，统一为 $/t |
| **身份溯源** | legal_citation | 必须符合机构引用规范，附带 Ref 链接 |

## 2. 治理红线
1. **禁止默认填充**: 严禁在 `pore_space_rights` 等关键字段填入 "TBD" 或 "None" 以外的无意义占位符。
2. **强制双语镜像**: JSON 中的 `zh` 块和 `en` 块必须在同一生命周期内完成全字段翻译。
3. **数据库优先**: 任何前端页面 (MD) 展示的改动必须追溯至 JSON 字段的新增。