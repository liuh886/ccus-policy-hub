# Observed Colab run: 2026-10-30

The owner supplied the run log. Three corresponding CSVs were read from the
private local archive; no private file IDs or original texts are reproduced here.
This validates the observed output, not notebook code-cell parity or legal review.

| Export                                                         | Rows / unique policy IDs | SHA-256                                                          |
| -------------------------------------------------------------- | ------------------------ | ---------------------------------------------------------------- |
| Policy_Primary_Source_Audit_20261030T042348Z.csv               | 130 / 130                | f8990ac91f9a443ed81117efe9b87b0099c16c5dda90d8a66f83ecf0f4922909 |
| Policy_Source_Review_Candidates_20261030T042407Z.csv           | 139 / 130                | 238c4bdd4b4f18021b7f7a260ed63e4e7ef468253fd3d861c92e0d77de8d8f16 |
| Policy_Official_Registry_Research_Backlog_20261030T042408Z.csv | 130 / 130                | e012e3adbda2b9ab5c146520e1e2b395034a5d083409efc208d57029b4c94c74 |

All rows bind to canonical SQLite checksum
`1aa9c830c7cd13dd026ebf6118bff9df590b05dc70bea1de0c8567aac15fa53d`.

- Backlog priorities: P0=59, P1=35, P2=36. All eight homepage-only records are P0.
- Audit: 36 already archived, 44 broad sources, 10 not found, 13 official-source
  reviews, 5 non-HTTPS, 5 network errors, 5 access blocked, 6 HTTP 202,
  3 blocked HTML, 2 redirects outside official hosts and 1 short HTML. No new upload.
- Queue: 17 nonempty candidate URLs; four internal sections and three related
  secondary materials are labeled separately. No navigation relation remains.
  All 139 relation reviews remain `not_reviewed`; seven year-token matches remain
  explicitly unverified.

The local notebook with the original filename contains one code cell and fails
the generated four-code-cell export comparison. It cannot establish the identity
of the notebook actually executed. An export of that executed notebook is still
needed for executable-cell parity; this mismatch does not invalidate the CSVs.

Later manual acquisitions are a separate observation: the latest owner report in
PR #107 states 63 private files and 55/130 non-homepage raw candidates. The run's
36 `already_archived` entries are not cumulative coverage. Filename discovery is
only a hint; reconcile manual manifests, full hashes, file IDs and evidence roles
before accepting a cumulative inventory. Supporting materials do not count as
the named instrument, and raw candidates remain legally unverified.

Remote follow-up commits through `080732b9` accidentally removed the v4.1 relation
classifier, unverified-year label and homepage discovery label. The corrective
follow-up restores those behaviors while retaining manual filename discovery,
regenerates the notebook, and fixes the closeout document's formatting. No cloud
execution, SQLite mutation, automatic approval or source publication is performed.
