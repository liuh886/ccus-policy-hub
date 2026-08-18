# CCUS Policy Hub homepage information hierarchy proposal

Status: **proposal only — no public page changes in this PR**.

## Goal

Reduce first-visit cognitive load without removing analytical depth from the product. The homepage should answer three questions in order:

1. What is the global CCUS deployment picture now?
2. What is changing and where are the largest gaps/opportunities?
3. Where should I go next to investigate policy, facilities, or comparisons?

The proposal does **not** change the governed data model, statistics, methodologies, policy records, facility records, or comparison algorithms.

## Proposed homepage reading order

### 1. Global picture

Keep the existing Hero and the highest-signal capacity/deployment summary near the top. The first viewport should communicate the current global scale and the distinction between operational, under-construction, and planned/committed capacity without requiring users to understand the full database navigation.

### 2. What is changing

Use the existing Capacity Trend / Project Landscape material as the second layer. The role of this section should be interpretation and trend scanning, not another navigation menu.

Where a number depends on a bounded definition, keep the qualifier adjacent to the number. Examples of qualifier patterns:

- `Under construction · commissioning ≤ 2026`
- `Operational · current dataset`
- `Committed pipeline · stated project status`

Exact wording and statistical labels must be reviewed against the governed dataset before any public copy change.

### 3. Explore the database

Move the explicit exploration decision to one clear block after the global/trend picture. The three durable destinations should remain conceptually separate:

- **Facilities** — projects, status, capacity, value-chain role, geography.
- **Policies** — legal/regulatory frameworks, incentives, access and governance.
- **Compare** — structured cross-jurisdiction comparison.

The current world-map interaction can remain a high-value exploration surface, but it should be presented as part of this exploration layer rather than competing with the global summary for first-visit attention.

## Content that should not be removed

- source/governance credibility;
- dataset version and update state;
- methodology links;
- full policy/facility coverage;
- bilingual access;
- current analytical charts and compare capabilities.

The proposal is about **ordering and hierarchy**, not deleting evidence.

## Recommended copy rule

Every homepage statistic should be understandable in isolation. If two numbers use different status/time boundaries, the qualifier should travel with the number instead of relying only on a methodology note elsewhere on the page.

## Explicit non-goals

- no data refresh;
- no methodology change;
- no capacity recomputation;
- no removal of existing analytical routes;
- no redesign of Facilities, Policy, Compare, or methodology pages;
- no new dashboard/chart dependency;
- no implementation in this Draft PR.

## Review gate

Only after the homepage hierarchy and the exact statistic qualifiers are explicitly approved should a separate implementation PR modify `src/pages/index.astro`, related homepage components, or public copy.
