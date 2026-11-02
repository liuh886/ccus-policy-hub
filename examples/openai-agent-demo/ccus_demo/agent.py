"""Agent loop: OpenAI Responses API + the six Hub tools.

The client is injectable. Anything with `.responses.create(**kwargs)` returning
an object with `.output` (items of type 'function_call', or a final message)
and `.output_text` satisfies the protocol -- the tests use a scripted
FakeClient, so the full loop runs with no network and no API key.
"""
from __future__ import annotations

import json
import os

from . import review as review_mod
from . import tools as tools_mod
from .schemas import ANSWER_SCHEMA, TOOL_SCHEMAS, validate_answer

MAX_ROUNDS = 8
DEFAULT_MODEL = "gpt-4o-mini"

SYSTEM_PROMPT = """You are a research assistant answering questions about CCUS
(carbon capture, utilisation and storage) policy using ONLY the CCUS Policy
Hub's governed dataset, accessed through the provided tools.

Hard rules:
1. Answer only from tool results. Never use outside knowledge for facts.
2. Cite every factual claim: each citation needs entity_type, entity_id, the
   record title, its source_url, the data_version returned by the tools, and an
   evidence_note. First call check_data_version and put its snapshot_version
   (or the tools' data_version) in the answer's data_version field.
3. Numbers (amounts, counts, capacities) may only come from structured tool
   outputs. Never do mental arithmetic over prose; if an aggregate is not in
   a tool result, say so in gaps instead of computing it.
4. Evidence boundaries of this dataset (from its published documentation):
   - Facility-policy links are predominantly country-level context links, NOT
     proof that a policy applies to a specific facility or project.
   - Facility capacities are project-record values, not net deliverable
     capacity. Coordinates have a precision field (exact/state/country).
   - The data is record-level (summaries, analysis dimensions, provenance).
     It does NOT contain clause-level legal text.
5. If the tools cannot support an answer -- in particular whether a specific
   project qualifies for a tax credit, or the exact text/meaning of a legal
   clause -- set refused=true, explain the evidence boundary in
   refusal_reason, and describe in gaps what evidence would be needed.
6. Set evidence_level to describe the strongest evidence used, e.g.
   "record_summary" for record-level data.
Return ONLY the JSON object defined by the response schema."""


class DemoError(Exception):
    """User-facing error (missing key, missing snapshot, ...)."""


class SchemaError(DemoError):
    """The model failed to produce a schema-valid answer after one repair."""


def _get(item, key, default=None):
    if isinstance(item, dict):
        return item.get(key, default)
    return getattr(item, key, default)


def _function_calls(response) -> list[dict]:
    calls = []
    for item in _get(response, "output", []) or []:
        if _get(item, "type") == "function_call":
            calls.append({
                "call_id": _get(item, "call_id") or _get(item, "id"),
                "name": _get(item, "name"),
                "arguments": _get(item, "arguments") or "{}",
            })
    return calls


def _final_text(response) -> str:
    text = _get(response, "output_text")
    if text:
        return text
    for item in _get(response, "output", []) or []:
        if _get(item, "type") == "message":
            for part in _get(item, "content", []) or []:
                if _get(part, "type") in ("output_text", "text"):
                    return _get(part, "text") or ""
    return ""


def _default_client():
    if not os.environ.get("OPENAI_API_KEY"):
        raise DemoError(
            "OPENAI_API_KEY is not set. Set it (secure entry, never commit it) "
            "and re-run, e.g. `ask` again. The snapshot/version/review commands "
            "work without a key.")
    try:
        import openai  # lazy: tests and offline commands never import it
    except ImportError as exc:
        raise DemoError("the `openai` package is not installed; run "
                        "`pip install -r requirements.txt`") from exc
    return openai.OpenAI()


def run_question(question: str, tools, client=None, model: str | None = None,
                 queue_path=None) -> dict:
    """Run one question end-to-end; enqueue the answer for human review."""
    client = client or _default_client()
    model = model or os.environ.get("OPENAI_MODEL", DEFAULT_MODEL)
    items = [{"role": "user", "content": question}]
    repaired = False
    for _round in range(MAX_ROUNDS):
        response = client.responses.create(
            model=model, instructions=SYSTEM_PROMPT, input=items,
            tools=TOOL_SCHEMAS,
            text={"format": {"type": "json_schema", "name": "ccus_answer",
                             "schema": ANSWER_SCHEMA, "strict": True}},
        )
        calls = _function_calls(response)
        if calls:
            for call in calls:
                items.append({"type": "function_call", "call_id": call["call_id"],
                              "name": call["name"], "arguments": call["arguments"]})
                try:
                    args = json.loads(call["arguments"])
                except json.JSONDecodeError:
                    args = {}
                result = tools_mod.dispatch(tools, call["name"], args)
                items.append({"type": "function_call_output",
                              "call_id": call["call_id"],
                              "output": json.dumps(result, ensure_ascii=False)})
            continue
        raw = _final_text(response)
        try:
            answer = json.loads(raw)
        except json.JSONDecodeError:
            answer = None
        if isinstance(answer, dict) and not answer.get("data_version"):
            answer["data_version"] = tools.data_version
        errors = validate_answer(answer) if answer is not None else ["final output is not JSON"]
        if not errors:
            review_mod.enqueue(question, answer, queue_path)
            return answer
        if repaired:
            raise SchemaError("model answer failed schema validation after one "
                              f"repair attempt: {errors}")
        repaired = True
        items.append({"role": "assistant", "content": raw})
        items.append({"role": "user", "content":
                      "Your previous output did not match the required JSON "
                      f"schema: {errors}. Reply again with ONLY a corrected "
                      "JSON object."})
    raise SchemaError(f"no final answer within {MAX_ROUNDS} tool rounds")
