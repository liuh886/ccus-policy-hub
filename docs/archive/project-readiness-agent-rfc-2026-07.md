# Archived RFC: CCUS Project Readiness Agent

> **Status:** Archived design reference  
> **Original design date:** July 2026  
> **Implementation status:** Not started  
> **Supersedes:** the stale stacked design branch formerly tracked by PR #24

## 1. Why this document is retained

This note preserves the useful product decisions explored during the OpenAI Build Week planning phase without keeping the obsolete stacked branches alive. It is not an active implementation plan or task queue. Any future implementation must start from the current `main` branch, current datasets, current evidence model, and current deployment architecture.

## 2. Proposed user outcome

A user describes a proposed CCUS project and receives a structured readiness brief covering:

- jurisdiction readiness;
- applicable policy and regulatory context;
- potential incentives;
- permitting and liability considerations;
- cross-border constraints where relevant;
- evidence quality and unresolved gaps;
- optional comparison against alternative jurisdictions.

The result would be decision support, not legal advice and not a claim that a project is fully permitted or financeable.

## 3. Decisions required before any implementation

### Primary user

Select one primary user for an MVP:

1. CCUS project developer or business-development team;
2. policy researcher or consultant;
3. investor or lender conducting early screening;
4. policymaker benchmarking national readiness.

### Primary decision

Select one dominant decision:

1. Is this jurisdiction ready for the proposed project?
2. Which of two or three jurisdictions is the best fit?
3. Which policy and regulatory gaps must be resolved next?
4. Which incentives may be relevant to the project profile?

### Minimum project-input schema

Candidate fields:

- project country or candidate countries;
- sector;
- capture capacity;
- project stage;
- target start year;
- transport mode;
- storage type and location;
- domestic or cross-border chain;
- optional free-text context.

Only fields used by retrieval, scoring, or output should be retained.

### Evidence semantics

Any output must distinguish:

- **Direct evidence:** a source explicitly supports the conclusion.
- **Structured applicability:** policy scope, sector, date, and jurisdiction support the conclusion.
- **Country context:** a policy and facility share a jurisdiction only.
- **Insufficient evidence:** the governed dataset cannot support the conclusion.

Country-level facility-policy relationships must never be presented as direct project evidence.

### Output schema

Candidate sections:

1. executive readiness assessment;
2. key policy and regulatory findings;
3. incentive candidates;
4. permitting, liability, and cross-border constraints;
5. critical gaps and next actions;
6. evidence table with policy IDs, source URLs, and confidence;
7. dataset version and quality disclosure.

The output should be schema-validated before rendering.

## 4. Technical design principles

A credible future workflow would:

1. normalize project inputs;
2. deterministically filter policies and country profiles by jurisdiction, status, date, and scope;
3. rank evidence by directness, review status, source availability, and relevance;
4. construct a bounded evidence pack;
5. generate a structured response from that bounded evidence;
6. validate citations and confidence labels against the evidence pack;
7. reject or downgrade unsupported conclusions.

Any live model integration must keep credentials off the static client and preserve the public GitHub Pages data product.

## 5. Evaluation requirements

At least three fixed scenarios should be agreed before implementation, for example:

- a UK or Norway offshore transport-and-storage hub;
- a US Gulf Coast industrial capture project;
- an Asia-Pacific cross-border CO2 transport and storage scenario.

Evaluation should cover retrieval precision, citation validity, unsupported-claim rate, correct handling of missing evidence, useful differentiation between jurisdictions, and completion within a short demonstration flow.

## 6. Explicit MVP exclusions

Unless separately approved, an MVP should not:

- provide legal advice;
- autonomously crawl and ingest the global web;
- claim real-time regulatory coverage;
- calculate detailed project economics;
- predict final permit approval;
- create high-confidence facility-policy links without direct source evidence;
- redesign the entire existing website.

## 7. Restart condition

If this product track is restarted, open a fresh issue and branch from the current `main`. Revalidate the primary user, primary decision, input/output schemas, deployment model, evidence semantics, and evaluation scenarios before writing implementation code.
