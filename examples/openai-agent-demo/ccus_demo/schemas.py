"""OpenAI tool schemas + the structured answer schema and its validator."""
from __future__ import annotations


def _fn(name, description, properties, required):
    return {
        "type": "function", "name": name, "description": description,
        "parameters": {"type": "object", "properties": properties,
                       "required": required, "additionalProperties": False},
        "strict": False,
    }


TOOL_SCHEMAS = [
    _fn("search_policies",
        "Keyword-search policy records (EN+ZH title/description/scope/tags).",
        {"query": {"type": "string"},
         "country": {"type": ["string", "null"]},
         "limit": {"type": "integer"}},
        ["query"]),
    _fn("get_policy", "Get one full policy record by id, incl. analysis dimensions.",
        {"policy_id": {"type": "string"}}, ["policy_id"]),
    _fn("search_facilities", "Keyword-search facility/project records.",
        {"query": {"type": "string"}, "limit": {"type": "integer"}}, ["query"]),
    _fn("get_facility", "Get one facility record by id, incl. linked policies and caveats.",
        {"facility_id": {"type": "string"}}, ["facility_id"]),
    _fn("get_governance", "Get a country governance profile (regulatory pillars).",
        {"country_code_or_name": {"type": "string"}}, ["country_code_or_name"]),
    _fn("trace_source", "Get provenance/source/version fields for a policy, facility or country id.",
        {"entity_id": {"type": "string"}}, ["entity_id"]),
    _fn("check_data_version", "Compare the local data snapshot with the live published version.",
        {}, []),
]

ANSWER_SCHEMA = {
    "type": "object",
    "properties": {
        "answer": {"type": "string"},
        "citations": {
            "type": "array",
            "items": {
                "type": "object",
                "properties": {
                    "entity_type": {"type": "string", "enum": ["policy", "facility", "country"]},
                    "entity_id": {"type": "string"},
                    "title": {"type": ["string", "null"]},
                    "source_url": {"type": ["string", "null"]},
                    "data_version": {"type": "string"},
                    "evidence_note": {"type": "string"},
                },
                "required": ["entity_type", "entity_id", "title", "source_url",
                             "data_version", "evidence_note"],
                "additionalProperties": False,
            },
        },
        "data_version": {"type": "string"},
        "evidence_level": {"type": "string"},
        "gaps": {"type": "array", "items": {"type": "string"}},
        "refused": {"type": "boolean"},
        "refusal_reason": {"type": ["string", "null"]},
    },
    "required": ["answer", "citations", "data_version", "evidence_level",
                 "gaps", "refused", "refusal_reason"],
    "additionalProperties": False,
}


def validate_answer(obj) -> list[str]:
    """Dependency-free shape check for ANSWER_SCHEMA. Returns error strings."""
    errs = []
    if not isinstance(obj, dict):
        return ["answer is not a JSON object"]
    for key in ANSWER_SCHEMA["required"]:
        if key not in obj:
            errs.append(f"missing key: {key}")
    if errs:
        return errs
    if not isinstance(obj["answer"], str) or not obj["answer"].strip():
        errs.append("answer must be a non-empty string")
    if not isinstance(obj["data_version"], str) or not obj["data_version"]:
        errs.append("data_version must be a non-empty string")
    if not isinstance(obj["evidence_level"], str) or not obj["evidence_level"]:
        errs.append("evidence_level must be a non-empty string")
    if not isinstance(obj["gaps"], list) or not all(isinstance(g, str) for g in obj["gaps"]):
        errs.append("gaps must be a list of strings")
    if not isinstance(obj["refused"], bool):
        errs.append("refused must be a boolean")
    if obj.get("refused"):
        if not (isinstance(obj.get("refusal_reason"), str) and obj["refusal_reason"].strip()):
            errs.append("refused=true requires a non-empty refusal_reason")
    elif obj.get("refusal_reason") not in (None, ""):
        errs.append("refusal_reason must be null when refused=false")
    cits = obj["citations"]
    if not isinstance(cits, list):
        errs.append("citations must be a list")
    else:
        if not obj["refused"] and not cits:
            errs.append("a non-refused answer must carry at least one citation")
        for i, c in enumerate(cits):
            if not isinstance(c, dict):
                errs.append(f"citations[{i}] is not an object")
                continue
            for key in ("entity_type", "entity_id", "title", "source_url",
                        "data_version", "evidence_note"):
                if key not in c:
                    errs.append(f"citations[{i}] missing key: {key}")
            if c.get("entity_type") not in ("policy", "facility", "country"):
                errs.append(f"citations[{i}].entity_type is invalid")
            if not isinstance(c.get("entity_id"), str) or not c.get("entity_id"):
                errs.append(f"citations[{i}].entity_id must be a non-empty string")
    return errs
