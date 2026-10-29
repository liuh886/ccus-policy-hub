-- PROPOSAL ONLY. Never applied to the repository SSOT without human approval.
-- Existing schema.sql remains unchanged until approval and execution.
CREATE TABLE IF NOT EXISTS source_documents (
  id TEXT PRIMARY KEY,
  policy_id TEXT NOT NULL REFERENCES policies(id),
  title_en TEXT NOT NULL,
  title_zh TEXT NOT NULL,
  source_url TEXT NOT NULL,
  source_language TEXT NOT NULL CHECK(source_language IN ('en','zh'))
);
CREATE TABLE IF NOT EXISTS source_document_versions (
  document_id TEXT NOT NULL REFERENCES source_documents(id),
  raw_sha256 TEXT NOT NULL CHECK(length(raw_sha256)=64),
  extractor_version TEXT NOT NULL,
  normalized_sha256 TEXT NOT NULL CHECK(length(normalized_sha256)=64),
  raw_content BLOB NOT NULL,
  normalized_text TEXT NOT NULL,
  edition TEXT NOT NULL,
  fetched_at TEXT NOT NULL,
  published_at TEXT,
  source_current_through TEXT,
  review_status TEXT NOT NULL DEFAULT 'draft' CHECK(review_status IN ('draft','verified')),
  reviewer TEXT,
  reviewed_at TEXT,
  CHECK(review_status='draft' OR (length(trim(reviewer))>0 AND reviewed_at IS NOT NULL AND reviewer IS NOT NULL)),
  PRIMARY KEY(document_id,raw_sha256,extractor_version)
);
CREATE TABLE IF NOT EXISTS source_document_anchors (
  document_id TEXT NOT NULL,
  raw_sha256 TEXT NOT NULL,
  extractor_version TEXT NOT NULL,
  anchor_id TEXT NOT NULL,
  locator TEXT NOT NULL,
  exact_quote TEXT NOT NULL,
  start_offset INTEGER NOT NULL CHECK(start_offset>=0),
  end_offset INTEGER NOT NULL CHECK(end_offset>start_offset),
  offset_unit TEXT NOT NULL DEFAULT 'utf16_code_units' CHECK(offset_unit='utf16_code_units'),
  review_status TEXT NOT NULL DEFAULT 'draft' CHECK(review_status IN ('draft','verified')),
  reviewer TEXT,
  reviewed_at TEXT,
  CHECK(review_status='draft' OR (length(trim(reviewer))>0 AND reviewed_at IS NOT NULL AND reviewer IS NOT NULL)),
  PRIMARY KEY(document_id,raw_sha256,extractor_version,anchor_id),
  FOREIGN KEY(document_id,raw_sha256,extractor_version)
    REFERENCES source_document_versions(document_id,raw_sha256,extractor_version)
);
