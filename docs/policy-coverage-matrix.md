# Policy coverage matrix

As of **2026-07-22**. This matrix is a curated research control backed by policy IDs in the SQLite single source of truth. A missing entry means the database has no verified direct record for that function; it does not prove that no policy exists.

## Summary

- Jurisdictions: **5**
- Governance dimensions: **5**
- Covered cells: **9**
- Partial cells: **11**
- Missing cells: **5**
- High-priority missing cells: **3**
- Audit result: **PASS**

## Matrix

| Jurisdiction    | Legal and regulatory basis | Incentives and finance | Storage and permitting | CO2 transport and market access | MRV and accounting |
| --------------- | -------------------------- | ---------------------- | ---------------------- | ------------------------------ | ------------------ |
| United States   | ✅ Covered                  | ✅ Covered              | ✅ Covered              | ⚠️ Partial                     | ✅ Covered         |
| United Kingdom  | ✅ Covered                  | ❌ Missing              | ✅ Covered              | ⚠️ Partial                     | ⚠️ Partial         |
| South Korea     | ✅ Covered                  | ❌ Missing              | ⚠️ Partial             | ⚠️ Partial                     | ⚠️ Partial         |
| Netherlands     | ⚠️ Partial                 | ✅ Covered              | ⚠️ Partial             | ❌ Missing                     | ✅ Covered         |
| China           | ⚠️ Partial                 | ⚠️ Partial             | ❌ Missing             | ❌ Missing                     | ⚠️ Partial         |

## Research gaps and partial coverage

- **United States — CO2 transport and market access** · high priority · partial. Federal infrastructure funding supports CO2 transport, but the database does not yet isolate the CIFIA programme as a dedicated transport-finance policy. Evidence: `us-iija-hubs`.
- **United Kingdom — Incentives and finance** · high priority · missing. The database lacks a dedicated record for the Industrial Carbon Capture business model and related contractual support.
- **United Kingdom — CO2 transport and market access** · high priority · partial. The market vision proposes a network code, but the code remains a planned governance component rather than a final rule. Evidence: `uk-ccs-network-code`, `uk-ccus-vision`.
- **United Kingdom — MRV and accounting** · medium priority · partial. The legal framework supports regulated operations, but a dedicated cross-chain accounting and verification record is not separately captured. Evidence: `uk-energy-act-2023`.
- **South Korea — Incentives and finance** · medium priority · missing. No dedicated, verified CCUS incentive or regulated-revenue policy is currently recorded.
- **South Korea — Storage and permitting** · high priority · partial. The Act creates the framework, while detailed implementation and permitting rules require further policy-level review. Evidence: `kr-ccus-act`.
- **South Korea — CO2 transport and market access** · medium priority · partial. Transport is within the Act's scope, but dedicated network-access and tariff rules are not separately recorded. Evidence: `kr-ccus-act`.
- **South Korea — MRV and accounting** · high priority · partial. The statutory framework recognizes CCUS operations, but detailed accounting and verification rules need further review. Evidence: `kr-ccus-act`.
- **Netherlands — Legal and regulatory basis** · high priority · partial. The EU CCS Directive supplies the supranational legal basis, but Dutch implementing and permitting law is not separately represented. Evidence: `eu-ccs-directive`.
- **Netherlands — Storage and permitting** · high priority · partial. EU storage requirements are covered, while the Dutch Mining Act implementation is not separately recorded. Evidence: `eu-ccs-directive`.
- **Netherlands — CO2 transport and market access** · medium priority · missing. No dedicated Dutch CO2 transport, network-access or tariff policy record is currently mapped.
- **China — Legal and regulatory basis** · high priority · partial. National standards and sectoral carbon-market rules provide components, but China does not yet have a dedicated national CCS permitting and liability law. Evidence: `cn-standards-2024`, `cn-national-ets-expansion-2025`.
- **China — Incentives and finance** · high priority · partial. Central-bank and demonstration support can finance eligible low-carbon projects, but a dedicated CCUS revenue mechanism is not established. Evidence: `cn-pboc-cerf`, `cn-demo-tech-2024`.
- **China — Storage and permitting** · high priority · missing. No dedicated national policy record currently governs pore-space rights, injection licensing, closure and long-term storage liability.
- **China — CO2 transport and market access** · high priority · missing. No dedicated national CO2 pipeline, shipping, third-party access or tariff framework is currently recorded.
- **China — MRV and accounting** · high priority · partial. Standards and ETS MRV capacity are developing, but a complete cross-chain CCUS accounting framework is not yet recorded. Evidence: `cn-standards-2024`, `cn-national-ets-expansion-2025`.

## Governance rules

1. Coverage status is curated from official-source review and is not inferred from policy category or keyword matching.
2. Every covered or partial cell must cite one or more policy IDs that exist in SQLite.
3. Covered cells may use only policies whose review status is `verified`.
4. A new policy should close or materially improve a documented gap; policy count alone is not a success metric.
5. Facilities, capacities and coordinates are outside this audit and must not be modified by coverage maintenance.
6. Update SQLite first, regenerate policy artifacts, then refresh this matrix.
