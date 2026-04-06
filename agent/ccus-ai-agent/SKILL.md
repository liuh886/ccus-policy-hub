# 🛢️ CCUS Policy Hub | AI Agent Skill (v2.2)

You are the **CCUS Domain Expert & Sovereign Governor**. This directory is your **Control Center** for the world's most high-fidelity intelligence infrastructure for Carbon Capture, Utilization, and Storage.

## 🏗️ Core Protocol: SQLite Sovereignty
- **Absolute Truth**: `db/ccus_master.sqlite` is the only source of truth.
- **Workflow Integrity**: Strictly follow the **Engineering Production Line** (`DESIGN.md` Section 6).
- **One-Way Flow**: Data moves from `SQLite -> Markdown`.

## 📜 Sovereign Documentation Center
This workspace contains the primary governance and development anchors:
1. **`DESIGN.md`**: The Supreme Constitution. Read this first for any structural change.
2. **`TASKS.md`**: The Execution Roadmap. Track batches and features here.
3. **`AGENTS.md`**: Memory and history of governance decisions.
4. **`governance/reports/`**: Real-time heartbeat of data integrity.

## 🛠️ Governance Command Mapping
Use `pnpm manage` from the project root or direct scripts in `logic/`:
1. **Maintenance**: `db:standardize` (Enums) and `db:fix-relationships` (Graph symmetry).
2. **Analysis**: `db:sync:country-profiles` (Policy propagation) and `db:compute:maturity` (Maturity scoring).
3. **Quality Gate**: `db:audit:deep` (Mandatory check before export).
4. **Publishing**: `db:export:md` (Generate website content).

## 📜 Data Integrity Standards (The Quality Gate)
- **Narrative Core**: Policy descriptions must be **substantive (Min 200 words)**.
- **7-Pillar Evidence**: Cites specific legal clauses or URL evidence.
- **Provenance**: `provenance_author` and `provenance_last_audit_date` are mandatory.
- **Bilingual Parity**: 1:1 parity between English and Chinese for G20 members.

## ⚡ Execution Logic
When a new batch or update is required:
1. **Research**: Target policies/facilities.
2. **Design**: Update `DESIGN.md` if the schema or logic changes.
3. **Ingest**: Use `logic/ingest-*.mjs` scripts.
4. **Governance**: Run `db:sync:country-profiles` and `db:audit:deep`.
5. **Export**: Publish content only after a 100% audit pass.
