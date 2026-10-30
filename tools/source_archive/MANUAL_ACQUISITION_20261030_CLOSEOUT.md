# CCUS Policy Hub | Verified manual original-source acquisition (2026-10-30)

## Sources, reproducibility, and counting

Canonical input SQLite SHA-256: `1aa9c830c7cd13dd026ebf6118bff9df590b05dc70bea1de0c8567aac15fa53d`; 130 unique policy IDs. The preceding v4 Colab audit had 36 non-homepage raw source candidates and 44 retained raw files (including eight legacy agency homepages). New manual-source files are immutable, SHA-256 named, stored privately in `02_Primary_Policies`; HTML government registry or document-year mismatches are instead stored only in `00_Catalog_and_Metadata`.

Four GitHub Actions acquisition jobs (bounded HTTPS official-host allowlists, redirect/size limits, no CAPTCHA bypass) attempted 35 policy-source URLs. Each run creates a raw-byte ZIP artifact and a manifest with original URL, final URL, HTTP status, content type, SHA-256, file length, and failure. Local checks inspected the PDF first pages or HTML title/body and rejected a EUR-Lex JavaScript bot challenge. All 16 substantive named raw source candidates were uploaded to Google Drive, and every Drive file ID and size was checked against the combined manifest (0 missing, 0 size mismatches). No canonical SQLite source URL, legal-identity claim, or public website record was modified.

- **16 new policy IDs with non-homepage text candidates** in private Drive, across batches: 6 + 5 + 3 + 2.
- **52 / 130 = 40.00%** non-homepage raw-source-candidate policy coverage (up from 36 / 130 = 27.69%). These are NOT verified enactments/complete legal instruments.
- **60 raw files** in primary Drive folder (44 previous + 16 new), with **8 historical institutional homepages** still not counted.
- **4 supporting-only** official pages or mismatched source records stored in metadata only: South African Act register, Vietnam Decree official registry, Jiangsu 2023 document mislabeled 2022, Russian agency Climate Doctrine index.
- **14 unsuccessful** URL attempts retained in audit (including EUR-Lex PDF block, UAE/Indonesia, Romanian/Iceland government host errors and South African SSL certificate failure); **1 rejected bot-challenge HTML**.

## The 16 successfully retained source candidates

