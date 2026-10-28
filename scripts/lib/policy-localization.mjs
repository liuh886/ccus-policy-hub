// Locale text is stored beside its canonical evidence. Stale translations must
// never silently survive a change to the source sentence.
export function localizeAnalysis(analysis, translations = [], lang = 'en') {
  if (lang === 'en') return analysis;
  const localized = structuredClone(analysis);
  for (const row of translations) {
    const source = analysis[row.dimension];
    if (row.lang !== lang || !source || row.source_evidence !== source.evidence)
      continue;
    localized[row.dimension] = {
      ...source,
      label: row.label,
      evidence: row.evidence,
      sourceLanguage: 'zh',
    };
  }
  return localized;
}
