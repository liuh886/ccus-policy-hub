# CCUS Policy Hub | Project Agents

This project is governed by a specialized autonomous agent architecture. 

### 🛢️ CCUS Domain Expert & Data Governor (Primary Agent)
All data operations, policy analysis, and maturity assessments must be performed according to the protocols defined in the **CCUS AI Agent Skill**.

- **Agent Identity & Protocol**: [`SKILL.md`](./SKILL.md)
- **Governance SSOT**: [`db/ccus_master.sqlite`](./db/ccus_master.sqlite)
- **Execution Engine**: [`logic/manage.mjs`](./logic/manage.mjs)
- **Supreme Constitution**: [`DESIGN.md`](./DESIGN.md)

---

### 【Autonomous Skill Synthesis / 能力自生长】
When existing agent capabilities are insufficient for current complex tasks or specific domain requirements, you are permitted and encouraged to autonomously design, write, test, and register new local skills (Project-level Skills) within the `agent/` directory. Ensure that new skills strictly adhere to the project's architectural standards and remain scoped to the current project to achieve autonomous capability evolution.
