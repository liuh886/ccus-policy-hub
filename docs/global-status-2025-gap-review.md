# Global Status of CCS 2025: Coverage and Gap Review

Date: 2026-07-21

## Purpose

This note records a targeted coverage review triggered by a Chinese secondary article summarising the Global CCS Institute's 2025 status report. The secondary article is treated as a discovery lead only. Coverage conclusions and future database updates must be verified against official or primary sources.

Discovery lead:

- https://www.sohu.com/a/991804892_313737

Authoritative strategic sources:

- Global Status of CCS 2025: https://www.globalccsinstitute.com/global-status-of-ccs/
- CCS Policy, Legal and Regulatory Snapshot: 2025 trends: https://www.globalccsinstitute.com/ccsplrsnapshot/

## Coverage already present

The current policy dataset already contains records for several major developments highlighted by the 2025 review:

| Development | Existing record | Initial judgement |
|---|---|---|
| Japan CCS Business Act | `jp-ccs-business-act-2024` | Covered; source, effective dates, and phased implementation should be checked against METI primary material |
| Indonesia Presidential Regulation No. 14/2024 | `id-presidential-reg-14-2024` | Covered; cross-border and storage-capacity provisions require primary-source citation checks |
| Malaysia CCUS Act 2025 | `my-ccus-act-2025` | Covered; compare with bill and offshore-framework records for duplication |
| EU Net-Zero Industry Act | `eu-nzia` | Covered; retain the 50 Mtpa injection objective and producer-contribution mechanism with official EU citations |
| EU CCS Directive | `eu-ccs-directive` and `eu-ccs-directive-2009` | Potential duplicate family; review whether both records represent distinct analytical purposes |

## Duplicate and lifecycle review

The following record families should be reviewed before adding more records from secondary summaries:

### Japan

The dataset appears to contain both a general CCS Business Act record and a phased-implementation record. Confirm whether the records represent:

- the enacted primary legislation;
- implementing ordinances or designated-area rules;
- a genuinely distinct 2025 implementation milestone.

If not, consolidate the lifecycle into one canonical policy record with an evolution history.

### Malaysia

The dataset contains at least:

- `my-ccus-act-2025`;
- `my-ccus-bill-2025`;
- `my-offshore-ccs-reg-2025`.

Confirm whether the bill record should be superseded by the enacted Act and whether the offshore framework is a distinct instrument or a restatement of the same law. Use `supersedes`, `supersededBy`, or a policy cluster rather than counting the same legislative process as multiple independent active policies.

### European Union

Review the two CCS Directive records and ensure that 2024-2025 guidance or implementation changes are not described as amendments to the Directive unless an official legal act supports that claim.

## Candidate additions or refreshes

These developments are material enough for primary-source review but should not be inserted solely from the secondary article.

| Candidate | Required verification | Likely action |
|---|---|---|
| EU Clean Industrial Deal | European Commission communication and implementing measures | Add a strategic-policy record only if CCUS provisions are sufficiently specific; otherwise link it as context to existing EU records |
| Brazil SBCE and CCS/BECCS consultation | Brazilian legislation, regulator consultation, and official implementation documents | Add or refresh Brazil records after confirming direct CCS relevance |
| United States 45Q parity and 2025 changes | IRS legislation, guidance, and enacted federal text | Refresh the existing 45Q record rather than create a generic new record |
| London Protocol cross-border amendment status | IMO depositary records and country notifications | Update country cross-border pillars and add country-specific records only where legal effect is clear |
| China sector transition policies and national ETS expansion | State Council, NDRC, MEE, MIIT, and official plan texts | Review existing China records for exact CCUS language and avoid relying on forward-looking statements about the 15th Five-Year Plan |
| Korea, Singapore, Australia, Indonesia, Malaysia and Japan bilateral arrangements | Official memoranda, treaties, and government releases | Record bilateral arrangements separately from domestic storage legislation when their legal status is clear |

## Data-trust implications

1. A recognised annual status report is useful for detecting missing developments and changes in policy significance.
2. It is not sufficient evidence for project-specific legal applicability.
3. New records should not be added until duplicate, supersession, and lifecycle relationships are checked.
4. Official source URLs should be preferred over media summaries.
5. Strategic reports may support a country-level interpretation or audit note, while scores and direct claims should remain traceable to primary material.

## Recommended next data pass

1. Resolve Japan, Malaysia, and EU duplicate families.
2. Complete official-source and URL coverage for verified policies.
3. Review the candidate additions above against primary sources.
4. Run the governed database export and deep audit.
5. Compare policy counts before and after the pass so that consolidation is not mistaken for lost coverage.
