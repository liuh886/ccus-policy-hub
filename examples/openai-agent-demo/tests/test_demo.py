"""Offline tests: fixture snapshot mimicking the real record shapes.

Run: python -m unittest discover -s tests -v   (no network, no openai package)
"""
import hashlib
import json
import sys
import tempfile
import unittest
from pathlib import Path
from types import SimpleNamespace

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from ccus_demo import data_layer, review as review_mod  # noqa: E402
from ccus_demo.agent import run_question  # noqa: E402
from ccus_demo.tools import HubTools  # noqa: E402

DATASET_VERSIONS = {
    "facility_dataset_name": "Fixture Facilities",
    "facility_dataset_version": "2026-Q2",
    "facility_dataset_source": "fixture",
    "last_checked_date": "2026-06-24",
    "policy_dataset_review_status": "active",
    "country_profile_dataset_version": "2026-Q2",
    "notes": "fixture",
}
MANIFEST = {"version": "1.0.0", "data_as_of": "2026-10-21T00:00:00.000Z",
            "project": "CCUS Policy Hub", "datasets": {}, "known_limitations": []}


def policy(pid, title, desc, country="United States", tags=("45Q",)):
    return {
        "id": pid, "country": country, "year": 2022, "status": "Active",
        "category": "Incentive", "review_status": "verified",
        "legal_weight": "Federal Tax Legislation",
        "source": "U.S. Department of the Treasury / Internal Revenue Service",
        "url": "https://example.test/irs", "pub_date": "2022-08-16",
        "provenance_author": "Fixture Author", "provenance_reviewer": "Fixture Reviewer",
        "provenance_last_audit_date": "2026-07-22",
        "i18n": {
            "en": {"title": title, "description": desc, "scope": "Federal tax credit.",
                   "tags": list(tags)},
            "zh": {"title": title + "（中文）", "description": desc, "scope": "联邦税收抵免。",
                   "tags": list(tags)},
        },
        "analysis": {"incentive": {"score": 95, "label": "Per-tonne credit",
                                   "evidence": "$85/t storage, $180/t DAC.",
                                   "citation": "IRC Section 45Q"}},
    }


def fixture_datasets():
    pol = policy("us-45q-ira", "US 45Q Tax Credit (IRA Enhanced)",
                 "Full-value credit of $85 per metric ton for secure geological "
                 "storage and $180 per metric ton for direct air capture.")
    pol2 = policy("us-obbba-45q-2025", "U.S. Public Law 119-21: 2025 Amendments to Section 45Q",
                  "Parity for utilised CO2 placed in service after July 4, 2025.")
    facility = {
        "id": "100", "country": "United States", "status": "Planned",
        "review_status": None, "estimated_capacity": None,
        "announced_capacity_min": None, "announced_capacity_max": None,
        "announced_capacity_raw": "", "lat": 47.55, "lng": -101.0,
        "precision": "state", "investment_scale": "",
        "linked_policies": ["us-45q-ira", "us-obbba-45q-2025"],
        "provenance_author": "IEA CCUS Projects Database 2026",
        "provenance_reviewer": "", "provenance_last_audit_date": "2026-03-28",
        "i18n": {
            "en": {"name": "CO2 capture at Coal Creek (ND)", "description": "Planned capture project.",
                   "region": "North America", "type": "Capture", "phase": "",
                   "sector": "Power and heat", "fate_of_carbon": "Dedicated storage",
                   "hub": "", "operator": ""},
            "zh": {"name": "CO2 capture at Coal Creek (ND)", "description": "计划中。",
                   "region": "北美", "type": "碳捕集", "phase": "",
                   "sector": "电力与供热", "fate_of_carbon": "永久封存", "hub": "", "operator": ""},
        },
    }
    country = {
        "id": "United States", "region": "Global", "net_zero_year": None,
        "capture_2030": None, "storage_2050": None, "policy_count": 12,
        "facility_count": 374, "provenance_author": None,
        "provenance_reviewer": "CCUS AI Agent", "provenance_last_audit_date": "2026-03-29",
        "i18n": {"en": {"name": "United States", "summary": "US leader in CCUS.",
                        "regulatory_pillars": {"pore_space_rights": "State-level.",
                                               "liability_transfer": "State frameworks."}},
                 "zh": {"name": "美国", "summary": "美国领先。", "regulatory_pillars": {}}},
    }
    wrap = lambda recs: {"data_as_of": "2026-10-21", "count": len(recs), "records": recs}
    return {
        "manifest.json": MANIFEST,
        "dataset-versions.json": DATASET_VERSIONS,
        "quality.json": {"counts": {"policies": 2}},
        "policies.json": wrap([pol, pol2]),
        "facilities.json": wrap([facility]),
        "countries.json": wrap([country]),
    }


