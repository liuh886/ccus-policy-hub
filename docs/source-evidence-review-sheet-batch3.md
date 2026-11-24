# Cross-jurisdiction Batch 3 source and locator review sheet (Draft)

Status: **draft — pending human review** (`packet.json` `review.status: "draft"`, `method: "not_reviewed"`, `reviewer: null`, `reviewed_at: null`). No packet or anchor in Batch 3 has been human-reviewed yet, and `usable_as_reviewed_reference` remains `false` for all Batch 3 anchors until `liuh886` completes the signoff checklist below.

> **Deferred candidate (`nl-mining-act-co2-storage-2011`):** `https://wetten.overheid.nl/BWBR0014168/2026-06-04` is gated by an **Anubis proof-of-work anti-bot challenge** (`Even geduld, wij controleren uw browser / Anubis could not load its JavaScript`), so it was **not** scaffolded automatically and no challenge bypass or alternate mirror was attempted. To add it after human browser capture, save the official HTML locally and run:
>
> ```bash
> node scripts/scaffold-source-evidence.mjs \
>   --policy-id nl-mining-act-co2-storage-2011 \
>   --document-id nl-mining-act-co2-storage-2011 \
>   --url https://wetten.overheid.nl/BWBR0014168/2026-06-04 \
>   --file /path/to/saved-BWBR0014168.html \
>   --storage external_archive \
>   --external-uri https://wetten.overheid.nl/BWBR0014168/2026-06-04 \
>   --extractor official-html-v1 \
>   --lang nl \
>   --anchor-id <anchor-id> \
>   --locator "<official clause locator>" \
>   --query "<unique verbatim quote>"
> ```

## Summary of Batch 3 draft packets

| `policy_id`                    | `packet_id` (`document_id`)    | `storage`          | `raw_bytes` | `normalized_chars` | `raw_sha256`                                                       | `normalized_sha256`                                                | `url` / `external_uri`                                                                                                             |
| ------------------------------ | ------------------------------ | ------------------ | ----------: | -----------------: | ------------------------------------------------------------------ | ------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------- |
| fr-ccus-roadmap                | fr-ccus-roadmap                | `git_inline`       |      58,118 |              9,240 | `2561ccc07f7d39f681d275de8011660f3a2901e215237ad9096b86c046b0cf2e` | `824c4e3b4d9066e262d9abbf2e27790f231eee80b632ba29dbe1e236ff3e9ddc` | `https://www.entreprises.gouv.fr/la-dge/actualites/deploiement-de-la-capture-du-stockage-et-de-la-valorisation-du-carbone-ccus-en` |
| cn-national-ets-expansion-2025 | cn-national-ets-expansion-2025 | `git_inline`       |      47,275 |              2,349 | `581881c26c04bee43065a06613160ccc32300b78aca43eb7086aab0cd46814cb` | `068a4258a4dbf32dfefb9b1248eae0680febc1f6be0702d14faa03c1820de3b5` | `https://www.mee.gov.cn/xxgk2018/xxgk/xxgk03/202503/t20250326_1104736.html`                                                        |
| netherlands-sde                | netherlands-sde                | `git_inline`       |     195,162 |              1,635 | `8bcae0fb8da165bfc68ae67bb380b5a2bdc111faf7a16686accd6ec697247fa9` | `3f7ee7cb562461cb201cca4f674048b6d9cc4ea7893386b1b34832da0ea04a3b` | `https://english.rvo.nl/subsidies-programmes/sde`                                                                                  |
| us-obbba-45q-2025              | us-obbba-45q-2025              | `external_archive` |   1,217,741 |            903,050 | `84000b07c382db50ead04ce65b70983e2dcd699a931d80cd3d2edac584e9004d` | `f01101eea8255ef5dc24814148300e21955f98155eeb9689a5e121c2a05a01bc` | `https://www.govinfo.gov/content/pkg/PLAW-119publ21/html/PLAW-119publ21.htm`                                                       |

---

## 1. France — Deployment of CCUS in France (`fr-ccus-roadmap`)

