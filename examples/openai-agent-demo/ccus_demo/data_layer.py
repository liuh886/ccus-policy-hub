"""Data layer: snapshot the Hub's published static data, hash it, check versions.

The Hub publishes governed static JSON under <base>/data/. This module fetches
those files once into a local snapshot (with SHA-256 per file) so the agent
works against a fixed, citable data version, and can later detect drift.
"""
from __future__ import annotations

import hashlib
import json
import os
import urllib.request
from datetime import datetime, timezone
from pathlib import Path

DEFAULT_BASE_URL = "https://liuh886.github.io/ccus-policy-hub"
DATA_FILES = [
    "manifest.json",
    "dataset-versions.json",
    "quality.json",
    "policies.json",
    "facilities.json",
    "countries.json",
]


def base_url() -> str:
    return os.environ.get("CCUS_HUB_BASE_URL", DEFAULT_BASE_URL).rstrip("/")


def _urllib_fetch(url: str) -> bytes:
    req = urllib.request.Request(url, headers={"User-Agent": "ccus-agent-demo/0.1"})
    with urllib.request.urlopen(req, timeout=60) as resp:
        return resp.read()


def take_snapshot(snapshot_dir, base=None, fetcher=None) -> dict:
    """Fetch all data files into snapshot_dir; write snapshot.json; return it."""
    base = (base or base_url()).rstrip("/")
    fetch = fetcher or _urllib_fetch
    snap_dir = Path(snapshot_dir)
    snap_dir.mkdir(parents=True, exist_ok=True)
    files_meta, parsed = {}, {}
    for name in DATA_FILES:
        raw = fetch(f"{base}/data/{name}")
        (snap_dir / name).write_bytes(raw)
        parsed[name] = json.loads(raw)
        files_meta[name] = {
            "sha256": hashlib.sha256(raw).hexdigest(),
            "bytes": len(raw),
            "count": parsed[name].get("count") if isinstance(parsed[name], dict) else None,
        }
    snapshot = {
        "fetched_at": datetime.now(timezone.utc).isoformat(),
        "base_url": base,
        "dataset_versions": parsed["dataset-versions.json"],
        "manifest_version": parsed["manifest.json"].get("version"),
        "data_as_of": parsed["manifest.json"].get("data_as_of"),
        "files": files_meta,
    }
    (snap_dir / "snapshot.json").write_text(
        json.dumps(snapshot, ensure_ascii=False, indent=2), encoding="utf-8"
    )
    return snapshot


def load_snapshot(snapshot_dir) -> dict | None:
    """Return {'meta': snapshot.json, 'datasets': {filename: parsed}} or None."""
    snap_dir = Path(snapshot_dir)
    meta_file = snap_dir / "snapshot.json"
    if not meta_file.exists():
        return None
    datasets = {}
    for name in DATA_FILES:
        f = snap_dir / name
        if f.exists():
            datasets[name] = json.loads(f.read_text(encoding="utf-8"))
    return {"meta": json.loads(meta_file.read_text(encoding="utf-8")), "datasets": datasets}


def data_version_string(meta: dict) -> str:
    """One-line data version identifier used in every citation/answer."""
    dv = meta.get("dataset_versions", {})
    return (
        f"facilities {dv.get('facility_dataset_version')}, "
        f"countries {dv.get('country_profile_dataset_version')}, "
        f"policy review {dv.get('policy_dataset_review_status')}, "
        f"last checked {dv.get('last_checked_date')}, "
        f"manifest {meta.get('manifest_version')}, data as of {meta.get('data_as_of')}"
    )


def check_data_version(snapshot_dir, base=None, fetcher=None) -> dict:
    """Compare the local snapshot against the live published version metadata.

    status: ok (identical) | stale (live metadata is newer) | changed
    (metadata differs, not clearly newer) | unknown (no snapshot or the live
    check could not be performed -- never silently 'ok').
    """
    base = (base or base_url()).rstrip("/")
    fetch = fetcher or _urllib_fetch
    snap = load_snapshot(snapshot_dir)
    if snap is None:
        return {"status": "unknown", "snapshot_version": None, "live_version": None,
                "details": "no local snapshot found; run `snapshot` first"}
    meta = snap["meta"]
    snap_version = data_version_string(meta)
    try:
        live_dv = json.loads(fetch(f"{base}/data/dataset-versions.json"))
        live_manifest = json.loads(fetch(f"{base}/data/manifest.json"))
    except Exception as exc:  # network or parse failure: report, don't guess
        return {"status": "unknown", "snapshot_version": snap_version, "live_version": None,
                "details": f"live check failed: {exc}"}
    live_meta = {"dataset_versions": live_dv,
                 "manifest_version": live_manifest.get("version"),
                 "data_as_of": live_manifest.get("data_as_of")}
    live_version = data_version_string(live_meta)
    diffs = []
    for key in set(meta["dataset_versions"]) | set(live_dv):
        if meta["dataset_versions"].get(key) != live_dv.get(key):
            diffs.append(f"dataset-versions.{key}: {meta['dataset_versions'].get(key)!r} -> {live_dv.get(key)!r}")
    for key in ("manifest_version", "data_as_of"):
        if meta.get(key) != live_meta.get(key):
            diffs.append(f"{key}: {meta.get(key)!r} -> {live_meta.get(key)!r}")
    if not diffs:
        return {"status": "ok", "snapshot_version": snap_version, "live_version": live_version,
                "details": "snapshot matches the live published version metadata"}
    live_checked = str(live_dv.get("last_checked_date") or "")
    snap_checked = str(meta["dataset_versions"].get("last_checked_date") or "")
    status = "stale" if live_checked > snap_checked else "changed"
    return {"status": status, "snapshot_version": snap_version, "live_version": live_version,
            "details": "version metadata differs: " + "; ".join(diffs)}