def fixture_fetcher_factory(datasets, live_dv=None, live_manifest=None):
    def fetch(url):
        name = url.rsplit("/", 1)[-1]
        if name == "dataset-versions.json" and live_dv is not None:
            return json.dumps(live_dv).encode()
        if name == "manifest.json" and live_manifest is not None:
            return json.dumps(live_manifest).encode()
        return json.dumps(datasets[name]).encode()
    return fetch


def make_tools(tmp):
    datasets = fixture_datasets()
    snap = data_layer.take_snapshot(tmp, base="https://fixture.test",
                                    fetcher=fixture_fetcher_factory(datasets))
    loaded = data_layer.load_snapshot(tmp)
    assert loaded is not None and snap["files"]["policies.json"]["count"] == 2
    return HubTools(loaded, snapshot_dir=tmp), datasets


class TestTools(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.mkdtemp()
        self.tools, _ = make_tools(self.tmp)

    def test_search_policies_en_and_zh(self):
        hits = self.tools.search_policies("45Q")["results"]
        self.assertEqual({h["entity_id"] for h in hits}, {"us-45q-ira", "us-obbba-45q-2025"})
        self.assertTrue(all(h["data_version"] for h in hits))
        zh = self.tools.search_policies("税收抵免")["results"]
        self.assertTrue(zh, "ZH scope text should be searchable")

    def test_get_policy_carries_analysis_and_provenance(self):
        rec = self.tools.get_policy("us-45q-ira")
        self.assertTrue(rec["found"])
        self.assertEqual(rec["analysis"]["incentive"]["score"], 95)
        self.assertEqual(rec["provenance"]["reviewer"], "Fixture Reviewer")
        self.assertFalse(self.tools.get_policy("nope")["found"])

    def test_facility_and_governance(self):
        fac = self.tools.get_facility("100")
        self.assertEqual(fac["sector"], "Power and heat")
        self.assertIn("us-45q-ira", fac["linked_policies"])
        self.assertTrue(any("country-level" in c for c in fac["caveats"]))
        gov = self.tools.get_governance("united states")
        self.assertTrue(gov["found"])
        self.assertIn("pore_space_rights", gov["regulatory_pillars"])
        self.assertTrue(self.tools.get_governance("美国")["found"])

    def test_trace_source(self):
        tr = self.tools.trace_source("us-45q-ira")
        self.assertTrue(tr["found"])
        self.assertEqual(tr["entity_type"], "policy")
        self.assertEqual(tr["source_url"], "https://example.test/irs")
        self.assertFalse(self.tools.trace_source("missing")["found"])


class TestVersionCheck(unittest.TestCase):
    def test_snapshot_hashes(self):
        with tempfile.TemporaryDirectory() as tmp:
            datasets = fixture_datasets()
            snap = data_layer.take_snapshot(tmp, base="https://fixture.test",
                                            fetcher=fixture_fetcher_factory(datasets))
            raw = Path(tmp, "policies.json").read_bytes()
            self.assertEqual(snap["files"]["policies.json"]["sha256"],
                             hashlib.sha256(raw).hexdigest())

    def test_version_ok_changed_unknown(self):
        with tempfile.TemporaryDirectory() as tmp:
            _, datasets = make_tools(tmp)
            ok = data_layer.check_data_version(tmp, fetcher=fixture_fetcher_factory(datasets))
            self.assertEqual(ok["status"], "ok")
            newer = dict(DATASET_VERSIONS, last_checked_date="2026-09-01")
            stale = data_layer.check_data_version(
                tmp, fetcher=fixture_fetcher_factory(datasets, live_dv=newer))
            self.assertEqual(stale["status"], "stale")
            self.assertIn("last_checked_date", stale["details"])

            def boom(_url):
                raise OSError("network down")
            unknown = data_layer.check_data_version(tmp, fetcher=boom)
            self.assertEqual(unknown["status"], "unknown")
            missing = data_layer.check_data_version(Path(tmp) / "nope",
                                                    fetcher=fixture_fetcher_factory(datasets))
            self.assertEqual(missing["status"], "unknown")


class FakeResponses:
    """Scripted stand-in for openai.OpenAI().responses."""

    def __init__(self, script):
        self.script = list(script)

    def create(self, **_kwargs):
        step = self.script.pop(0)
        if step[0] == "call":
            _, name, args = step
            item = SimpleNamespace(type="function_call", call_id="call_1",
                                   id="call_1", name=name,
                                   arguments=json.dumps(args))
            return SimpleNamespace(output=[item], output_text=None)
        _, payload = step
        text = payload if isinstance(payload, str) else json.dumps(payload)
        return SimpleNamespace(output=[], output_text=text)


class FakeClient:
    def __init__(self, script):
        self.responses = FakeResponses(script)


CITATION = {"entity_type": "policy", "entity_id": "us-45q-ira",
            "title": "US 45Q Tax Credit (IRA Enhanced)",
            "source_url": "https://example.test/irs",
            "data_version": "fixture", "evidence_note": "record-level summary"}


def answer_payload(**over):
    base = {"answer": "The full-value credit is $85/t for secure geological storage.",
            "citations": [CITATION], "data_version": "",
            "evidence_level": "record_summary", "gaps": [],
            "refused": False, "refusal_reason": None}
    base.update(over)
    return base


class TestAgentLoop(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.mkdtemp()
        self.tools, _ = make_tools(self.tmp)
        self.queue = Path(self.tmp) / "queue.jsonl"

    def test_tool_call_then_cited_answer(self):
        client = FakeClient([
            ("call", "search_policies", {"query": "45Q"}),
            ("final", answer_payload()),
        ])
        ans = run_question("What is the 45Q storage credit?", self.tools,
                           client=client, queue_path=self.queue)
        self.assertFalse(ans["refused"])
        self.assertEqual(ans["citations"][0]["entity_id"], "us-45q-ira")
        self.assertTrue(ans["data_version"], "data_version filled from the snapshot")
        entries = review_mod.list_entries(self.queue)
        self.assertEqual(len(entries), 1)
        self.assertEqual(entries[0]["status"], "pending")

    def test_refusal_answer(self):
        client = FakeClient([
            ("call", "get_facility", {"facility_id": "100"}),
            ("final", answer_payload(
                answer="I cannot determine this project's 45Q eligibility.",
                refused=True,
                refusal_reason="Record-level data and country-level links cannot "
                               "determine an individual project's tax eligibility.",
                citations=[{"entity_type": "facility", "entity_id": "100",
                            "title": "CO2 capture at Coal Creek (ND)",
                            "source_url": None, "data_version": "fixture",
                            "evidence_note": "project record"}],
                gaps=["project-level capture, storage and filing facts"])),
        ])
        ans = run_question("Does Coal Creek qualify for 45Q?", self.tools,
                           client=client, queue_path=self.queue)
        self.assertTrue(ans["refused"])
        self.assertIn("eligibility", ans["refusal_reason"])

    def test_schema_repair_retry(self):
        client = FakeClient([
            ("final", {"answer": "missing most fields"}),
            ("final", answer_payload()),
        ])
        ans = run_question("45Q?", self.tools, client=client, queue_path=self.queue)
        self.assertFalse(ans["refused"])


class TestReviewQueue(unittest.TestCase):
    def test_approve_reject_and_gold_gating(self):
        with tempfile.TemporaryDirectory() as tmp:
            queue = Path(tmp) / "queue.jsonl"
            gold = Path(tmp) / "gold.jsonl"
            e1 = review_mod.enqueue("q1", answer_payload(), queue)
            e2 = review_mod.enqueue("q2", answer_payload(), queue)
            review_mod.set_status(e1["id"], "approved", reviewer="Z", queue_path=queue)
            review_mod.set_status(e2["id"], "rejected", reviewer="Z",
                                  note="citation wrong", queue_path=queue)
            entries = {e["id"]: e for e in review_mod.list_entries(queue)}
            self.assertEqual(entries[e2["id"]]["note"], "citation wrong")
            self.assertIsNotNone(entries[e1["id"]]["reviewed_at"])
            n = review_mod.export_gold(queue, gold)
            self.assertEqual(n, 1)
            gold_rows = [json.loads(l) for l in gold.read_text().splitlines()]
            self.assertEqual(gold_rows[0]["question"], "q1")


if __name__ == "__main__":
    unittest.main()
