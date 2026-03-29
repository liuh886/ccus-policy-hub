# CO2 Regulatory Positioning Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Rename the comparison-field concept from strict "CO2 legal definition" to "CO2 regulatory positioning / legal status", normalize inaccurate country-level values in SQLite, and make both compare pages read the same country-profile source of truth.

**Architecture:** Keep the existing `co2_definition` storage column for backward compatibility, but reinterpret it as the rendered value for the broader "regulatory positioning / legal status" concept. Update the SQLite truth set first, export Markdown from SQLite, and only then adjust the Astro compare pages and supporting copy.

**Tech Stack:** Astro, TypeScript-in-Astro, sql.js, project SQLite governance pipeline, PowerShell, ripgrep.

### Task 1: Document the new field semantics

**Files:**

- Modify: `README.md`
- Modify: `README.zh.md`

**Step 1: Replace the old binary description**

Change the documentation from the old "Waste vs. Commodity" framing to a broader description covering regulatory treatment across capture, transport, storage, and utilization.

**Step 2: Keep the storage key stable**

Do not rename the underlying `co2_definition` schema key in this pass. The schema key stays stable to avoid breaking the export pipeline and content schema.

### Task 2: Normalize country-profile values in SQLite

**Files:**

- Create: `agent/ccus-ai-agent/logic/update-co2-positioning-2026.mjs`

**Step 1: Build a country mapping**

Create a single update map keyed by canonical country name with normalized English and Chinese values.

**Step 2: Update only `country_i18n`**

Write the script so it updates `country_i18n.co2_definition` for both `en` and `zh` rows and preserves every other field.

**Step 3: Keep the phrasing concise**

Normalize values toward short regulatory-positioning statements such as:

```text
CO2 stream for geological storage; non-waste when handled under CCS rules.
```

Avoid strategic or market-signaling language in this field.

### Task 3: Export Markdown from SQLite

**Files:**

- Generated: `src/content/countries/en/*.md`
- Generated: `src/content/countries/zh/*.md`

**Step 1: Run the normalization script**

Run:

```powershell
node agent/ccus-ai-agent/logic/update-co2-positioning-2026.mjs
```

Expected: script prints updated country count and exits successfully.

**Step 2: Export content**

Run:

```powershell
pnpm manage:db:export:md
```

Expected: country markdown is regenerated from SQLite.

### Task 4: Unify compare-page data sources

**Files:**

- Modify: `src/pages/compare/index.astro`
- Modify: `src/pages/en/compare/index.astro`

**Step 1: Rename labels**

Chinese label:

```text
CO2 监管属性 / 法律定位
```

English label:

```text
CO2 Regulatory Positioning / Legal Status
```

**Step 2: Make the English page use country profiles**

Load `countries_en` and render the regulatory matrix from the profile record, mirroring the Chinese page instead of aggregating from policy cards.

### Task 5: Verify output

**Files:**

- Verify: `src/content/countries/zh/china.md`
- Verify: `src/content/countries/zh/japan.md`
- Verify: `src/content/countries/en/united-states.md`
- Verify: `src/pages/compare/index.astro`
- Verify: `src/pages/en/compare/index.astro`

**Step 1: Spot-check regenerated content**

Confirm that previously problematic countries now use normalized regulatory-positioning language and that Chinese files no longer contain untranslated English for the target field where we explicitly corrected it.

**Step 2: Run project checks**

Run:

```powershell
pnpm lint
```

If lint is too broad or fails on unrelated pre-existing issues, run a focused verification pass and record that limitation.