| Field                  | Frozen draft value                                                        |
| ---------------------- | ------------------------------------------------------------------------- |
| Document               | `fr-ccus-roadmap`                                                         |
| Existing policy        | `fr-ccus-roadmap`                                                         |
| Jurisdiction / Agency  | France / Direction générale des Entreprises (DGE)                         |
| Document type          | Official government roadmap release page (HTML)                           |
| Storage mode           | `git_inline` (`source.html`, 58,118 bytes; normalized 9,240 chars)        |
| Source language        | `fr`                                                                      |
| Edition                | `null`                                                                    |
| Source coverage cutoff | `null`                                                                    |
| Retrieval              | `2026-11-24T15:30:50Z`                                                    |
| Publication date       | `2024-07-04`                                                              |
| Raw SHA-256            | `2561ccc07f7d39f681d275de8011660f3a2901e215237ad9096b86c046b0cf2e`        |
| Normalized SHA-256     | `824c4e3b4d9066e262d9abbf2e27790f231eee80b632ba29dbe1e236ff3e9ddc`        |
| Extractor              | `official-html-v1`                                                        |
| Review status          | `draft` (`method: "not_reviewed"`, `reviewer: null`, `reviewed_at: null`) |

[Official original](https://www.entreprises.gouv.fr/la-dge/actualites/deploiement-de-la-capture-du-stockage-et-de-la-valorisation-du-carbone-ccus-en); frozen input: [source.html](../scripts/data/evidence/fr-ccus-roadmap/source.html); review metadata: [packet.json](../scripts/data/evidence/fr-ccus-roadmap/packet.json).

### Proposed Anchor 1 — `ccus-deployment-lead`

- **Locator:** `Direction générale des Entreprises (DGE) — Déploiement de la capture, du stockage et de la valorisation du carbone (CCUS) en France (introduction)`
- **Offsets:** `1030–1310`, UTF-16 code units

> Levier de décarbonation, les technologies de capture, stockage et valorisation du carbone (CCUS) visent à réduire les émissions des secteurs sans autres alternatives. L’État publie ce jour un document dressant l’état des lieux et les perspectives de déploiement du CCUS en France.

### Proposed Anchor 2 — `ccus-definition`

- **Locator:** `Direction générale des Entreprises (DGE) — En quoi consistent la capture, le stockage et la valorisation du carbone ?`
- **Offsets:** `1441–1843`, UTF-16 code units

> Le Carbon Capture, Utilisation and Storage (CCUS) se réfère à un ensemble de technologies visant à capturer les émissions de dioxyde de carbone (CO2) pour les injecter et les stocker dans des formations géologiques adaptées et éviter qu’elles soient relâchées dans l’atmosphère où elles contribuerait au réchauffement climatique ainsi qu'à les utiliser comme ressources pour la fabrication de produits.

---

## 2. China — National ETS Expansion to Steel, Cement, and Aluminum Smelting (`cn-national-ets-expansion-2025`)

| Field                  | Frozen draft value                                                        |
| ---------------------- | ------------------------------------------------------------------------- |
| Document               | `cn-national-ets-expansion-2025`                                          |
| Existing policy        | `cn-national-ets-expansion-2025`                                          |
| Jurisdiction / Agency  | China / Ministry of Ecology and Environment (生态环境部, MEE)             |
| Document type          | Ministerial notice (环气候〔2025〕23号, HTML)                             |
| Storage mode           | `git_inline` (`source.html`, 47,275 bytes; normalized 2,349 chars)        |
| Source language        | `zh`                                                                      |
| Edition                | `null`                                                                    |
| Source coverage cutoff | `null`                                                                    |
| Retrieval              | `2026-11-24T15:30:50Z`                                                    |
| Publication date       | `2025-03-21`                                                              |
| Raw SHA-256            | `581881c26c04bee43065a06613160ccc32300b78aca43eb7086aab0cd46814cb`        |
| Normalized SHA-256     | `068a4258a4dbf32dfefb9b1248eae0680febc1f6be0702d14faa03c1820de3b5`        |
| Extractor              | `official-html-v1`                                                        |
| Review status          | `draft` (`method: "not_reviewed"`, `reviewer: null`, `reviewed_at: null`) |

[Official original](https://www.mee.gov.cn/xxgk2018/xxgk/xxgk03/202503/t20250326_1104736.html); frozen input: [source.html](../scripts/data/evidence/cn-national-ets-expansion-2025/source.html); review metadata: [packet.json](../scripts/data/evidence/cn-national-ets-expansion-2025/packet.json).

### Proposed Anchor 1 — `ets-expansion-scope`

- **Locator:** `生态环境部《关于印发〈全国碳排放权交易市场覆盖钢铁、水泥、铝冶炼行业工作方案〉的通知》（环气候〔2025〕23号）正文`
- **Offsets:** `198–369`, UTF-16 code units

> 为贯彻落实党中央、国务院关于全国碳排放权交易市场建设部署，经国务院批准，钢铁、水泥、铝冶炼三个行业纳入全国碳排放权交易市场管理，覆盖的温室气体种类为二氧化碳（CO2）、四氟化碳（CF4）和六氟化二碳（C2F6）。根据《碳排放权交易管理暂行条例》，我部组织制定了《全国碳排放权交易市场覆盖钢铁、水泥、铝冶炼行业工作方案》，现予印发，请按照执行。

---

## 3. Netherlands — SDE++ Incentive Scheme (`netherlands-sde`)

| Field                  | Frozen draft value                                                                      |
| ---------------------- | --------------------------------------------------------------------------------------- |
| Document               | `netherlands-sde`                                                                       |
| Existing policy        | `netherlands-sde`                                                                       |
| Jurisdiction / Agency  | Netherlands / Netherlands Enterprise Agency (RVO)                                       |
| Document type          | Official subsidy programme overview page (HTML; checked on 7 August 2025 per page text) |
| Storage mode           | `git_inline` (`source.html`, 195,162 bytes; normalized 1,635 chars)                     |
| Source language        | `en`                                                                                    |
| Edition                | `null`                                                                                  |
| Source coverage cutoff | `null`                                                                                  |
| Retrieval              | `2026-11-24T15:30:50Z`                                                                  |
| Publication date       | `null`                                                                                  |
| Raw SHA-256            | `8bcae0fb8da165bfc68ae67bb380b5a2bdc111faf7a16686accd6ec697247fa9`                      |
| Normalized SHA-256     | `3f7ee7cb562461cb201cca4f674048b6d9cc4ea7893386b1b34832da0ea04a3b`                      |
| Extractor              | `official-html-v1`                                                                      |
| Review status          | `draft` (`method: "not_reviewed"`, `reviewer: null`, `reviewed_at: null`)               |

[Official original](https://english.rvo.nl/subsidies-programmes/sde); frozen input: [source.html](../scripts/data/evidence/netherlands-sde/source.html); review metadata: [packet.json](../scripts/data/evidence/netherlands-sde/packet.json).

### Proposed Anchor 1 — `sde-scheme-overview`

- **Locator:** `Netherlands Enterprise Agency (RVO) — Stimulation of sustainable energy production and climate transition (SDE++) (overview)`
- **Offsets:** `387–602`, UTF-16 code units

> The Sustainable Energy Production and Climate Transition Incentive Scheme (SDE++) provides subsidies to companies and non-profit organisations that generate renewable energy or reduce CO2 emissions on a large scale.

---

## 4. United States — Public Law 119-21 (OBBBA) Section 70522 (`us-obbba-45q-2025`, `external_archive` pioneer)

| Field                  | Frozen draft value                                                                                                 |
| ---------------------- | ------------------------------------------------------------------------------------------------------------------ |
| Document               | `us-obbba-45q-2025`                                                                                                |
| Existing policy        | `us-obbba-45q-2025`                                                                                                |
| Jurisdiction / Agency  | United States / U.S. Congress (via U.S. Government Publishing Office, GovInfo)                                     |
| Document type          | Enacted federal statute (`Public Law 119-21`, 139 Stat. 72, enacted July 4, 2025)                                  |
| Storage mode           | `external_archive` (no `source.html` in git; `normalized.txt` only; raw 1,217,741 bytes; normalized 903,050 chars) |
| External archive URI   | `https://www.govinfo.gov/content/pkg/PLAW-119publ21/html/PLAW-119publ21.htm`                                       |
| Source language        | `en`                                                                                                               |
| Edition                | `PLAW-119-21`                                                                                                      |
| Source coverage cutoff | `null`                                                                                                             |
| Retrieval              | `2026-11-24T15:30:50Z`                                                                                             |
| Publication date       | `2025-07-04`                                                                                                       |
| Raw SHA-256            | `84000b07c382db50ead04ce65b70983e2dcd699a931d80cd3d2edac584e9004d`                                                 |
| Normalized SHA-256     | `f01101eea8255ef5dc24814148300e21955f98155eeb9689a5e121c2a05a01bc`                                                 |
| Extractor              | `official-html-v1`                                                                                                 |
| Review status          | `draft` (`method: "not_reviewed"`, `reviewer: null`, `reviewed_at: null`)                                          |

[Official original / external archive URI](https://www.govinfo.gov/content/pkg/PLAW-119publ21/html/PLAW-119publ21.htm); normalized text: [normalized.txt](../scripts/data/evidence/us-obbba-45q-2025/normalized.txt); review metadata: [packet.json](../scripts/data/evidence/us-obbba-45q-2025/packet.json).

### Proposed Anchor 1 — `sec-70522-a-pfe-restrictions`

- **Locator:** `Public Law 119-21 (139 Stat. 279–280), Sec. 70522(a) — Restrictions Relating to Prohibited Foreign Entities`
- **Offsets:** `568086–568700`, UTF-16 code units

```text
SEC. 70522. RESTRICTIONS ON CARBON OXIDE SEQUESTRATION CREDIT.
(a) Restrictions Relating to Prohibited Foreign Entities.--Section
45Q(f) is amended by adding at the end the following new paragraph:
``(10) Restrictions relating to prohibited foreign
entities.--No credit shall be determined under subsection (a)
for any taxable year beginning after the date of enactment of
this paragraph if the taxpayer is--
``(A) a specified foreign entity (as defined in
section 7701(a)(51)(B)), or
``(B) a foreign-influenced entity (as defined in
section 7701(a)(51)(D), determined without regard to
clause (i)(II) thereof).''.
```

### Proposed Anchor 2 — `sec-70522-b-use-parity`

- **Locator:** `Public Law 119-21 (139 Stat. 280), Sec. 70522(b)(1) — Parity for Different Uses and Utilizations of Qualified Carbon Oxide`
- **Offsets:** `568701–569380`, UTF-16 code units

```text
(b) Parity for Different Uses and Utilizations of Qualified Carbon
Oxide.--Section 45Q is amended--
(1) in subsection (a)--
(A) in paragraph (2)(B)(ii), by adding ``and'' at
the end,
[[Page 139 STAT. 280]]
(B) in paragraph (3), by striking subparagraph (B)
and inserting the following:
``(B)(i) disposed of by the taxpayer in secure
geological storage and not used by the taxpayer as
described in clause (ii) or (iii),
``(ii) used by the taxpayer as a tertiary injectant
in a qualified enhanced oil or natural gas recovery
project and disposed of by the taxpayer in secure
geological storage, or
``(iii) utilized by the taxpayer in a manner
described in subsection (f)(5).'', and
```

---

## Human signoff checklist (`liuh886`)

For each Batch 3 packet that you verify against its official source:

- [ ] **Identity & edition check:** Confirm the official URL (`source_url` / `external_uri`), issuing authority, publication date, and edition match the target `policy_id`.
- [ ] **Quote & locator check:** Confirm each anchor's `exact_quote`, `locator`, and UTF-16 offsets accurately reflect the frozen `source.html` (for `git_inline`) or `normalized.txt` + `external_uri` (for `external_archive`).
- [ ] **Scope boundary:** Confirm review is bounded strictly to the frozen snapshot identity, excerpt, and UTF-16 offsets (`source_currentness_verified` remains `false`; this does not establish current law or project eligibility).
- [ ] **Promote in `packet.json`:** Update both the top-level `review` block and each verified anchor's `review` block in `scripts/data/evidence/<packet_id>/packet.json` from:

  ```json
  {
    "status": "draft",
    "reviewer": null,
    "method": "not_reviewed",
    "reviewed_at": null
  }
  ```

  to:

  ```json
  {
    "status": "verified",
    "reviewer": "liuh886",
    "method": "human",
    "reviewed_at": "YYYY-MM-DD"
  }
  ```

- [ ] **Regenerate & verify:** Run:

  ```bash
  pnpm gen
  pnpm manage:db:audit:source-readiness
  pnpm evidence:inspect --all
  pnpm evidence:consume
  pnpm manage:db:audit:source-readiness --check
  ```

- [ ] **Update this sheet:** Change the top status line from `draft — pending human review` to `reviewed` with the signoff date and commit the reviewed packets + regenerated projections.
