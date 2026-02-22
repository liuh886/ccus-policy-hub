PRAGMA foreign_keys = ON;

-- Meta
CREATE TABLE IF NOT EXISTS db_meta (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL
);

-- -------------------------
-- i18n_dictionary SSOT tables
-- -------------------------
CREATE TABLE IF NOT EXISTS dict_country_alias (
  alias TEXT PRIMARY KEY,
  canonical TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS dict_region_alias (
  en TEXT PRIMARY KEY,
  zh TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS dict_source_alias (
  alias TEXT PRIMARY KEY,
  canonical TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS dict_term (
  domain TEXT NOT NULL CHECK(domain IN ('sector','type','fate')),
  canonical TEXT NOT NULL,
  zh TEXT NOT NULL,
  PRIMARY KEY (domain, canonical)
);

CREATE TABLE IF NOT EXISTS dict_term_alias (
  domain TEXT NOT NULL CHECK(domain IN ('sector','type','fate')),
  alias TEXT NOT NULL,
  canonical TEXT NOT NULL,
  PRIMARY KEY (domain, alias),
  FOREIGN KEY (domain, canonical) REFERENCES dict_term(domain, canonical)
    ON UPDATE CASCADE ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS ui_category (
  key TEXT PRIMARY KEY,
  zh TEXT NOT NULL,
  en TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS ui_dimension (
  key TEXT PRIMARY KEY,
  label_zh TEXT NOT NULL,
  label_en TEXT NOT NULL,
  desc_zh TEXT NOT NULL,
  desc_en TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS ui_status (
  key TEXT PRIMARY KEY,
  zh TEXT NOT NULL,
  en TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_dict_term_alias_canonical
  ON dict_term_alias(domain, canonical);

-- -------------------------
-- Core business tables
-- -------------------------
CREATE TABLE IF NOT EXISTS policies (
  id TEXT PRIMARY KEY,
  country TEXT NOT NULL,
  year INTEGER,
  status TEXT,
  category TEXT,
  review_status TEXT,
  legal_weight TEXT,
  source TEXT,
  url TEXT,
  pub_date TEXT,

  provenance_author TEXT,
  provenance_reviewer TEXT,
  provenance_last_audit_date TEXT
);

CREATE TABLE IF NOT EXISTS policy_i18n (
  policy_id TEXT NOT NULL,
  lang TEXT NOT NULL CHECK(lang IN ('en','zh')),
  title TEXT,
  description TEXT,
  scope TEXT,
  tags_json TEXT,
  impact_analysis_json TEXT,
  interpretation TEXT,
  evolution_json TEXT,
  regulatory_json TEXT,
  PRIMARY KEY(policy_id, lang),
  FOREIGN KEY(policy_id) REFERENCES policies(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS policy_analysis (
  policy_id TEXT NOT NULL,
  dimension TEXT NOT NULL,
  score INTEGER NOT NULL,
  label TEXT,
  evidence TEXT,
  citation TEXT,
  audit_note TEXT,
  PRIMARY KEY(policy_id, dimension),
  FOREIGN KEY(policy_id) REFERENCES policies(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS policy_analysis_extra (
  policy_id TEXT NOT NULL,
  dimension TEXT NOT NULL,
  score INTEGER,
  label TEXT,
  evidence TEXT,
  citation TEXT,
  audit_note TEXT,
  PRIMARY KEY(policy_id, dimension),
  FOREIGN KEY(policy_id) REFERENCES policies(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS facilities (
  id TEXT PRIMARY KEY,
  country TEXT NOT NULL,
  status TEXT,
  review_status TEXT,
  announced_capacity_min REAL,
  announced_capacity_max REAL,
  announced_capacity_raw TEXT,
  estimated_capacity REAL,
  lat REAL,
  lng REAL,
  precision TEXT,
  
  investment_scale TEXT,

  provenance_author TEXT,
  provenance_reviewer TEXT,
  provenance_last_audit_date TEXT
);

CREATE TABLE IF NOT EXISTS facility_i18n (
  facility_id TEXT NOT NULL,
  lang TEXT NOT NULL CHECK(lang IN ('en','zh')),
  name TEXT,
  description TEXT,
  region TEXT,
  type TEXT,
  phase TEXT,
  sector TEXT,
  fate_of_carbon TEXT,
  hub TEXT,
  operator TEXT,
  capture_technology TEXT,
  storage_type TEXT,
  announcement TEXT,
  fid TEXT,
  operation TEXT,
  suspension_date TEXT,
  PRIMARY KEY(facility_id, lang),
  FOREIGN KEY(facility_id) REFERENCES facilities(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS facility_partners (
  facility_id TEXT NOT NULL,
  lang TEXT NOT NULL CHECK(lang IN ('en','zh')),
  order_index INTEGER NOT NULL,
  partner TEXT NOT NULL,
  PRIMARY KEY(facility_id, lang, order_index),
  FOREIGN KEY(facility_id) REFERENCES facilities(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS facility_links (
  facility_id TEXT NOT NULL,
  lang TEXT NOT NULL CHECK(lang IN ('en','zh')),
  order_index INTEGER NOT NULL,
  link TEXT NOT NULL,
  PRIMARY KEY(facility_id, lang, order_index),
  FOREIGN KEY(facility_id) REFERENCES facilities(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS policy_facility_links (
  policy_id TEXT NOT NULL,
  facility_id TEXT NOT NULL,
  PRIMARY KEY(policy_id, facility_id),
  FOREIGN KEY(policy_id) REFERENCES policies(id) ON DELETE CASCADE,
  FOREIGN KEY(facility_id) REFERENCES facilities(id) ON DELETE CASCADE
);

-- -------------------------
-- National Governance Profiles
-- -------------------------
CREATE TABLE IF NOT EXISTS country_profiles (
  id TEXT PRIMARY KEY, -- Canonical English Name
  region TEXT,
  net_zero_year INTEGER,
  capture_2030 TEXT,
  storage_2050 TEXT,
  
  provenance_author TEXT,
  provenance_reviewer TEXT,
  provenance_last_audit_date TEXT
);

CREATE TABLE IF NOT EXISTS country_i18n (
  country_id TEXT NOT NULL,
  lang TEXT NOT NULL CHECK(lang IN ('en','zh')),
  name TEXT NOT NULL,
  summary TEXT,
  
  -- The 7 Regulatory Pillars
  pore_space_rights TEXT DEFAULT 'Pending',
  liability_transfer TEXT DEFAULT 'Pending',
  liability_period TEXT DEFAULT 'Pending',
  financial_assurance TEXT DEFAULT 'Pending',
  permitting_lead_time TEXT DEFAULT 'Pending',
  co2_definition TEXT DEFAULT 'Pending',
  cross_border_rules TEXT DEFAULT 'Pending',
  
  PRIMARY KEY(country_id, lang),
  FOREIGN KEY(country_id) REFERENCES country_profiles(id) ON DELETE CASCADE
);
