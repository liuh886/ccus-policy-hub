# CO2 Regulatory Positioning Review

Date: `2026-03-29`

## Scope

This review renamed the compare-page concept from strict "CO2 legal definition" to the broader and more accurate:

- `CO2 监管属性 / 法律定位`
- `CO2 Regulatory Positioning / Legal Status`

## What Was Corrected

- The compare-page label now matches the actual information quality and regulatory granularity.
- The English compare page now reads country-profile truth data instead of aggregating per-policy fallback values.
- `country_i18n.co2_definition` was normalized for 37 countries where the old value read more like strategy, market positioning, or project narrative than legal/regulatory status.
- Chinese placeholder summaries of the form `Profile for ...` were replaced with country-level summary sentences for the reviewed set.
- Residual English regulatory fields in selected Chinese country profiles were translated or localized.

## Normalization Rule

The field should describe how captured CO2 is treated in regulation, for example:

- `CO2 stream for geological storage`
- `Managed emissions stream`
- `Industrial resource for utilization`
- `Non-waste stream under CCS rules`
- `No unified statutory definition yet`

The field should not primarily describe:

- national strategy
- industrial priority
- decarbonization importance
- project ambition
- climate rhetoric

## Countries Explicitly Rewritten

- Algeria
- Argentina
- Australia
- Austria
- Bulgaria
- Canada
- Chile
- China
- Colombia
- Denmark
- European Union
- France
- Germany
- Iceland
- India
- Ireland
- Italy
- Japan
- Kuwait
- Lithuania
- Malaysia
- Mexico
- Netherlands
- Norway
- Oman
- Portugal
- Qatar
- Republic of Korea
- Russia
- Saudi Arabia
- South Africa
- Sweden
- Thailand
- Turkey
- United Arab Emirates
- United Kingdom
- United States

## Residual Risks

- Some non-`co2_definition` regulatory fields in Chinese country profiles still contain mixed Chinese and English terminology, especially agency acronyms and source labels.
- The legal/regulatory summaries remain normalized editorial statements, not direct statutory quotations.
- Additional source-by-source legal review is still warranted for jurisdictions where the regulatory basis is evolving quickly or remains fragmented.
