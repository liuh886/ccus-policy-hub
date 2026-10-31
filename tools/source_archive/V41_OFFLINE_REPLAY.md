# v4.1 observed-input replay — not live Colab acceptance

The source inputs are actual v4 exports retained in the owner's private archive.
Only aggregate results and public canonical policy IDs are recorded here; raw
CSV files, Drive IDs and original source texts are not republished.

| Artifact                                                       | Rows / IDs | SHA-256                                                          |
| -------------------------------------------------------------- | ---------- | ---------------------------------------------------------------- |
| Policy_Primary_Source_Audit_20261029T202058Z.csv               | 130 / 130  | 066d5aab4e2da2ad9da4a407431b95e8fe9ef5a8115c999c02872c1d83ad5997 |
| Policy_Source_Review_Candidates_20261029T202117Z.csv           | 143 / 130  | d9b7004ea4f39f7ce7a8477fab5686df15761585f86baedd3738bff13f76ae5b |
| Policy_Official_Registry_Research_Backlog_20261029T202118Z.csv | 130 / 130  | 4047d663b5e6138759993d4b7a3596d2ab7b563dc89f2bd664d53478f5f6a25b |

All rows bind to SQLite SHA-256
`1aa9c830c7cd13dd026ebf6118bff9df590b05dc70bea1de0c8567aac15fa53d`.

```bash
python tools/source_archive/replay_v41_audit.py --database agent/ccus-ai-agent/db/ccus_master.sqlite --audit <private-v4-audit.csv> --backlog <private-v4-backlog.csv> --candidates <private-v4-review.csv>
```

Observed v4 priorities: P0=51, P1=35, P2=44. Replay with the corrective rules:
P0=59, P1=35, P2=36. All eight homepage-only files remain identifiable while their
policy records are no longer treated as having instrument-level evidence.

The 21 original suggestions classify as 5 navigation, 4 same-instrument internal
sections, 3 related-secondary and 9 unknown. Seven of those old suggestions fail
the current scorer. This is not a newly generated Colab candidate queue, nor is
any classifier output human verification of instrument identity or edition.

No requests, uploads, approvals or SQLite writes occur in replay. The 36/130
non-homepage candidate baseline is unchanged and is not verified legal coverage.
A fresh post-change Colab run and actual Drive notebook/export parity remain
required for live acceptance. The old Drive notebooks must not be described as
v4.1 merely because the generated Git derivatives pass checks.
