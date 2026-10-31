# CCUS Policy Hub — 2026-10-31 manual first-party source archive round 04

## Executive result

- **Baseline**: 130 canonical policy IDs; 55 had non-homepage raw source candidates and 63 physical files in `02_Primary_Policies` before this round.
- **This round**: 20 attempted original URLs across GitHub Actions batches 08–11; 11 files transferred; **five** distinct additional Policy IDs received non-homepage raw source candidates. **Six** other transfers were auxiliary/not-document, stored outside the primary folder.
- **Final candidate coverage**: **60/130 = 46.15%**, up **3.85 percentage points** (55→60). **70 policies** remain without a non-homepage source candidate. This is not confirmed complete/correct legal instrument coverage.
- **Primary folder contains 68 physical files**, initial 63 plus 5; all five new source IDs and byte counts read back from Drive; source SHA-256 computed on raw bytes and checked against GitHub acquisition manifests. No files overwritten.
- The baseline 36 `already_archived` status is a canonical URL acquisition-run metric only. Cumulative raw candidate coverage is **36 existing + 24 independently archived = 60**; the Colab integration defect remains open.
- Source edition, regulatory force, exact canonical identity, legal citation and redistribution licensing remain pending human review. SQLite unchanged; no auto-approval or public republishing.

## Five new official or publisher-source evidence candidates

| Policy ID | Primary document | Google Drive (private) | Evidence boundary |
|---|---|---|---|
| `in-union-budget-2026-ccus` | India's official 2026–27 budget speech PDF (p.12 ¶38) | [PDF](https://drive.google.com/file/d/1a1965f8nOJt1MkoBlgXEzaSvXUJxfS_R/view) | CCUS funding **announcement**, not operational/approved subsidy scheme |
| `us-iija-hubs` | US Public Law 117-58 original full statute HTML | [HTML](https://drive.google.com/file/d/1l620z7JofQ90ynn9X2h_29AbRXS8qgXQ/view) | Contains CIFIA. Potential duplicate policy identity with `us-cifia-lpo` |
| `ar-rigi-ccus-2024` | Argentina Ley 27.742 original consolidated site text, RIGI Title VII | [HTML](https://drive.google.com/file/d/1VhH29fmwYTuwgQ-TFDLjgos2MDJN6i8i/view) | Investment regime, not a separately enacted CCUS scheme |
| `nl-cdr-roadmap-2025` | Netherlands government 2025 CDR Roadmap **complete 57-page PDF** | [PDF](https://drive.google.com/file/d/1KAzwPFK8vHK34fDLLJ5Aki2Vb2HOARQF/view) | Policy roadmap (not a binding regulation) |
| `ipcc-guidelines` | IPCC 2019 Refinement complete **46,583,884-byte ZIP**, 69 ZIP entries including overview and all five volumes | [ZIP](https://drive.google.com/file/d/1i_6iFZDDPhDT8UGFdXj32YqPv9DHljeq/view) | 2019 refinement; **original 2006 Guidelines** are separate |

## Excluded but retained supporting evidence

- NITI Aayog 2022 CCUS report is **not** a 2024 National Mission enactment.
- SAMR 2026 12-standards *announcement* is **not** the dozen GB/GB-T full original standards.
- 2025 CCUS roadmap book-release page does not supply the roadmap text.
- US EPA primacy programme page supplies context, **not** individual state-specific Class VI approvals or federal CFR text.
- UNFCCC Article 6.4 rules/standards **index** is not a singular approved CCS/CDR methodology.
- Swiss Fedlex scripted placeholder is explicitly **rejected** as not an original policy instrument.
- These files are in the private `00_Catalog_and_Metadata` research folder; none is counted in the five.

## Retrieval obstacles and research lessons

- Historic general URL for Netherlands CDR PDF returned HTTP 404; the verified **new 2025 site/binaries** PDF link worked. Preserve actual final publisher URL in manifest.
- Argentina first source returned HTTP 500; official tax-agency original legal text succeeded on an alternate publisher URL.
- UAE Federal Decree-Law 11/2024 and Japan e-Gov 2024 CCS Act were 403; Korea legal registry DNS error; CIFIA US House link returned 404/timeout; Colombia SSL certificate error; Nigeria 2024 regulatory press PDF 404. None is promoted without original bytes.
- IPCC all-volumes ZIP is bitwise intact and contains 69 ZIP entries; downloaded source hash: `f9e9de413a54632faa01a15e87f79c2e48e156695200fe6b354b1fffbd19c665`.

## Suggested next engineering actions

1. Keep the 70 policy evidence gaps in a curated queue: exact statute vs amendment vs policy statement vs umbrella programme vs standard; require specific instrument IDs.
2. Fix Colab cumulative inventory reconciliation against immutable SHA manifest + Drive IDs; don't equate `already_archived=36` with total coverage.
3. Prioritize new exact primary evidence for Alberta TIER Regulation 133/2019, EU CCS Directive and NZIA via alternate official EU publishers, Japanese CCS Act 38/2024 (full original), German 2025 KSpTG reform as a *separate* subinstrument (don't silently map to 2024 strategy), and UAE legislation.
4. In a distinct controlled policy-identity PR, review `us-iija-hubs` / `us-cifia-lpo` overlap and combined titles; don't mutate canonical SQLite during evidence acquisition.

## Reproducibility / provenance

- GitHub PR branch `feat/source-archive-colab-incremental-20261030`, PR #107.
- Exact acquisition programs: `tools/source_archive/manual_acquire_batch08.py`, `manual_acquire_batch09.py`, `manual_acquire_batch10.py` (ZIP support), and `manual_acquisition_batch11.csv`.
- All four batches' original GitHub Actions artifacts were also retained separately in metadata Drive folder; full row-level source URL, SHA-256, file ID, byte length, role and error reason in accompanying CSV.
