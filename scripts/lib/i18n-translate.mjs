/**
 * Shared frontmatter translation helper used by the export pipeline and the
 * facilities parity auditor so that both sides derive localized values from
 * the same dictionary (src/data/i18n_dictionary.json).
 *
 * Contract: en frontmatter keeps canonical values; zh frontmatter carries
 * localized display values produced by this translator. Anyone comparing
 * zh markdown against DB canonical values MUST translate first.
 */

export function createTranslator(dict) {
  return (key, dom, lang) => {
    if (lang === 'en' || !key) return key;
    if (dom === 'country') {
      for (const [alias, canonical] of Object.entries(dict.countries ?? {})) {
        if (canonical === key && /[\u4e00-\u9fa5]/.test(alias)) return alias;
      }
    }
    if (dom === 'status' && dict.ui?.status?.[key]?.zh)
      return dict.ui.status[key].zh;
    if (dom === 'category' && dict.ui?.categories?.[key]?.zh)
      return dict.ui.categories[key].zh;
    return key;
  };
}

/**
 * The export pipeline writes this placeholder for an empty reviewer so that
 * "nobody reviewed yet" is visible in markdown. It is semantically equal to
 * an empty DB value, not a mismatch.
 */
export const REVIEWER_PLACEHOLDER = 'Human Audit Pending';
