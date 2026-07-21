# Policy Gap Pass — July 2026

Date: 2026-07-21

## Scope and governing rule

This pass is limited to policy records. SQLite remains the single source of truth. Facilities, facility capacities, countries and coordinates are frozen and must not be changed.

The secondary Chinese summary of the Global CCS Institute's 2025 report is used only as a discovery lead. Every database action below is based on an official primary source.

## Decisions

| Candidate | Database decision | Reason |
| --- | --- | --- |
| Brazil SBCE — Law No. 15,042/2024 | **Add as an independent market-policy record** | It is a separate primary law establishing Brazil's regulated emissions trading system. It defines verified reductions and removals, including direct-air-capture-and-storage technologies, but it does not replace the CCS operating framework in Law No. 14,993/2024. |
| Brazil Fuels of the Future Act — Law No. 14,993/2024 | **Correct existing record** | The existing record contains a law-number typo and incorrectly embeds SBCE claims in the Act's description and MRV assessment. The Act instead establishes the CCS authorisation and monitoring framework administered by ANP. |
| EU Industrial Carbon Management Strategy — COM(2024) 62 | **Add as a direct strategic CCUS record** | The communication is the EU's dedicated CCS/CCU/carbon-removal roadmap and sets out the policy path toward CO2 transport and storage value chains and a single market for industrial carbon management. |
| EU Clean Industrial Deal — COM(2025) 85 | **Do not add as a separate record in this pass** | It is an overarching industrial strategy. Its CCUS content is material but is better represented as an implementation milestone in the dedicated Industrial Carbon Management Strategy until a distinct legal or implementing instrument warrants separate treatment. |
| China national ETS expansion work plan — MEE 2025 | **Add as a market-policy record** | It is the first operational expansion of the national ETS beyond power, bringing steel, cement and aluminium smelting into the market and creating sector-specific accounting, reporting and verification requirements. Its relevance to CCUS is indirect through carbon pricing and industrial decarbonisation; the record must not imply CCUS credit eligibility. |
| IMO Net-Zero Framework | **Do not add in this pass** | The draft MARPOL amendments were approved at MEPC 83 but formal adoption was adjourned until 2026. The framework is not yet legally binding, and the official text does not establish a sufficiently direct CCUS policy link for inclusion in this focused database pass. |

## Primary sources

### Brazil

- Law No. 14,993/2024 — Fuels of the Future Act: https://www.planalto.gov.br/ccivil_03/_ato2023-2026/2024/lei/l14993.htm
- ANP CCS regulatory overview: https://www.gov.br/anp/pt-br/assuntos/ccs
- Law No. 15,042/2024 — Brazilian Emissions Trading System: https://www.planalto.gov.br/ccivil_03/_ato2023-2026/2024/lei/l15042.htm
- Ministry of Finance SBCE implementation roadmap: https://www.gov.br/fazenda/pt-br/composicao/orgaos/mercado-de-carbono/roteiro-de-implementacao/roteiro-de-implementacao

### European Union

- Industrial Carbon Management Strategy, COM(2024) 62 final: https://eur-lex.europa.eu/legal-content/EN/TXT/?uri=CELEX:52024DC0062
- Clean Industrial Deal, COM(2025) 85 final: https://eur-lex.europa.eu/legal-content/EN/TXT/?uri=CELEX:52025DC0085

### China

- MEE work plan for ETS coverage of steel, cement and aluminium smelting: https://www.mee.gov.cn/xxgk2018/xxgk/xxgk03/202503/t20250326_1104736.html
- MEE official policy Q&A: https://www.mee.gov.cn/ywdt/zbft/202503/t20250326_1104767.shtml

### IMO

- IMO Net-Zero Framework FAQ: https://www.imo.org/en/mediacentre/hottopics/pages/faqs-the-imo-net-zero-framework.aspx
- IMO notice that adoption discussions were adjourned: https://www.imo.org/en/mediacentre/pressbriefings/pages/imo-net-zero-shipping-talks-to-resume-in-2026.aspx

## Expected database effect

- Policies before migration: **124**
- New policies: **3**
- Existing policies corrected: **1**
- Policies after migration: **127**
- Facility records changed: **0**
- Facility-policy links added or removed: **0**
- Coordinates changed: **0**

## Verification requirements

1. Run the migration against SQLite.
2. Export English and Chinese policy Markdown from SQLite.
3. Regenerate `public/data/policies.json`.
4. Confirm exactly 127 policy records across SQLite, English Markdown, Chinese Markdown and public JSON.
5. Run the policy consistency audit, deep database audit, tests, Astro Check and production build.
6. Reject the migration if any facility, country, capacity or coordinate artifact changes.
