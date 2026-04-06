# Project Design: CCUS Policy Hub (Sovereign Governance Edition)

> **Status**: Design Anchor (SSOT) | **Version**: 2.3.0 (Centralized Governance)
> **Last Updated**: 2026-04-06

## 1. Project Mission & Identity
CCUS Policy Hub is a **Global Intelligence Infrastructure** designed to bridge fragmented regulatory texts and actionable facility data. It operates as an **Agent-Centric Governance System**, where AI Agents maintain a high-fidelity database that powers a performance-optimized web interface.

## 2. Governance Authority (SSOT Principle)
The **Agent Workspace** (`agent/ccus-ai-agent/`) is the central "Brain" of the project.
- **Supreme Constitution**: `agent/ccus-ai-agent/DESIGN.md` (this document) absorbs and supersedes all legacy governance files.
- **Execution Roadmap**: `agent/ccus-ai-agent/TASKS.md` tracks all active governance and development batches.
- **Knowledge Base**: `agent/ccus-ai-agent/AGENTS.md` and `agent/ccus-ai-agent/SKILL.md` define the agent's operational intelligence.

## 3. Core Architecture: SQLite Sovereignty (SSOT)
- **Master Repository**: `agent/ccus-ai-agent/db/ccus_master.sqlite` is the ONLY source of truth.
- **Data Flow**: Strictly **One-Way** (`SQLite -> Markdown Exports`). Markdown files in `src/content/` are transient artifacts.
- **Logic Hub**: All transformation and ingestion logic is centralized in `agent/ccus-ai-agent/logic/`.

## 4. Data Ontology: The Four-Dimensional Model
The intelligence engine is built on four structural pillars.

### 4.1 Policy Engine (Four-Dimensional Slicing)
Every policy entry must undergo a "Full-Spectrum Slicing" into:
1. **Identity & Metadata**: ID (Basename aligned), Title, Year, Category, Status, Legal Weight, Scope.
2. **FSRTM Evaluative Intensity**: 5-axis scoring (`incentive`, `statutory`, `market`, `strategic`, `technical`) from 0-100 with mandatory logical evidence and citations.
3. **Impact Matrix**: Qualitative analysis of economic, technical, and environmental impacts.
4. **Narrative Core**: Substantive description (**Min 200 words**) of core clauses and background.

### 4.2 Facility Matrix (Relational Integrity)
- **Technical Specs**: Capacity (Max/Estimated), coordinates, and tech-type normalization.
- **Graph Integrity**: Bi-directional symmetry. Policies must link to facilities, and facilities must point back to their governing policies.

### 4.3 National Governance Profiles (7-Pillar Base)
The **Regulatory Matrix** defines a nation's governance maturity across 7 pillars:
1. Pore Space Rights, 2. Liability Transfer, 3. Liability Period, 4. Financial Assurance, 5. Permitting Lead Time, 6. CO2 Definition, 7. Cross-border Rules.

---

## 5. Standard Governance Procedure (SGP)
The agent must follow this 5-step execution logic:
1. **Dynamic Verification (DV)**: Proactively audit the existing policy library against external intelligence.
2. **National Deep-Dive**: Comprehensive research to fill identified gaps.
3. **Data Ingestion**: Execution of `agent/ccus-ai-agent/logic/ingest-*.mjs` scripts.
4. **Governance Propagation**: Running `db:sync:country-profiles` to sync policy evidence.
5. **Final Audit & Export**: Running the production pipeline to verify and publish.

## 6. Engineering Production Line (Manual of Commands)
All commands are executed from the **Project Root** via `pnpm manage`:
1. **Bootstrap**: `pnpm manage db:init` -> `pnpm manage db:import:i18n`.
2. **Ingest**: Run specific scripts (e.g., `node agent/ccus-ai-agent/logic/ingest-norway-2025.mjs`).
3. **Standardize**: `pnpm manage db:standardize` -> `pnpm manage db:geocode:facilities`.
4. **Link**: `pnpm manage db:fix-relationships`.
5. **Sync**: `pnpm manage db:sync:country-profiles`.
6. **Audit (GATE)**: `pnpm manage db:audit:deep`.
7. **Export**: `pnpm manage db:export:i18n` -> `pnpm manage db:export:md`.

## 7. The Quality Gate (P0 Safety Standards)
- **Audit-Blocked Exports**: Exports are prohibited if `db:audit:deep` fails.
- **Provenance Requirement**: `provenance_author` and `last_audit_date` are mandatory.
- **Bilingual Parity**: 1:1 parity between English and Chinese content is required for G20 members.

## 8. UI/UX Governance (Design Freeze)
- **Freeze Date**: February 10, 2026.
- **Refactor Prohibition**: Large-scale refactoring of frontend code is **Strictly Prohibited** without approval.

