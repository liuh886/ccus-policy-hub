# Facility-policy relationship model

Updated: 2026-10-28. SQLite remains the authority for each recorded association.

## Recorded types and interpretation

| Type                 | Current count | Meaning                                                                                                 |
| -------------------- | ------------: | ------------------------------------------------------------------------------------------------------- |
| `country`            |         4,287 | Shared country; jurisdictional context, not project-specific applicability.                             |
| `subnational_region` |           509 | Matched state/province/region. A verified match confirms the geographic match, not legal applicability. |
| `sector`             |             0 | Documented sector relevance; still distinct from a direct project link.                                 |
| `evidence`           |             0 | An explicit source connects the project with the policy.                                                |

Existing confidence values are preserved (country 0.3; current subnational
matches 0.75). A numeric score alone does not establish a legal relationship.
Unknown future types are counted as unclassified rather than silently grouped
with direct evidence.

A **verified project-evidence** indicator requires all four conditions:
`link_type=evidence`, `review_status=verified`, non-empty `evidence` and an HTTP(S)
`source_url`. This is a publication check on existing evidence fields, not a
new confidence scale or a guarantee of legal validity.

## Publication

- `/data/relationships.json` publishes `policy_id`, `facility_id`, `link_type`,
  `confidence`, `evidence`, `source_url`, `review_status` and timestamps.
- `/data/schemas/relationship.schema.json` describes one association record.
- Existing `linked_policies` and `relatedFacilities`/`relatedPolicies` ID arrays
  remain compatible. Consumers must inspect the typed endpoint before claiming
  a policy funds, permits, governs or caused a project.
- Quality metrics expose `country_level`, `subnational_level`, `sector_level`,
  `evidence_level`, `unclassified` and `verified_project_evidence` separately.
- Both policy and facility detail pages label geographic matches explicitly.

The earlier quality generator combined `subnational_region` with `evidence`.
This has been corrected without rewriting links or changing confidence values.

## Further evidence collection

Use a project-specific official source, retain its exact supported claim and
review status, and follow the normal SQLite-first review/export/audit workflow.
Do not infer applicability from location alone. Confidence-semantic changes and
bulk relationship changes require separate review under the repository rules.
