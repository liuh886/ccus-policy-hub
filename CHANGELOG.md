# Changelog

## v1.0.0 - 2026-07-02

First stable release of **CCUS Policy Hub**.

### Highlights

- Production-ready bilingual Astro site for CCUS policy, facility, and project intelligence.
- Structured CCUS data layer covering policies, country profiles, facilities, relationships, provenance, and quality metrics.
- Data governance and trust layer with deep audit checks, parity validation, generated enums, and automated public data export.
- AI-readable / agent-grounding interface for downstream assistants and external analysis workflows.
- Homepage capacity trend aligned to the project-record methodology:
  - `operation → FID → announcement` year fallback;
  - `Pipeline = Planned + Operational + Under construction`;
  - `Committed = Operational + Under construction`;
  - `Cancelled / Decommissioned / Suspended` excluded;
  - clear caveat that values aggregate cross-value-chain project-record capacity, not net deliverable capture or storage capacity.
- Interactive type filter for homepage capacity trends across Capture, Transport, T&S, Storage, Full chain, and CCU.
- Public data generation, quality metrics export, search indexing, sitemap/RSS support, and CI validation.

### Validation

The release branch is expected to pass the standard CI pipeline:

- Lint
- Tests
- Astro Check
- Deep Audit
- Public data export
- Build
