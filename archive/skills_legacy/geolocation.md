# Skill: CCUS Geolocation & Spatial Integrity

本技能用于治理 CCUS 设施的空间数据质量，确保全球设施在地图上的位置具有逻辑严密性和事实准确性。

## 1. 空间校验四级逻辑 (Four-Tier Validation)

治理系统必须按以下优先级顺序进行地理位置初判与精修：

### Tier 1: 国家级边界校验 (Country-Level Baseline)
*   **目标**：确保设施至少落在所属国家领土内。
*   **依据**：国家行政边界 Bounding Box。
*   **治理规则**：如果设施坐标超出国家边界，系统必须将其重置为该国地理中心点，并标记为 `precision: approximate`。

### Tier 2: 设施名深度推理 (Facility-Name Reasoning)
*   **目标**：通过名称提取地理线索。
*   **方法**：
    *   识别地标：如 "Dunkirk" (敦刻尔克), "Wyoming" (怀俄明)。
    *   识别企业：如 "Sinopec Qilu" -> 定位至齐鲁石化厂区。
*   **操作**：利用外部 API (如 OpenStreetMap / Google Geocoding) 结合名称关键字获取初步经纬度。

### Tier 3: 行政区划对齐 (Administrative Alignment)
*   **目标**：坐标必须与 `region` 或 `location` 字段描述的省/市一致。
*   **治理规则**：如果 `location` 字段为“广东省”，但坐标显示在“福建省”，系统应触发 `Spatial Conflict` 警告，并以行政区划描述为准重新定位。

### Tier 4: 精确厂区定位 (Site-Specific Precision)
*   **目标**：定位至具体的工业园区或封存井口。
*   **依据**：卫星地图目测或官方项目公告。
*   **治理规则**：达到此精度后，方可标记为 `precision: precise`。

---

## 2. 自动抖动规则 (Anti-Stacking / Jitter)

为了防止多个设施因坐标相同（如都定位在市中心）而在地图上重叠不可点：
*   **逻辑**：对经纬度应用 `±0.02` 度（约 2-3 公里）的随机偏移。
*   **触发条件**：当两个或以上设施的原始坐标完全相同时。

---

## 3. 坏数据黑名单 (Spatial Blacklist)

严禁出现以下坐标，出现即视为“待治理”：
*   `[0, 0]` (Null Island)
*   `[35, 105]` (中国默认几何中心点，通常代表未精修)
*   所有落入公海且未标记为 "Offshore" 的坐标。