| Policy ID | Edition/role | Drive file ID | Status caveat |
|---|---|---|---|
| `au-wa-petroleum-amendment-2024` | Original Act PDF | `1ZOPlGxRzlPAuU_QLz-JMhkFHZ06qQ4-Q` | Verify operative clauses/commencement |
| `br-law-14993-2024` | Brazilian legal publication HTML | `1-5ex2c_F01FZNv7_kw_SRh8G6nutpGcW` | Verify CCS-specific articles |
| `br-sbce-law-15042-2024` | Brazilian legal publication HTML | `1AezHozzw9n0TVTrdJ1jX-wr5BGkj6Z09` | Verify amendment history |
| `no-storage-framework` | Norwegian Lovdata regulation HTML | `1JbjW0Go224GSY-O3CVwth_9SJoTvKpQN` | Verify applicable revised edition and reuse rights |
| `tr-climate-law-2025` | Turkey No. 7552 Gazette HTML | `10Tjx9GIixSPxQgXOaIuvmQ_1pUeBLn4h` | National climate law, not CCS-specific statute |
| `uk-energy-act-2023` | Original UK Energy Act 2023 chapter 52 PDF | `1helGEz34oiocdnFN2IglL1oTbtPyNscJ` | Canonical source chapter **67** wrong; migration approval needed |
| `cn-miit-industrial-plan-2022` | 三部委《工业领域碳达峰实施方案》工信部联节〔2022〕88号 | `19wXB8R4nE4UhCcz5WZ9oVaAykG3ZwioA` | Original notice and scheme HTML |
| `cn-ordos-pilot-2024` | 鄂尔多斯国家碳达峰试点实施方案 | `14_m49taITl5yk1fgW6vs51csAJ3ZvF95` | 2024 government plan including notice |
| `au-safeguard-mechanism` | Safeguard Mechanism (Crediting) Amendment Act 2023 HTML component | `1SHHGlYJKZ1K_0m8v3q3GlZRu9EcTKL0X` | **Partial Act HTML component**, acquire complete consolidated law separately |
| `ca-ccus-itc` | Income Tax Act §127.44 consolidated HTML section | `10Nl5AEhUgSraw_i6ppv9cqsQL9ncKOde` | Exact section, not entire Income Tax Act |
| `my-netr-ccus-2023` | Ministry of Economy official NETR full PDF, 20.4 MB | `1dJ9YywR29rsUvLQzkdCMxuwhx7ZS6IDo` | Copyright reserved by publisher; private evidence only |
| `vn-decree-119-2025` | Official digitally signed 119/2025 Decree PDF (141 pages) | `1KnT3NcuH7MqDqrFpKArc26YNloGNaVfs` | Scanned; OCR/text extraction pending; signed byte preservation |
| `ca-sk-spii` | SPII Regulations, Saskatchewan F-13.4 Reg 40 PDF | `1w7tuRp_IMwbKkpukgmNlVxm8igam8r5a` | Official publisher **unofficial consolidation**, not formal original |
| `california-lcfs` | CARB LCFS complete 2025 regulation PDF (336 pp) | `1iA4aWKQEFqSrn2e4kauM89KOBRppUlsV` | CARB explicitly labels **unofficial**; authoritative CCR text controls |
| `za-climate-change-act-2024` | South Africa Parliament original Act 22/2024 PDF (52 pp) | `1mDNvADdZJmI4FIyneyeKfvmzScp4MCZt` | Full Act secured; check phased commencement |
| `ru-climate-doctrine-2023` | Presidential Climate Doctrine Decree 812/2023 scan (22 pp) | `1pUZYzCw3mo3hIGdr0PuCK_fn3QH9glna` | Page 1 visually confirms No.812 and date; OCR pending |

## Provenance / outstanding action

All three run-specific verified manifests and one 33-row cumulative CSV are saved in `00_Catalog_and_Metadata`. The validated manifest is authoritative for whether a *particular downloaded blob* was transferred; it does not independently prove the law's effective date or true fit to Policy ID. Original ZIPs include rejected/failed entries and should not be indiscriminately imported.

- **EU** 6 policy IDs remain blocked through EUR-Lex direct HTTP/PDF access; research CELEX/ELI official alternative formats and avoid bot bypass.
- **South Africa** exact legislation index saved as supporting HTML; the first official department PDF attempt failed TLS verification, but a parliamentary copy of the original Act PDF was later acquired securely.
- **Romania** 2013 Law 114 and 2024 OUG 139 and **Iceland** Law 67/2022 confirmed on official online text but GH runner blocked; not counted as archived.
- **Russia** President's Climate Doctrine 2023 agency reference page and directly linked official PDF both saved; scanned PDF requires OCR, not policy-identity guessing.
- **Vietnam** original signed decree now successfully archived, replacing previous mere index.
- **Malaysia** ministry-host redirect was reviewed to `ekonomi.gov.my`; full PDF successfully acquired, original copyright preserved.
- **Singapore** 2025 CCUS-specific framework identity remains unclear; Carbon Pricing Act 2018 cannot be silently substituted. Guangdong and Jiangsu policy labels need identity/year correction; Jiangsu 2023 original is stored as supporting only.
- **Product architecture** next: source-candidate provenance review -> validated instrument/version/section evidence -> explicit reviewed mapping into canonical SQLite / Context Layer. Manual SHA filename fallback in Policy notebook allows detection but is not a reviewed provenance join; manifest-to-record reconciliation is required.

Recommended next task: review the new 16 raw candidates, prioritize exact legal citation/edition, locate official rules/text for remaining 78 without non-homepage candidate (130 minus 52), split combined/mislabeled policy IDs, and run Colab v4 once to verify archive states include new manual files. Do not claim legal-source verification or change canonical SQLite from these backups alone.
