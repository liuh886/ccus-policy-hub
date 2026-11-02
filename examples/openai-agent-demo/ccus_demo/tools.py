"""Six tools over the snapshot. Pure functions of the loaded data; every fact
carries citation fields (entity_id, title, source, source_url, data_version).

Real record shapes (verified against the live files on 2026-11-02):
- policy:   {id, country, year, status, category, review_status, legal_weight,
             source, url, pub_date, provenance_author/reviewer/last_audit_date,
             i18n: {en|zh: {title, description, scope, tags[]}},
             analysis: {dim: {score, label, evidence, citation}}}
- facility: {id, country, status, review_status, estimated_capacity,
             announced_capacity_min/max/raw, lat, lng, precision,
             linked_policies[], provenance_*,
             i18n: {en|zh: {name, description, region, type, phase, sector,
                            fate_of_carbon, hub, operator, ...}}}
- country:  {id (the country name), region, net_zero_year, capture_2030,
             storage_2050, policy_count, facility_count, provenance_*,
             i18n: {en|zh: {name, summary, regulatory_pillars{...}}}}
Dataset wrappers are {data_as_of, count, records[]}.
"""
from __future__ import annotations

from . import data_layer

LINK_CAVEAT = (
    "Facility-policy links in this dataset are predominantly country-level "
    "context links (see quality.facility_policy_links); a link is NOT proof "
    "that a policy applies to that specific facility or project."
)
CAPACITY_CAVEAT = (
    "Facility capacities are project-record values (announced/estimated); "
    "they are not net deliverable capture or storage capacity."
)


def _en(record: dict) -> dict:
    return record.get("i18n", {}).get("en", {})


def _zh(record: dict) -> dict:
    return record.get("i18n", {}).get("zh", {})


def _provenance(record: dict) -> dict:
    return {
        "author": record.get("provenance_author"),
        "reviewer": record.get("provenance_reviewer"),
        "last_audit_date": record.get("provenance_last_audit_date"),
        "review_status": record.get("review_status"),
    }


