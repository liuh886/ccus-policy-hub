# Policy Lifecycle Link Projection Cleanup — July 2026

Date: 2026-07-21

## Purpose

This pass closes the remaining projection gap after the Japan, Malaysia and European Union policy lifecycle families were consolidated in SQLite. The canonical policy records and the `policy_facility_links` table were already correct, but a limited set of facility Markdown files still displayed policy IDs that had been deleted as lifecycle aliases.

## Lifecycle decisions confirmed

| Family | Canonical policy | Consolidated aliases | Current judgement |
| --- | --- | --- | --- |
| Japan CCS Business Act | `jp-ccs-business-act-2024` | `japan-ccs-act`; `jp-meti-specified-zones-2024` | One primary Act with staged implementation milestones, including full enforcement on 22 May 2026 |
| Malaysia CCUS Act | `my-ccus-act-2025` | `my-ccus-bill-2025`; `my-offshore-ccs-reg-2025`; `my-ccs-framework` | Act 870 is the canonical federal framework; the bill and generic framework records are lifecycle aliases rather than independent active policies |
| EU CCS Directive | `eu-ccs-directive` | `eu-ccs-directive-2009` | Directive 2009/31/EC remains the canonical legal instrument; the duplicate year-suffixed ID is not a separate policy |

## Primary-source verification

- Japan METI confirmed the staged implementation of the Act on Carbon Dioxide Storage Businesses and set 22 May 2026 as the full enforcement date.
- Malaysia's official MyCCUS implementation record identifies the Carbon Capture, Utilisation and Storage Act 2025 as Act 870, gazetted on 1 August 2025 and effective from 1 October 2025.
- EUR-Lex identifies Directive 2009/31/EC as in force and provides the consolidated text current to 24 December 2018.

## Projection repair

The repair used SQLite `policy_facility_links` as the sole relationship source and changed only the relationship arrays in generated surfaces.

- Unique facilities repaired: **25**
- English facility Markdown files repaired: **25**
- Chinese facility Markdown files repaired: **25**
- Public facility JSON mismatches: **0**
- SQLite relationship changes: **0**

Removed stale alias references across bilingual Markdown:

- `japan-ccs-act`: **42** references
- `jp-meti-specified-zones-2024`: **42** references
- `my-ccs-framework`: **8** references
- `my-ccus-bill-2025`: **8** references
- `my-offshore-ccs-reg-2025`: **8** references

No new policy relationship was invented. Each stale alias was removed because its relationship had already been transferred to the canonical policy in SQLite.

## Frozen fields

The repair did not modify:

- the SQLite database;
- policy count or policy content;
- facility count or status;
- announced or estimated capacity;
- coordinates or precision;
- partners or source links;
- facility descriptions or other narrative fields.

## Permanent control

`sync-policy-link-projections.mjs` now provides:

1. a read-only audit mode that fails when facility relationship projections diverge from SQLite;
2. an explicit `--write` repair mode;
3. orphan-link validation for policy and facility IDs;
4. targeted replacement of relationship arrays without regenerating facility facts;
5. idempotency tests.

The read-only audit is included in CI so future policy lifecycle consolidation cannot leave stale facility relationship IDs behind.
