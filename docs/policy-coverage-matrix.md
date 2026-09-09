# Policy coverage matrix

As of **2026-09-09**. This matrix is a curated research control backed by policy IDs in the SQLite single source of truth. A missing entry means the database has no verified direct record for that function; it does not prove that no policy exists.

## Summary

- Jurisdictions: **5**
- Governance dimensions: **5**
- Covered cells: **15**
- Partial cells: **10**
- Missing cells: **0**
- High-priority missing cells: **0**
- Audit result: **PASS**

## Matrix

| Jurisdiction   | Legal and regulatory basis | Incentives and finance | Storage and permitting | CO2 transport and market access | MRV and accounting |
| -------------- | -------------------------- | ---------------------- | ---------------------- | ------------------------------- | ------------------ |
| United States  | ✅ Covered                 | ✅ Covered             | ✅ Covered             | ⚠️ Partial                      | ✅ Covered         |
| United Kingdom | ✅ Covered                 | ✅ Covered             | ✅ Covered             | ✅ Covered                      | ⚠️ Partial         |
| South Korea    | ✅ Covered                 | ⚠️ Partial             | ✅ Covered             | ⚠️ Partial                      | ✅ Covered         |
| Netherlands    | ✅ Covered                 | ✅ Covered             | ✅ Covered             | ⚠️ Partial                      | ✅ Covered         |
| China          | ⚠️ Partial                 | ⚠️ Partial             | ⚠️ Partial             | ⚠️ Partial                      | ⚠️ Partial         |

## Research gaps and partial coverage

- **United States — CO2 transport and market access** · high priority · partial. CIFIA supplies dedicated federal finance for shared common-carrier CO2 transport infrastructure, while broader tariff, access and market-governance rules are not represented as a single national framework. Evidence: `us-iija-hubs`.
- **United Kingdom — MRV and accounting** · medium priority · partial. The legal and contractual frameworks require metering and verified storage, while a dedicated cross-chain accounting record is not separately captured. Evidence: `uk-energy-act-2023`, `uk-industrial-carbon-capture-business-model-2025`.
- **South Korea — Incentives and finance** · medium priority · partial. The CCUS Act funds demos, clusters, R&D and loans (plus the 2026 carbon-neutrality loan programme), but no dedicated regulated-revenue or universal CCUS incentive exists. Evidence: `kr-ccus-act`.
- **South Korea — CO2 transport and market access** · medium priority · partial. Transport approvals, pipeline safety and inspections are operationalized, but dedicated network-access and tariff rules are not separately recorded. Evidence: `kr-ccus-act`, `kr-ccus-act-enforcement-decree-2025`.
- **Netherlands — CO2 transport and market access** · medium priority · partial. Porthos TSA fees with third-party assignment plus the Aramis open-access trunkline and SDE++ T&S allowances provide working access and tariff practice, but no national tariff schedule or shipping framework exists. Evidence: `nl-porthos-sde-subsidy`.
- **China — Legal and regulatory basis** · high priority · partial. National standards and sectoral carbon-market rules provide components, but China does not yet have a dedicated national CCS permitting and liability law. Evidence: `cn-standards-2024`, `cn-national-ets-expansion-2025`, `cn-ccus-national-standards-2026`.
- **China — Incentives and finance** · high priority · partial. Central-bank and demonstration support can finance eligible low-carbon projects, but a dedicated CCUS revenue mechanism is not established. Evidence: `cn-pboc-cerf`, `cn-demo-tech-2024`.
- **China — Storage and permitting** · high priority · partial. The 12 national standards (GB/T 46878 storage lifecycle, MEE risk guideline, EIA classification) provide technical components, but pore-space rights, injection licensing, closure and long-term liability still have no dedicated national rules. Evidence: `cn-ccus-national-standards-2026`.
- **China — CO2 transport and market access** · high priority · partial. An operating dense-phase trunk line, the GB/T pipeline-quality standard and a funded long-distance demonstration exist, but third-party access, tariffs and shipping rules are still absent. Evidence: `cn-co2-transport-status-2025`.
- **China — MRV and accounting** · high priority · partial. Standards and ETS MRV capacity are developing, but a complete cross-chain CCUS accounting framework is not yet recorded. Evidence: `cn-standards-2024`, `cn-national-ets-expansion-2025`, `cn-ccus-national-standards-2026`.

## Governance rules

1. Coverage status is curated from official-source review and is not inferred from policy category or keyword matching.
2. Every covered or partial cell must cite one or more policy IDs that exist in SQLite.
3. Covered cells may use only policies whose review status is `verified`.
4. A new policy should close or materially improve a documented gap; policy count alone is not a success metric.
5. Facilities, capacities and coordinates are outside this audit and must not be modified by coverage maintenance.
6. Update SQLite first, regenerate policy artifacts, then refresh this matrix.
