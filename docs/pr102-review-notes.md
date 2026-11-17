# PR #102 review evidence

This is a review aid for [PR #102](https://github.com/liuh886/ccus-policy-hub/pull/102),
not another task queue or a human approval record. Compared `main@aa68b45f`
with the implementation at `92a0f675`, using read-only SQLite queries.

| Domain                        | Main  | Candidate | Interpretation                                    |
| ----------------------------- | ----- | --------- | ------------------------------------------------- |
| Policies                      | 130   | 130       | No policy-record expansion                        |
| Facilities                    | 1,110 | 1,110     | Canonical facility rows are identical             |
| Country profiles              | 65    | 65        | Canonical profile rows are identical              |
| Analytical dimensions         | 649   | 649       | Every policy/dimension/score tuple is identical   |
| Policy–facility relationships | 4,796 | 4,796     | Classification and evidence semantics need review |
| Facility news                 | 6,810 | 6,826     | 16 curated additions; not a facility-fact refresh |

## Relationship and translation checks

- 4,287 country links retain confidence 0.3 and draft status.
- 509 subnational-region links retain confidence 0.75 and verified status.
- There are no project-specific direct-evidence links. A verified geographic
  match is not verified project legal applicability.
- Forty Chinese analytical dimensions match their canonical `source_evidence`;
  609 dimensions remain untranslated. Changed source text invalidates the
  corresponding translation; bilingual record parity is not full translation.
- Six policies remain draft: `br-anp-ccs-resolution`,
  `cn-co2-transport-status-2025`, `cn-ordos-pilot-2024`,
  `co-law-2099-energy-transition`, `is-carbfix-act`,
  `kr-motie-cluster-district-2025`.

## What the reviewer still needs to judge

The accepted corrections can be traced through the explicit patches in
`scripts/data/policy-reviews-2026-10.json`,
`policy-scope-clarifications-2026-10.json` and `policy-tail-reviews-2026-10.json`.
Inspect the official sources and bilingual descriptions/citations in those
patches. This structural comparison does not independently certify all legal
interpretations or translations. In particular, passing the content-depth
threshold is an editorial measure, not legal-source verification.

The six-facility curation input is
`scripts/data/facility-news-research-2026-10.json`. Review provenance and duplicate handling;
the canonical facility rows must remain unchanged.

For implementation review, inspect `relationshipTrust.mjs`, source-bound
translation invalidation and the dry-run/lock/backup/atomic-write behavior of
the review importer. Review the scoped UI changes separately from factual
approval; no score or capacity-methodology change is implied.

## Integration gate

After human review, integrate through the normal PR process, then verify the
mainline CI and the actual published artifact. Retarget #103 only after its
base has landed. #102's passing branch CI is not proof that Pages has shipped
the changes. No merge is performed by this review note.
