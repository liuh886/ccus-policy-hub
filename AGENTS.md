# 🤖 AI Agent Index & Orchestration (ccus-policy-hub)

Welcome, AI Agent. This project is **AI-Native** and governed by a consolidated domain-specific brain located in `skills/ccus-ai-agent/`.

## 🧠 Core Intelligence: `ccus-ai-agent`

All governance rules, data assets, and management logic have been merged into this folder. It is the SINGLE source of intelligence for the repository.

### How to Initialize
Before performing any task, you **MUST** activate the domain skill:
```bash
activate_skill ccus-ai-agent
```

---

## 🏗️ Project Structure (Consolidated)

- **`skills/ccus-ai-agent/SKILL.md`**: Your core instructions and domain ontology.
- **`skills/ccus-ai-agent/logic/`**: The management scripts (formerly `scripts/`).
- **`skills/ccus-ai-agent/governance/`**: Governance rules and audit thresholds.
- **`skills/ccus-ai-agent/db/`**: The SQLite SSOT and database locks.
- **`skills/ccus-ai-agent/assets/`**: Raw data sources (e.g., IEA Excel files).

---

## 🛠️ Operational Commands (Mapped to Skill)

The `pnpm manage` commands in `package.json` have been updated to point to the new location.

| Command | Purpose |
|---------|---------|
| `pnpm manage db:stats` | Check current database health & size. |
| `pnpm manage db:audit:deep` | Run mandatory quality gates. |
| `pnpm manage db:export:md` | Publish SQLite data to the website. |

---

## 📜 Agent Commandments

1.  **Skill Isolation**: All non-Astro logic lives in `skills/ccus-ai-agent/`. Do not create new scripts in the root.
2.  **SQLite Sovereignty**: The database is the master. Markdown files in `src/content/` are generated artifacts.
3.  **Refactor Prohibition**: The UI/UX is in a "Design Freeze" state. 

> **Next Action**: Run `node skills/ccus-ai-agent/logic/manage.mjs db:stats` from the root to verify the system.
