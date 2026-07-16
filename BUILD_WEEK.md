# OpenAI Build Week Submission Baseline

## Submission identity

**Project name (40/50 characters)**

> CCUS Policy Hub: Project Readiness Agent

**Elevator pitch (194/200 characters)**

> An evidence-backed AI agent that turns fragmented CCUS regulations into project-ready decisions, comparing jurisdictions, incentives, permits, liabilities and policy gaps with traceable sources.

**Primary category**

> Work & Productivity

## Product thesis

CCUS projects are governed by fragmented policy, permitting, liability, incentive and cross-border rules. The project will turn the existing governed policy and facility datasets into a focused decision workflow: a user describes a proposed CCUS project and receives a source-backed readiness brief that distinguishes direct evidence, structured inference and unresolved gaps.

The Build Week entry must remain an extension of the existing open-source CCUS Policy Hub rather than a disconnected chatbot. The durable asset is the combination of:

- structured bilingual policy and facility data;
- versioned SQLite governance and reproducible exports;
- explicit data-quality and relationship-confidence signals;
- a constrained AI workflow that cites the records used for each material conclusion.

## Current evidence baseline

The current governed snapshot contains:

- 130 policy records;
- 1,110 facility records;
- 66 country governance profiles;
- 116 verified policies and 14 draft policies;
- bilingual publication coverage for the governed datasets.

Facility-policy links currently represent country-level contextual associations. They must not be presented as proof that a specific legal clause directly enabled or governs a specific facility. The future agent must expose this distinction in every relevant result.

## Delivery split

### PR A — Trust and submission baseline

This PR is intentionally low risk. It:

- aligns English and Chinese project descriptions with the governed dataset;
- removes or qualifies claims that exceed the current evidence model;
- records the Build Week project name, pitch and category;
- makes GitHub Pages deployment run the same blocking trust checks as CI.

### PR B — Project Readiness Agent

PR B is maintained as a draft design track until the product workflow is agreed. No model integration or irreversible UI architecture decision should be implemented before the following are settled:

1. target user and primary decision;
2. minimum project-input schema;
3. retrieval and evidence-ranking logic;
4. response schema and confidence semantics;
5. OpenAI API deployment and secret-management approach;
6. evaluation cases and failure criteria;
7. the three-minute demo narrative.

## Non-negotiable trust rules for PR B

- Retrieval narrows candidate records before model reasoning.
- Every material conclusion references a policy or country record.
- Country-level association is labelled as context, not direct evidence.
- Missing evidence produces an explicit insufficient-evidence result.
- The result displays dataset version, audit status and known limitations.
- Generated language must not silently override structured data or provenance.
