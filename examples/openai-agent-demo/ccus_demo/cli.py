"""CLI: snapshot | ask | review | version.

Run from the demo root:  python -m ccus_demo.cli <command>
"""
from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path

from . import data_layer, review as review_mod
from .tools import HubTools

ROOT = Path(__file__).resolve().parent.parent
SNAPSHOT_DIR = ROOT / "snapshot"


def _tools() -> HubTools:
    loaded = data_layer.load_snapshot(SNAPSHOT_DIR)
    if loaded is None:
        raise SystemExit("error: no snapshot found. Run `python -m ccus_demo.cli snapshot` first.")
    return HubTools(loaded, snapshot_dir=SNAPSHOT_DIR)


def cmd_snapshot(_args) -> int:
    snap = data_layer.take_snapshot(SNAPSHOT_DIR)
    print(f"snapshot saved to {SNAPSHOT_DIR}")
    print(f"data version: {data_layer.data_version_string(snap)}")
    for name, meta in snap["files"].items():
        print(f"  {name}: {meta['bytes']} bytes, count={meta['count']}, sha256={meta['sha256'][:16]}...")
    return 0


def cmd_version(_args) -> int:
    result = data_layer.check_data_version(SNAPSHOT_DIR)
    print(json.dumps(result, ensure_ascii=False, indent=2))
    return 0


def cmd_ask(args) -> int:
    from .agent import DemoError, run_question  # lazy: keeps offline commands light
    tools = _tools()
    try:
        answer = run_question(args.question, tools)
    except DemoError as exc:
        print(f"error: {exc}", file=sys.stderr)
        return 2
    print(json.dumps(answer, ensure_ascii=False, indent=2))
    print("\n(answer appended to the human-review queue as 'pending')", file=sys.stderr)
    return 0


def cmd_review(args) -> int:
    if args.action == "list":
        entries = review_mod.list_entries()
        if not entries:
            print("review queue is empty")
            return 0
        for e in entries:
            refused = e["answer_record"].get("refused")
            print(f"{e['id']}  [{e['status']}]  refused={refused}  {e['question'][:80]}")
        return 0
    if args.action in ("approve", "reject"):
        status = "approved" if args.action == "approve" else "rejected"
        try:
            e = review_mod.set_status(args.id, status, reviewer=args.reviewer, note=args.note)
        except KeyError as exc:
            print(f"error: {exc}", file=sys.stderr)
            return 2
        print(f"{e['id']} -> {e['status']} (reviewer={e['reviewer']})")
        return 0
    if args.action == "export":
        n = review_mod.export_gold()
        print(f"exported {n} approved record(s) to eval/gold.jsonl")
        return 0
    return 2


def main(argv=None) -> int:
    parser = argparse.ArgumentParser(prog="ccus_demo", description=__doc__)
    sub = parser.add_subparsers(dest="command", required=True)
    sub.add_parser("snapshot", help="fetch the Hub data files and hash them")
    sub.add_parser("version", help="check the snapshot against the live version")
    p_ask = sub.add_parser("ask", help="ask one question through the agent")
    p_ask.add_argument("question")
    p_rev = sub.add_parser("review", help="human-review queue")
    p_rev.add_argument("action", choices=["list", "approve", "reject", "export"])
    p_rev.add_argument("id", nargs="?")
    p_rev.add_argument("--note", default=None)
    p_rev.add_argument("--reviewer", default=None)
    args = parser.parse_args(argv)
    if args.command == "snapshot":
        return cmd_snapshot(args)
    if args.command == "version":
        return cmd_version(args)
    if args.command == "ask":
        return cmd_ask(args)
    if args.command == "review":
        if args.action in ("approve", "reject") and not args.id:
            print("error: approve/reject need an entry id", file=sys.stderr)
            return 2
        return cmd_review(args)
    return 2


if __name__ == "__main__":
    raise SystemExit(main())
