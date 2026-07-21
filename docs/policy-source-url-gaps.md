# Policy source and URL gap audit

Generated from the SQLite single source of truth on 2026-07-21T11:47:09.140Z.

## Summary

- Records with at least one gap: **29**
- Missing source labels: **10**
- Missing URLs: **29**
- Missing both source and URL: **10**
- Verified records with gaps: **28**
- Draft records with gaps: **1**

## Verified records

| ID                                  | Country              | Year | Review   | Gap                    | English title                                                                           | Current source             |
| ----------------------------------- | -------------------- | ---: | -------- | ---------------------- | --------------------------------------------------------------------------------------- | -------------------------- |
| `au-offshore-ghg-act`               | Australia            | 2023 | verified | missing_source_and_url | Australia Offshore GHG Storage Act                                                      | —                          |
| `au-safeguard-mechanism`            | Australia            | 2023 | verified | missing_url            | Australia Safeguard Mechanism 2023                                                      | DCCEEW                     |
| `br-bill-1425-2022`                 | Brazil               | 2024 | verified | missing_source_and_url | Brazil Bill 1425/2022 (CCS Framework)                                                   | —                          |
| `alberta-tier`                      | Canada               | 2023 | verified | missing_url            | Alberta TIER System & CCS Incentives                                                    | 阿尔伯塔省政府             |
| `cn-ccus-roadmap-2025`              | China                | 2025 | verified | missing_url            | China CCUS Technology Development Roadmap (2025)                                        | NDRC/ACCA21                |
| `cn-demo-tech-2024`                 | China                | 2024 | verified | missing_url            | Implementation Plan for Green and Low-Carbon Advanced Technology Demonstration Projects | NDRC/MEE                   |
| `cn-standards-2024`                 | China                | 2024 | verified | missing_url            | Batch Release of CCUS National Standards (2024)                                         | NDRC/SAMR                  |
| `cn-zero-carbon-parks`              | China                | 2024 | verified | missing_url            | China Zero-Carbon Industrial Park Guidelines                                            | 工业和信息化部             |
| `cn-pboc-cerf`                      | China                | 2021 | verified | missing_url            | PBOC Carbon Emission Reduction Facility (CERF)                                          | 中国人民银行               |
| `eu-innovation-fund`                | European Union       | 2024 | verified | missing_url            | EU Innovation Fund                                                                      | 欧盟委员会                 |
| `eu-cbam`                           | European Union       | 2023 | verified | missing_url            | EU Carbon Border Adjustment Mechanism (CBAM)                                            | European Parliament        |
| `fr-ccus-roadmap`                   | France               | 2024 | verified | missing_source_and_url | France National CCUS Roadmap 2024                                                       | —                          |
| `de-icm-strategy`                   | Germany              | 2024 | verified | missing_source_and_url | Germany Industrial Carbon Management Strategy                                           | —                          |
| `is-cdr-framework`                  | Iceland              | 2024 | verified | missing_source_and_url | Iceland CDR & Mineralization Framework                                                  | —                          |
| `verra-vm0049`                      | International        | 2024 | verified | missing_url            | Verra CCS Methodology (VM0049)                                                          | Verra                      |
| `gold-standard`                     | International        | 2023 | verified | missing_url            | Gold Standard Engineering CDR Requirements                                              | Gold Standard              |
| `ipcc-guidelines`                   | International        | 2019 | verified | missing_url            | IPCC GHG Inventory Guidelines (2019 Refinement)                                         | IPCC                       |
| `iso-standards`                     | International        | 2019 | verified | missing_url            | ISO CCUS Standards (TC 265)                                                             | ISO TC265                  |
| `puro-earth`                        | International        | 2019 | verified | missing_url            | Puro.earth CDR Certification (CORC)                                                     | Puro.earth                 |
| `norway-longship`                   | Norway               | 2024 | verified | missing_url            | Norway 'Longship' CCS Project                                                           | 挪威政府 / Gassnova        |
| `kr-ccus-act`                       | South Korea          | 2024 | verified | missing_url            | South Korea CCUS Act                                                                    | 韩国产业通商资源部 (MOTIE) |
| `ae-carbon-strategy`                | United Arab Emirates | 2023 | verified | missing_source_and_url | UAE National Net Zero 2050 Strategy                                                     | —                          |
| `uk-ccs-network-code`               | United Kingdom       | 2024 | verified | missing_source_and_url | UK CO2 T&S Network Code                                                                 | —                          |
| `uk-ccus-vision`                    | United Kingdom       | 2023 | verified | missing_url            | UK CCUS Vision (2035 Strategy)                                                          | 英国能源安全与净零部       |
| `us-obbba-45q-2025`                 | United States        | 2025 | verified | missing_source_and_url | USA One Big Beautiful Bill Act (OBBBA) and 45Q Enhancement 2025                         | —                          |
| `us-doe-carbon-management-strategy` | United States        | 2024 | verified | missing_source_and_url | US DOE Carbon Management Strategy                                                       | —                          |
| `us-45q-ira`                        | United States        | 2022 | verified | missing_url            | US 45Q Tax Credit (IRA Enhanced)                                                        | IRS / EPA                  |
| `us-iija-hubs`                      | United States        | 2021 | verified | missing_url            | US IIJA CCS Hubs Program                                                                | 美国能源部 (DOE)           |

## Draft records

| ID                             | Country | Year | Review | Gap                    | English title                                                               | Current source |
| ------------------------------ | ------- | ---: | ------ | ---------------------- | --------------------------------------------------------------------------- | -------------- |
| `no-14th-licensing-round-2025` | Norway  | 2025 | draft  | missing_source_and_url | Norway 14th Offshore Storage Licensing Round and 2025 Regulatory Guidelines | —              |

## Other review states

_None._

## Remediation rule

1. Prefer the official law, regulation, ministry, regulator, standards body, or programme page.
2. Use an official gazette or consolidated legal text when available.
3. Do not mark a record verified solely because a homepage URL exists.
4. Keep the field blank and document the gap when no authoritative source can be confirmed.
5. Update SQLite first, then regenerate bilingual Markdown, quality metrics, and public JSON.