class HubTools:
    """The six agent tools, bound to one loaded snapshot."""

    def __init__(self, loaded: dict, snapshot_dir=None, fetcher=None):
        self.meta = loaded["meta"]
        ds = loaded["datasets"]
        self.policies = ds["policies.json"]["records"]
        self.facilities = ds["facilities.json"]["records"]
        self.countries = ds["countries.json"]["records"]
        self.quality = ds.get("quality.json", {})
        self.data_version = data_layer.data_version_string(self.meta)
        self._snapshot_dir = snapshot_dir
        self._fetcher = fetcher
        self._policy_by_id = {p["id"]: p for p in self.policies}
        self._facility_by_id = {f["id"]: f for f in self.facilities}
        self._country_by_id = {c["id"]: c for c in self.countries}

    # -- citation helpers -------------------------------------------------
    def _policy_citation(self, p: dict) -> dict:
        return {
            "entity_type": "policy", "entity_id": p["id"],
            "title": _en(p).get("title"), "source": p.get("source"),
            "source_url": p.get("url"), "data_version": self.data_version,
            "evidence_note": f"record-level summary, review_status={p.get('review_status')}",
        }

    def _facility_citation(self, f: dict) -> dict:
        return {
            "entity_type": "facility", "entity_id": f["id"],
            "title": _en(f).get("name"), "source": f.get("provenance_author"),
            "source_url": None, "data_version": self.data_version,
            "evidence_note": f"project record, coordinate precision={f.get('precision')}",
        }

    # -- tools ------------------------------------------------------------
    def search_policies(self, query: str, country: str | None = None, limit: int = 10) -> dict:
        q = query.lower()
        hits = []
        for p in self.policies:
            if country and p.get("country", "").lower() != country.lower():
                continue
            hay = " ".join([
                p["id"], p.get("country", ""),
                _en(p).get("title", ""), _en(p).get("description", ""), _en(p).get("scope", ""),
                " ".join(_en(p).get("tags", [])),
                _zh(p).get("title", ""), _zh(p).get("description", ""), _zh(p).get("scope", ""),
                " ".join(_zh(p).get("tags", [])),
            ]).lower()
            if q in hay:
                hits.append({
                    **self._policy_citation(p),
                    "title_zh": _zh(p).get("title"), "country": p.get("country"),
                    "year": p.get("year"), "status": p.get("status"),
                    "category": p.get("category"), "legal_weight": p.get("legal_weight"),
                    "scope_en": _en(p).get("scope"),
                })
            if len(hits) >= limit:
                break
        return {"query": query, "count": len(hits), "results": hits,
                "data_version": self.data_version}

    def get_policy(self, policy_id: str) -> dict:
        p = self._policy_by_id.get(policy_id)
        if p is None:
            return {"found": False, "policy_id": policy_id, "data_version": self.data_version}
        return {
            "found": True, **self._policy_citation(p),
            "title_zh": _zh(p).get("title"), "country": p.get("country"),
            "year": p.get("year"), "status": p.get("status"),
            "category": p.get("category"), "legal_weight": p.get("legal_weight"),
            "pub_date": p.get("pub_date"),
            "description_en": _en(p).get("description"),
            "description_zh": _zh(p).get("description"),
            "scope_en": _en(p).get("scope"), "tags_en": _en(p).get("tags"),
            "analysis": p.get("analysis"), "provenance": _provenance(p),
        }

    def search_facilities(self, query: str, limit: int = 10) -> dict:
        q = query.lower()
        hits = []
        for f in self.facilities:
            hay = " ".join([
                f["id"], f.get("country", ""),
                _en(f).get("name", ""), _en(f).get("sector", ""), _en(f).get("type", ""),
                _en(f).get("hub", ""), _zh(f).get("name", ""), _zh(f).get("sector", ""),
            ]).lower()
            if q in hay:
                hits.append(self._facility_summary(f))
            if len(hits) >= limit:
                break
        return {"query": query, "count": len(hits), "results": hits,
                "data_version": self.data_version, "caveat": CAPACITY_CAVEAT}

    def _facility_summary(self, f: dict) -> dict:
        return {
            **self._facility_citation(f),
            "title_zh": _zh(f).get("name"), "country": f.get("country"),
            "status": f.get("status"), "type": _en(f).get("type"),
            "sector": _en(f).get("sector"), "fate_of_carbon": _en(f).get("fate_of_carbon"),
            "estimated_capacity": f.get("estimated_capacity"),
            "precision": f.get("precision"),
            "linked_policies": f.get("linked_policies", []),
        }

    def get_facility(self, facility_id: str) -> dict:
        f = self._facility_by_id.get(str(facility_id))
        if f is None:
            return {"found": False, "facility_id": facility_id, "data_version": self.data_version}
        return {
            "found": True, **self._facility_summary(f),
            "description_en": _en(f).get("description"),
            "announced_capacity_min": f.get("announced_capacity_min"),
            "announced_capacity_max": f.get("announced_capacity_max"),
            "announced_capacity_raw": f.get("announced_capacity_raw"),
            "lat": f.get("lat"), "lng": f.get("lng"),
            "provenance": _provenance(f),
            "caveats": [LINK_CAVEAT, CAPACITY_CAVEAT],
        }

    def get_governance(self, country_code_or_name: str) -> dict:
        key = country_code_or_name.strip()
        c = self._country_by_id.get(key)
        if c is None:  # case-insensitive / localised-name fallback
            low = key.lower()
            for cand in self.countries:
                names = {cand["id"].lower(), (_en(cand).get("name") or "").lower(),
                         (_zh(cand).get("name") or "").lower()}
                if low in names:
                    c = cand
                    break
        if c is None:
            return {"found": False, "country": country_code_or_name,
                    "data_version": self.data_version}
        return {
            "found": True, "entity_type": "country", "entity_id": c["id"],
            "title": _en(c).get("name"), "source": "CCUS Policy Hub country profile",
            "source_url": None, "data_version": self.data_version,
            "region": c.get("region"), "net_zero_year": c.get("net_zero_year"),
            "policy_count": c.get("policy_count"), "facility_count": c.get("facility_count"),
            "summary_en": _en(c).get("summary"),
            "regulatory_pillars": _en(c).get("regulatory_pillars"),
            "provenance": _provenance(c),
        }

    def trace_source(self, entity_id: str) -> dict:
        for kind, index in (("policy", self._policy_by_id),
                            ("facility", self._facility_by_id),
                            ("country", self._country_by_id)):
            rec = index.get(str(entity_id))
            if rec is not None:
                return {
                    "found": True, "entity_type": kind, "entity_id": rec["id"],
                    "source": rec.get("source") or rec.get("provenance_author"),
                    "source_url": rec.get("url"),
                    "provenance": _provenance(rec),
                    "dataset_data_as_of": self.meta.get("data_as_of"),
                    "data_version": self.data_version,
                }
        return {"found": False, "entity_id": entity_id, "data_version": self.data_version}

    def check_data_version(self) -> dict:
        if self._snapshot_dir is None:
            return {"status": "unknown", "snapshot_version": self.data_version,
                    "live_version": None, "details": "no snapshot dir bound to these tools"}
        return data_layer.check_data_version(self._snapshot_dir, fetcher=self._fetcher)


TOOL_NAMES = ["search_policies", "get_policy", "search_facilities",
              "get_facility", "get_governance", "trace_source", "check_data_version"]


def dispatch(tools: HubTools, name: str, args: dict):
    if name not in TOOL_NAMES:
        return {"error": f"unknown tool: {name}"}
    return getattr(tools, name)(**args)
