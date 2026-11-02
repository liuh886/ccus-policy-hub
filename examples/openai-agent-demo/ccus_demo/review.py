"""Human-review queue.

Every answer the agent produces lands here as `pending`. A human approves or
rejects it (with a note). Only approved records may be exported to the gold
evaluation set. Nothing is ever auto-approved: an answer becomes 'verified'
only through a recorded human decision.
"""
from __future__ import annotations

import json
import uuid
from datetime import datetime, timezone
from pathlib import Path


def default_queue_path() -> Path:
    return Path(__file__).resolve().parent.parent / "review" / "queue.jsonl"


def _now() -> str:
    return datetime.now(timezone.utc).isoformat()


def enqueue(question: str, answer_record: dict, queue_path=None) -> dict:
    path = Path(queue_path) if queue_path else default_queue_path()
    path.parent.mkdir(parents=True, exist_ok=True)
    entry = {
        "id": uuid.uuid4().hex[:12],
        "question": question,
        "answer_record": answer_record,
        "status": "pending",
        "reviewer": None,
        "reviewed_at": None,
        "note": None,
    }
    with path.open("a", encoding="utf-8") as fh:
        fh.write(json.dumps(entry, ensure_ascii=False) + "\n")
    return entry


def list_entries(queue_path=None) -> list[dict]:
    path = Path(queue_path) if queue_path else default_queue_path()
    if not path.exists():
        return []
    return [json.loads(line) for line in path.read_text(encoding="utf-8").splitlines() if line.strip()]


def _rewrite(entries: list[dict], queue_path) -> None:
    path = Path(queue_path)
    path.parent.mkdir(parents=True, exist_ok=True)
    with path.open("w", encoding="utf-8") as fh:
        for e in entries:
            fh.write(json.dumps(e, ensure_ascii=False) + "\n")


def set_status(entry_id: str, status: str, reviewer: str | None = None,
               note: str | None = None, queue_path=None) -> dict:
    if status not in ("approved", "rejected"):
        raise ValueError("status must be 'approved' or 'rejected'")
    path = Path(queue_path) if queue_path else default_queue_path()
    entries = list_entries(path)
    for e in entries:
        if e["id"] == entry_id:
            e["status"] = status
            e["reviewer"] = reviewer
            e["reviewed_at"] = _now()
            e["note"] = note
            _rewrite(entries, path)
            return e
    raise KeyError(f"no review entry with id {entry_id}")


def export_gold(queue_path=None, gold_path=None) -> int:
    """Write approved entries only to the gold eval file. Returns the count."""
    qpath = Path(queue_path) if queue_path else default_queue_path()
    gpath = (Path(gold_path) if gold_path
             else qpath.parent.parent / "eval" / "gold.jsonl")
    gpath.parent.mkdir(parents=True, exist_ok=True)
    approved = [e for e in list_entries(qpath) if e["status"] == "approved"]
    with gpath.open("w", encoding="utf-8") as fh:
        for e in approved:
            fh.write(json.dumps(
                {"id": e["id"], "question": e["question"],
                 "answer_record": e["answer_record"],
                 "reviewer": e["reviewer"], "reviewed_at": e["reviewed_at"]},
                ensure_ascii=False) + "\n")
    return len(approved)
