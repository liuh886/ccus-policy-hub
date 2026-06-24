# Facility-Policy Relationship Model

## Current State

Currently, all facility-policy links in the database are **country-level only**. This means:

- A facility in Country X is linked to all policies in Country X
- No distinction is made between direct evidence-based relationships and broad country-level associations
- Confidence level is implicitly **low** for all links

## Three-Level Relationship Model

The proposed relationship model introduces three confidence levels:

### 1. Country-Level Link (Low Confidence)

- **Definition**: Facility and policy share the same country
- **Confidence**: Low (0.3)
- **Use case**: Default fallback when no stronger link exists
- **Example**: A CCS facility in Norway is linked to Norway's CCS regulatory framework

### 2. Sector/Type-Level Link (Medium Confidence)

- **Definition**: Facility's sector/type matches policy's scope or category
- **Confidence**: Medium (0.6)
- **Use case**: Policy specifically addresses the facility's operational domain
- **Example**: An offshore storage facility linked to offshore storage regulations
- **Requires**: `link_type` field in `policy_facility_links` table

### 3. Evidence-Level/Manual Link (High Confidence)

- **Definition**: Direct evidence that a policy applies to a specific facility
- **Confidence**: High (0.9)
- **Use case**: Policy explicitly mentions the facility, or facility received benefits under the policy
- **Example**: A facility that received 45Q tax credits linked to the 45Q policy
- **Requires**: `evidence`, `source_url`, `review_status` fields

## Proposed Schema Extension

```sql
-- Extended policy_facility_links table
CREATE TABLE IF NOT EXISTS policy_facility_links (
  policy_id TEXT NOT NULL,
  facility_id TEXT NOT NULL,
  link_type TEXT DEFAULT 'country' CHECK(link_type IN ('country', 'sector', 'evidence')),
  confidence REAL DEFAULT 0.3,
  evidence TEXT,
  source_url TEXT,
  review_status TEXT DEFAULT 'draft',
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now')),
  PRIMARY KEY(policy_id, facility_id),
  FOREIGN KEY(policy_id) REFERENCES policies(id) ON DELETE CASCADE,
  FOREIGN KEY(facility_id) REFERENCES facilities(id) ON DELETE CASCADE
);
```

## Migration Plan

### Phase 1: Schema Preparation (Current PR)

- Document the relationship model
- Add tests for current country-level behavior
- Prepare export structure with `link_type` and `confidence` fields

### Phase 2: Data Migration (Future PR)

- Add `link_type`, `confidence`, `evidence`, `source_url`, `review_status` columns
- Migrate existing links to `link_type = 'country'` with `confidence = 0.3`
- Create indexes for efficient querying

### Phase 3: Evidence Collection (Future PR)

- Build tooling to identify sector-level relationships
- Enable manual evidence-level link creation
- Add review workflow for high-confidence links

## Export Structure

The quality metrics export now includes:

```json
{
  "facility_policy_links": {
    "total": 6992,
    "country_level": 6992,
    "sector_level": 0,
    "evidence_level": 0,
    "high_risk_warning": true,
    "country_level_pct": 100
  }
}
```

## Testing

Current tests verify:

- Country-level linking behavior is explicit
- Quality metrics correctly classify link types
- High-risk warning triggers when >80% links are country-level
