# RFC: CCUS Project Readiness Agent

> **Status:** Discussion draft  
> **Implementation status:** Not started  
> **Dependency:** PR A — Build Week trust baseline

## 1. Purpose

Define the smallest credible AI workflow that converts the existing CCUS Policy Hub data into an evidence-backed project-readiness brief. This RFC intentionally precedes implementation so that product scope, evidence semantics, architecture and evaluation are agreed before code is added.

## 2. Proposed user outcome

A user describes a proposed CCUS project and receives a structured brief covering:

- jurisdiction readiness;
- applicable policy and regulatory context;
- potential incentives;
- permitting and liability considerations;
- cross-border constraints where relevant;
- evidence quality and unresolved gaps;
- optional comparison against one or more alternative jurisdictions.

The result is a decision-support brief, not legal advice and not a claim that a project is fully permitted or financeable.

## 3. Decisions required before implementation

### A. Primary user

Choose one primary user for the Build Week MVP:

1. CCUS project developer or business-development team;
2. policy researcher or consultant;
3. investor or lender conducting early screening;
4. policymaker benchmarking national readiness.

### B. Primary decision

Choose one dominant decision:

1. Is this jurisdiction ready for the proposed project?
2. Which of two or three jurisdictions is the best fit?
3. Which policy and regulatory gaps must be resolved next?
4. Which incentives may be relevant to the project profile?

### C. Minimum project-input schema

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

The MVP should avoid fields that are not used in retrieval, scoring or output.

### D. Evidence semantics

The output must distinguish:

- **direct evidence:** a source explicitly connects a rule, programme or clause to the conclusion;
- **structured applicability:** policy scope, sector, date and jurisdiction support the conclusion;
- **country context:** the policy and project share a jurisdiction only;
- **insufficient evidence:** the governed dataset cannot support the conclusion.

Country-level facility-policy links must never be rendered as direct project evidence.

### E. Output schema

Candidate sections:

1. executive readiness assessment;
2. key policy and regulatory findings;
3. incentive candidates;
4. permitting, liability and cross-border constraints;
5. critical gaps and next actions;
6. evidence table with policy IDs, source URLs and confidence;
7. dataset version and quality disclosure.

The output should be schema-validated before rendering.

### F. OpenAI integration architecture

Options to evaluate:

1. a small serverless API route with the OpenAI Responses API;
2. a separate lightweight backend service;
3. a local/demo-only workflow for Build Week;
4. precomputed demonstrations plus a live constrained endpoint.

The selected design must keep API credentials off the static client and preserve the current GitHub Pages deployment for the public data product.

### G. Retrieval design

Candidate pipeline:

1. normalize project inputs;
2. deterministically filter policies and country profiles by jurisdiction, status, date and scope;
3. rank evidence by directness, review status, source availability and relevance;
4. construct a bounded evidence pack;
5. ask the model to produce the agreed structured output;
6. validate citations and confidence labels against the evidence pack;
7. reject or downgrade unsupported conclusions.

### H. Evaluation

At least three fixed scenarios should be agreed before implementation. Candidate cases:

- UK or Norway offshore transport-and-storage hub;
- US Gulf Coast industrial capture project;
- cross-border CO₂ transport and storage scenario in Asia-Pacific.

Each case should test:

- retrieval precision;
- citation validity;
- unsupported-claim rate;
- correct handling of missing evidence;
- useful differentiation between jurisdictions;
- completion within the three-minute demo flow.

## 4. Scope exclusions for the MVP

Unless explicitly approved, the Build Week MVP will not:

- provide legal advice;
- autonomously crawl and ingest the global web;
- claim real-time regulatory coverage;
- calculate detailed project economics;
- predict final permit approval;
- create high-confidence facility-policy links without source evidence;
- redesign the entire existing website.

## 5. Proposed implementation slices after approval

1. **Domain contract:** input, evidence and output schemas.
2. **Deterministic retrieval:** policy and country evidence selection.
3. **Model orchestration:** bounded prompt and structured response.
4. **Claim validation:** citation and confidence checks.
5. **Focused UI:** project form, readiness brief and evidence drawer.
6. **Evaluation fixtures:** fixed scenarios and regression checks.
7. **Demo and submission:** three-minute narrative, README and deployment notes.

## 6. Discussion checkpoint

Implementation should begin only after the primary user, primary decision, input schema, output schema, deployment model and evaluation scenarios are accepted. Until then this branch remains a Draft PR containing design material only.
