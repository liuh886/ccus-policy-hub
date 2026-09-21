# CCUS Policy Hub | Methodology

This document defines the analytical meanings that must remain consistent across SQLite, generated content, public data, charts, documentation, and user-facing copy.

## 1. Policy analysis

Policy records distinguish identity and legal status from analytical interpretation. Current policy-level analytical dimensions are:

- incentive;
- statutory;
- market;
- strategic;
- technical.

Scores require evidence and must not be changed solely to improve a country's comparative position. A country governance profile is not the arithmetic identity of one policy score; it synthesizes evidence across the applicable policy framework.

## 2. Seven governance pillars

Country profiles track:

1. pore-space rights;
2. liability transfer;
3. liability period;
4. financial assurance;
5. permitting lead time;
6. legal definition/classification of CO₂;
7. cross-border rules.

Empty, unknown, draft, and enacted positions must remain distinguishable. Concise labels do not replace source-backed narrative evidence.

## 3. Facility records

A facility record represents one row in the maintained facility dataset. It may describe capture, transport, storage, transport-and-storage, utilization, or a full-chain development. Multiple records can relate to one wider project or hub.

Therefore:

- record counts are not guaranteed to equal unique real-world projects;
- capacities across record types can overlap;
- missing-capacity records remain part of count-based analysis but contribute no Mtpa to capacity sums;
- reported ranges and estimated capacities must remain distinguishable in provenance and raw fields.

## 4. Project-record capacity

Project-record capacity is the sum of the selected capacity value attached to eligible database records under the current calculation rules. It supports directional comparison of the recorded pipeline. It must not be described as:

- net deliverable capture capacity;
- verified annual injection;
- geological storage resource;
- guaranteed future capacity.

The relevant chart or documentation must disclose filters, eligible statuses, selected record types, year logic, and missing-data coverage.

## 5. Status and commitment

Current homepage definitions are:

```text
Pipeline = Planned + Under construction + Operational
Committed = Under construction + Operational
```

Committed is a subset of Pipeline. Cancelled, Suspended, and Decommissioned records are excluded from the active portfolio unless a specific analysis explicitly includes them.

`Operational (2026)` and `Under construction (2026)` are current dataset snapshot labels, not historical statements about the status in every prior year.

## 6. Time logic

Capacity-growth views use the documented record-year priority implemented by the active chart logic, generally operation year, then FID year, then announcement year where available. The 2026 Global Project Landscape is a current snapshot and must not be presented as a reconstructed historical status series.

## 7. Region and geography

Regional aggregation uses the normalized region assigned to each facility record. Country-level or approximate coordinates are visualization aids, not verified site locations. Precision must be preserved and surfaced where relevant.

## 8. Facility-policy relationships

Relationship strength depends on evidence:

- direct project-specific applicability;
- sector or programme relevance;
- country-level jurisdictional context;
- inferred/low-confidence association.

Country-level association must not be worded as verified project-specific legal applicability.

## 9. Facility news and source tiers

Each facility may carry a curated, ordered list of external sources (`facility_news`). The list is evidence, not analysis: every entry is a real, resolvable URL and nothing is invented.

Entries are classified into four evidence tiers, rendered most-authoritative first:

1. `official` — government, regulator, or agency publications;
2. `press_release` — first-party newsrooms and wire-service releases;
3. `media` — independent journalism;
4. `reference` — project portals, datasets, papers, and anything unmatched.

The unmatched default is `reference` so an unknown domain is never presented as news. Classification is deterministic (`logic/facility-news-classify.mjs`): government suffixes and an official domain list, a wire-service list, a media list, then a newsroom path heuristic, then `reference`. URLs are normalized (protocol folded to https, `www.` and tracking parameters removed, trailing slash trimmed) to deduplicate within a facility.

Seeded entries carry `origin='iea-ref'` and are mirrored across en/zh with their original-language titles (news is not translated). Later evidence-backed research carries `origin='agent-research'` and a `verified_at` date; re-seeding rebuilds only `iea-ref` rows and preserves curated rows. The list is display-only and is not included in the `facilities.json` public payload.

Page titles and publication dates are fetched once from the live URL during data preparation (`scripts/enrich-facility-news-metadata.mjs`) and stored; entries whose title cannot be fetched, or whose fetched title is an anti-bot/paywall/error page or off-topic spam, fall back to the publisher/host name rather than showing a misleading title. Coverage (facilities with sources, facilities with titled sources, titled-row share) is reported under `facility_news` in the quality metrics.

Evidence-backed additions for high-value facilities (e.g. operational, ≥1 Mtpa) are curated by hand in `scripts/data/facility-news-research.json` — each item carries a real, resolvable URL, a title, and a tier verified against a primary source — and ingested with `pnpm manage:db:import:facility-news-research` as `origin='agent-research'` rows with a `verified_at` date. URLs and titles are never generated.

## 10. Method changes

Any change to dimensions, score scales, aggregation, capacity selection, status sets, year priority, region mapping, relationship confidence, or exclusions requires:

- a methodology update;
- focused tests;
- user-facing copy review in both languages;
- comparison with prior outputs;
- explicit human approval in the PR.
