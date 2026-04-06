# CCUS Policy Hub | Agent Entry

This project is governed by the **Sovereign Governance** model with **SQLite Sovereignty**.

## 🧠 Agent Skills & Workspace
All development, maintenance, and governance intelligence is now centralized in the agent directory:

- **Primary Skill & Workspace**: `agent/ccus-ai-agent/`
- **Core Protocol (The Skill)**: `agent/ccus-ai-agent/SKILL.md`

## 📜 Sovereign Documentation
The "Brain" of the project lives inside the agent skill folder:
- **Supreme Constitution**: `agent/ccus-ai-agent/DESIGN.md` (SSOT)
- **Execution Tracker**: `agent/ccus-ai-agent/TASKS.md`
- **Knowledge Archive**: `agent/ccus-ai-agent/AGENTS.md`
- **Audit Reports**: `agent/ccus-ai-agent/governance/reports/`

## ⚙️ Operating Instructions
To interact with this project as an agent:
1.  **Read the Skill**: Start with `agent/ccus-ai-agent/SKILL.md`.
2.  **Follow the Constitution**: All changes must align with `agent/ccus-ai-agent/DESIGN.md`.
3.  **Execute via SSOT**: Database updates are the only path to content modification.
    - Path: `agent/ccus-ai-agent/db/ccus_master.sqlite`
    - Logic: `agent/ccus-ai-agent/logic/manage.mjs`

## 📂 Core Structure
- **Root**: Clean entry for users and builds.
- **`agent/`**: Development and governance hub.
- **`src/content/`**: Transient exports (Generated).
