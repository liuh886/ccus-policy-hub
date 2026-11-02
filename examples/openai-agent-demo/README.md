# CCUS Policy Hub — OpenAI Agent Demo

A small, runnable demonstration of the Hub's PRD **§8.3 "Agent-native access"**:
an OpenAI-API agent that answers CCUS policy questions **only** through tool
calls over the Hub's already-published, governed static data — and produces
structured, citation-carrying answers that a human reviews before they count
as verified.

The point of the demo: the intelligence is not the interesting part. The
interesting part is the workflow around the model — a governed data layer,
tool-ified access, version checking, evidence boundaries, and a human-review
gate — which is what makes an AI answer *verifiable*.

## How it maps to PRD §8.3

| §8.3 requirement | Where it lives here |
|---|---|
| Tool-ified access (search policies, fetch facilities, compare governance, trace sources) | `ccus_demo/tools.py` — six tool areas over the static JSON snapshot; schemas in `ccus_demo/schemas.py` |
| Cited Q&A (source, version, confidence on every answer) | Structured answer schema: every factual answer carries `citations[]` with entity id, title, source URL, data version, evidence note |
| Data-version awareness | `ccus_demo/data_layer.py` — snapshot with per-file SHA-256; `check_data_version` compares snapshot vs live `dataset-versions.json`/`manifest.json` (`ok / stale / changed / unknown`, never silently ok) |
| Honest refusal when evidence is insufficient | System prompt hard rules + `refused` / `refusal_reason` / `gaps` in the answer schema; see eval questions q09/q10 |
| Evaluation set as a first-class citizen | `eval/questions.json` — 12 questions grounded in the live records, incl. 2 that must be refused |
| No unreviewed LLM output becomes a fact | `ccus_demo/review.py` — every answer enters a human-review queue as `pending`; only human-approved answers can be exported to `eval/gold.jsonl` |

## Evidence boundaries (from the Hub's published documentation)

- Most facility–policy links are **country-level context links**, not proof
  that a policy applies to a specific facility or project. Whether a named
  project qualifies for 45Q tax credits is therefore **refused** by design.
- Facility capacities are project-record values, not net deliverable capacity.
- Facility coordinates carry a precision field (`exact / state / country`).
- The dataset is **record-level** evidence (summaries, analysis dimensions,
  provenance). It contains no clause-level legal text — clause questions are
  refused until the text-layer work lands.

## Setup & run

```bash
pip install -r requirements.txt

# 1. Snapshot the governed data (works without an API key)
python -m ccus_demo.cli snapshot
python -m ccus_demo.cli version        # check snapshot vs live version

# 2. Ask (needs a real OpenAI key, via secure entry — never commit it)
export OPENAI_API_KEY=...              # do not paste keys into chat or git
python -m ccus_demo.cli ask "What did Public Law 119-21 change about 45Q credit values for utilised CO2?"

# 3. Human review
python -m ccus_demo.cli review list
python -m ccus_demo.cli review approve <id> --reviewer <name>
python -m ccus_demo.cli review reject  <id> --reviewer <name> --note "why"
python -m ccus_demo.cli review export  # approved-only -> eval/gold.jsonl
```

Environment: `CCUS_HUB_BASE_URL` overrides the data source
(default `https://liuh886.github.io/ccus-policy-hub`); `OPENAI_MODEL`
overrides the model (default `gpt-4o-mini`).

## Tests

```bash
python -m unittest discover -s tests -v
```

Fully offline: a fixture snapshot mimicking the real record shapes, a scripted
`FakeClient` that plays tool calls and final answers — the whole agent loop,
version check, and review gating are tested with no network and no API key.

## Current limits

- Evidence level is **record summary only**; clause-level Q&A awaits the Hub's
  text-layer (S2) work.
- Retrieval is keyword search over the records, by design (MVP): no vector
  index, no MCP server. Tool schemas are plain OpenAI function calling so the
  same six tools can be re-exposed over MCP later without changing the data layer.
- The live dataset's facility/country versions currently read `2026-Q2`
  (last checked 2026-06-24 in `dataset-versions.json`) — the version check
  exists precisely so answers can disclose that.
