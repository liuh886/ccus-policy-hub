# Policy content-depth report

As of **2026-09-09**. This audit evaluates the explanatory depth of policy records in SQLite. It does not judge whether a policy is substantively strong; it tests whether the page explains the instrument with enough bilingual, analytical and lifecycle context.

## Summary

- Policies assessed: **129**
- Critical: **0**
- High: **5**
- Medium: **36**
- Healthy: **88**
- Verified policies needing improvement: **41**
- Median score: **100/100**

## Priority queue

| Score | Severity | Policy                                                                                               | Jurisdiction         | Review   | Main gaps                                                                                  |
| ----: | -------- | ---------------------------------------------------------------------------------------------------- | -------------------- | -------- | ------------------------------------------------------------------------------------------ |
|    45 | high     | `it-law-11-2024-modernization` — Law 11/2024 - CCUS Regulatory Modernization                         | Italy                | verified | missing-or-thin-scope, incomplete-impact-analysis, missing-evolution                       |
|    59 | high     | `denmark-ccfd` — Denmark Negative Emission Carbon Capture and Storage (NECCS) Fund & CCfD            | Denmark              | verified | short-en-description, missing-or-thin-scope, missing-evolution                             |
|    62 | high     | `ca-sk-ccs-directives` — Saskatchewan CCS Regulatory Directives                                      | Canada               | verified | missing-or-thin-scope, incomplete-impact-analysis, missing-evolution, placeholder-analysis |
|    62 | high     | `ro-law-114-2013-ccs` — Romania Law 114/2013 on CO2 Storage                                          | Romania              | verified | missing-or-thin-scope, missing-evolution, placeholder-analysis, thin-analysis-evidence     |
|    64 | high     | `hr-hydrocarbon-act-ccs` — Croatia Hydrocarbon Act (CCS Amendments)                                  | Croatia              | verified | missing-or-thin-scope, missing-evolution, placeholder-analysis, thin-analysis-evidence     |
|    65 | medium   | `cn-mee-env-guidance-2024` — China MEE Guidance on CCUS Environmental Oversight (2024 Update)        | China                | verified | missing-or-thin-scope, missing-evolution, placeholder-analysis, thin-analysis-evidence     |
|    65 | medium   | `eu-ccs-directive` — EU Directive 2009/31/EC on the Geological Storage of Carbon Dioxide             | European Union       | verified | missing-or-thin-scope, missing-evolution, placeholder-analysis                             |
|    65 | medium   | `imo-marpol-occs-2024` — IMO Onboard Carbon Capture & Storage (OCCS) Framework                       | International        | verified | missing-or-thin-scope, missing-evolution, placeholder-analysis, thin-analysis-evidence     |
|    65 | medium   | `vn-decree-119-2025` — Vietnam Decree 119/2025: GHG & Carbon Management                              | Vietnam              | verified | missing-or-thin-scope, missing-evolution, placeholder-analysis, thin-analysis-evidence     |
|    67 | medium   | `cn-miit-industrial-plan-2022` — China MIIT Action Plan for Industrial Carbon Peaking                | China                | verified | missing-or-thin-scope, missing-evolution, placeholder-analysis                             |
|    67 | medium   | `eu-crcf-2024` — EU Carbon Removal Certification Framework (CRCF)                                    | European Union       | verified | missing-or-thin-scope, missing-evolution, placeholder-analysis, thin-analysis-evidence     |
|    67 | medium   | `jp-ccs-business-act-2024` — Japan Act on Carbon Dioxide Storage Businesses (CCS Business Act)       | Japan                | verified | missing-or-thin-scope                                                                      |
|    67 | medium   | `no-tax-deduction-ccs` — Norway Petroleum Tax Act: CCS Deduction & Exemptions                        | Norway               | verified | missing-or-thin-scope, missing-evolution, placeholder-analysis, thin-analysis-evidence     |
|    67 | medium   | `us-la-primacy-rules` — Louisiana Class VI Primacy Administrative Rules                              | United States        | verified | missing-or-thin-scope, missing-evolution, placeholder-analysis, thin-analysis-evidence     |
|    67 | medium   | `us-nd-century-code-38-22` — North Dakota Century Code Chapter 38-22 (CCS Act)                       | United States        | verified | missing-or-thin-scope, missing-evolution, placeholder-analysis, thin-analysis-evidence     |
|    68 | medium   | `cn-gd-carbon-inclusive` — Guangdong Carbon Inclusive & CCUS Offset Rules 2024                       | China                | verified | missing-or-thin-scope, missing-evolution, placeholder-analysis                             |
|    68 | medium   | `tx-hb-1284-ccus` — Texas HB 1284: CCS Jurisdictional Act                                            | United States        | verified | missing-or-thin-scope, missing-evolution, placeholder-analysis                             |
|    69 | medium   | `cn-js-industrial-decarb-2022` — Jiangsu Province Industrial Green Transformation Action Plan (CCUS) | China                | verified | missing-or-thin-scope, missing-evolution, placeholder-analysis                             |
|    69 | medium   | `cn-sd-eco-plan-14fym` — Shandong 14th Five-Year Plan for Eco-Protection (CCUS)                      | China                | verified | missing-or-thin-scope, missing-evolution, placeholder-analysis                             |
|    69 | medium   | `icao-corsia-ccu-2024` — ICAO CORSIA Carbon Offsetting & CCU Fuel Rules (2024)                       | International        | verified | missing-or-thin-scope, missing-evolution, placeholder-analysis                             |
|    69 | medium   | `intl-gcca-net-zero-2050` — GCCA 2050 Cement & Concrete Industry Roadmap for Net Zero                | International        | verified | missing-or-thin-scope, missing-evolution, placeholder-analysis                             |
|    70 | medium   | `au-offshore-ghg-safety-2024` — Australia Offshore GHG Storage (Safety) Regulations 2024             | Australia            | verified | missing-or-thin-scope, missing-evolution, placeholder-analysis                             |
|    70 | medium   | `ca-sk-spii` — Saskatchewan Petroleum Innovation Incentive (SPII)                                    | Canada               | verified | missing-or-thin-scope, missing-evolution, placeholder-analysis                             |
|    70 | medium   | `cn-hb-ets-offset` — Hubei ETS Carbon Offset Rules (CCUS Provisions)                                 | China                | verified | missing-or-thin-scope, missing-evolution, placeholder-analysis                             |
|    70 | medium   | `intl-ccs-plus-framework` — CCS+ Initiative: Global Carbon Accounting Framework                      | International        | verified | missing-or-thin-scope, missing-evolution, placeholder-analysis                             |
|    70 | medium   | `intl-paris-art-6-4-ccs` — Paris Agreement Article 6.4 Mechanism (CCS & CDR Standards)               | International        | verified | missing-or-thin-scope, missing-evolution, placeholder-analysis                             |
|    70 | medium   | `jp-jogmec-advanced-ccs-2024` — Japan JOGMEC Advanced CCS Projects Support Program                   | Japan                | verified | missing-or-thin-scope, missing-evolution, placeholder-analysis                             |
|    70 | medium   | `nl-porthos-sde-subsidy` — Netherlands Porthos SDE++ Operational Subsidy                             | Netherlands          | verified | missing-or-thin-scope, missing-evolution, placeholder-analysis                             |
|    72 | medium   | `ca-ab-sequestration-tenure` — Alberta CO2 Sequestration Tenure Framework                            | Canada               | verified | missing-or-thin-scope, missing-evolution                                                   |
|    72 | medium   | `eu-ets-mrr-2018` — EU ETS Monitoring and Reporting Regulation (MRR) 2024 Revision                   | European Union       | verified | missing-or-thin-scope, missing-evolution                                                   |
|    72 | medium   | `eu-nzia` — EU Net-Zero Industry Act (NZIA)                                                          | European Union       | verified | missing-or-thin-scope, missing-evolution                                                   |
|    72 | medium   | `id-presidential-reg-14-2024` — Indonesia Presidential Regulation No. 14/2024 (CCS Framework)        | Indonesia            | verified | missing-or-thin-scope, missing-evolution                                                   |
|    72 | medium   | `in-ccus-roadmap` — India National CCUS R&D and Deployment Roadmap (2025-2045)                       | India                | verified | missing-or-thin-scope, missing-evolution                                                   |
|    72 | medium   | `netherlands-sde` — Netherlands SDE++ Climate Transition Incentive Scheme                            | Netherlands          | verified | missing-or-thin-scope, missing-evolution                                                   |
|    72 | medium   | `no-storage-framework` — Norway CO2 Storage & Transport Regulations (Offshore)                       | Norway               | verified | missing-or-thin-scope, missing-evolution                                                   |
|    72 | medium   | `sa-megi-ccus` — Saudi Circular Carbon Economy (CCE) & Jubail CCS Hub Strategy                       | Saudi Arabia         | verified | missing-or-thin-scope, missing-evolution                                                   |
|    72 | medium   | `th-boi-incentives` — Thailand BOI CCUS Investment Promotion Incentives                              | Thailand             | verified | missing-or-thin-scope, missing-evolution                                                   |
|    72 | medium   | `uae-adnoc-ccs-2030` — ADNOC 2030 Carbon Capture & Decarbonization Strategy                          | United Arab Emirates | verified | missing-or-thin-scope, missing-evolution                                                   |
|    72 | medium   | `uk-energy-act-2023` — UK Energy Act 2023 (CCUS Economic Regulation)                                 | United Kingdom       | verified | missing-or-thin-scope, missing-evolution                                                   |
|    75 | medium   | `my-ccus-act-2025` — Malaysia Carbon Capture, Utilisation and Storage Act 2025 (Act 870)             | Malaysia             | verified | missing-or-thin-scope                                                                      |

## Scoring principles

1. Both English and Chinese descriptions should explain the instrument, mechanism, implementation boundary and CCUS relevance.
2. Scope, tags, three-part impact analysis and lifecycle milestones should be populated where the official source supports them.
3. Five governance-analysis dimensions should contain policy-specific evidence rather than migration placeholders.
4. Regulatory subfields are reported but not universally required because not every strategy, incentive or standard is a permitting instrument.
5. A low score is a curation priority, not evidence that the underlying policy is weak or invalid.
