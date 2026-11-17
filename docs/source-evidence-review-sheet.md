# Historical source and locator review sheet

Status: **reviewed** (`packet.json` `review.status: verified`, `method: human`; bounded to the 2024 historical snapshot & locator — does not establish current law or project eligibility).

| Field                  | Frozen value                                                     |
| ---------------------- | ---------------------------------------------------------------- |
| Document               | us-45q-usc-2024                                                  |
| Existing policy        | us-45q-ira                                                       |
| Edition                | 2024                                                             |
| Source coverage cutoff | 2025-01-06                                                       |
| Retrieval              | 2026-10-29T11:25:37Z                                             |
| Publication date       | unknown                                                          |
| Locator                | 26 USC 45Q(d), 2024 edition                                      |
| Offsets                | 8139–9207, UTF-16 code units                                     |
| Raw SHA-256            | 1a5f12bac2314d5cad5bd99495ddf5dd9502d46bcbaf184841865d20f4fc2200 |
| Normalized SHA-256     | 4503dd2f085456ef627c532648cac986414eb77f0ed0c2485932bb631f2f2f3b |
| Extractor              | govinfo-usc-html-v1                                              |
| Human reviewer/date    | liuh886 / 2026-11-17                                             |

[Official original](https://www.govinfo.gov/content/pkg/USCODE-2024-title26/html/USCODE-2024-title26-subtitleA-chap1-subchapA-partIV-subpartD-sec45Q.htm); frozen input: [source.html](../scripts/data/evidence/us-45q-2024/source.html); review metadata: [packet.json](../scripts/data/evidence/us-45q-2024/packet.json).

## Exact normalized quote

> (d) Qualified facility
> For purposes of this section, the term "qualified facility" means any industrial facility or direct air capture facility—
> (1) the construction of which begins before January 1, 2033, and either—
> (A) construction of carbon capture equipment begins before such date, or
> (B) the original planning and design for such facility includes installation of carbon capture equipment, and
> (2) which—
> (A) in the case of a direct air capture facility, captures not less than 1,000 metric tons of qualified carbon oxide during the taxable year,
> (B) in the case of an electricity generating facility—
> (i) captures not less than 18,750 metric tons of qualified carbon oxide during the taxable year, and
> (ii) with respect to any carbon capture equipment for the applicable electric generating unit at such facility, has a capture design capacity of not less than 75 percent of the baseline carbon oxide production of such unit, or
> (C) in the case of any other facility, captures not less than 12,500 metric tons of qualified carbon oxide during the taxable year.

## Scope of the human review

`liuh886` reviewed and signed off on `2026-11-17` that the frozen original's
identity and historical coverage match the 2024 edition of `26 USC 45Q(d)`
(coverage cutoff `2025-01-06`) and that the complete normalized quote and UTF-16
offsets `8139–9207` accurately match that original, including alternatives and
category-specific requirements. This review is strictly bounded to the 2024
edition snapshot and locator: it explicitly does **not** approve current-law
coverage (`source_currentness_verified` remains `false`), later amendments or
guidance, project eligibility, a tax calculation, or an Agent answer.

Machine checks also verify raw/text hashes, unique quote recovery, and
source-version binding. Any future change to the frozen source bytes or
extractor version automatically invalidates anchor usability until re-reviewed.
