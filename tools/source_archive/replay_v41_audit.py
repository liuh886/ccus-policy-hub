"""Read-only replay of archived v4 CSVs against v4.1 rules, not a live Colab run."""
import argparse
import csv
import hashlib
import json
import sqlite3
from collections import Counter
from pathlib import Path
import ccus_policy_primary_archive as m


def load(path):
    raw = path.read_bytes()
    return list(csv.DictReader(raw.decode('utf-8-sig').splitlines())), hashlib.sha256(raw).hexdigest()


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    for key in ['audit', 'backlog', 'candidates', 'database']:
        parser.add_argument('--' + key, type=Path, required=True)
    args = parser.parse_args()
    audit, audit_sha = load(args.audit)
    backlog, backlog_sha = load(args.backlog)
    candidates, candidate_sha = load(args.candidates)
    db_sha = hashlib.sha256(args.database.read_bytes()).hexdigest()
    db = sqlite3.connect(args.database.resolve().as_uri() + '?mode=ro', uri=True)
    try:
        records = db.execute("SELECT p.id,p.country,p.url,p.source,i.title FROM policies p JOIN policy_i18n i ON i.policy_id=p.id AND i.lang='en' ORDER BY p.id").fetchall()
    finally:
        db.close()
    canonical = [dict(zip(['policy_id', 'country', 'url', 'publisher', 'title'], row), inventory_sha256=db_sha) for row in records]
    ids = {p['policy_id'] for p in canonical}
    for name, rows in [('audit', audit), ('backlog', backlog)]:
        if len(rows) != len(ids) or {r['policy_id'] for r in rows} != ids:
            raise ValueError(name + ' must contain each canonical ID once')
    if any(r['inventory_sha256'] != db_sha for r in audit + backlog + candidates):
        raise ValueError('CSV inventory SHA differs from the canonical SQLite')
    files = [{'id': r['archived_source_file_id'], 'appProperties': {'policy_id': r['policy_id']}}
             for r in backlog if r.get('archived_source_file_id')]
    result = m.make_research_backlog(canonical, audit, files, candidates)
    by_id = {p['policy_id']: p for p in canonical}
    relations = Counter()
    rejected = 0
    for r in candidates:
        if not r.get('candidate_url'):
            continue
        policy = by_id[r['policy_id']]
        relation = m.candidate_relation(policy, r['candidate_url'], r.get('candidate_title', ''), r.get('canonical_url'))
        relations[relation] += 1
        rejected += m.score_candidate(policy, r['candidate_url'], r.get('candidate_title', '')) < 0
    print(json.dumps({'mode': 'offline_replay_not_colab', 'policy_count': len(ids),
        'database_sha256': db_sha, 'input_sha256': {'audit': audit_sha, 'backlog': backlog_sha, 'candidates': candidate_sha},
        'previous_priority': dict(Counter(r['research_priority'] for r in backlog)),
        'replayed_priority': dict(Counter(r['research_priority'] for r in result)),
        'homepage_gaps': [r['policy_id'] for r in result if r['archive_state'] == 'raw_homepage_only'],
        'candidate_relations': dict(relations), 'rejected_suggestions': rejected,
        'new_uploads': 0, 'human_approvals_added': 0}, ensure_ascii=False, indent=2))


if __name__ == '__main__':
    main()
