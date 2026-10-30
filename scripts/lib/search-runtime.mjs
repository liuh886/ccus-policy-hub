import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { gunzipSync } from 'node:zlib';

export const PAGEFIND_VERSION = '1.5.2';
export const SEARCH_PROFILE = 'ccus-pagefind-1.5.2-v1';
export const searchHash = (bytes) =>
  crypto.createHash('sha256').update(bytes).digest('hex');

export async function nativeTermSegments(pagefind, terms) {
  if (
    !terms.length ||
    new Set(terms).size !== terms.length ||
    terms.some((term) => !/^[\p{Script=Han}]+$/u.test(term))
  )
    throw new Error('Search terms must be unique complete Han terms.');
  const { index, errors } = await pagefind.createIndex();
  if (errors.length) throw new Error(errors.join('; '));
  try {
    for (const [i, term] of terms.entries()) {
      const result = await index.addCustomRecord({
        url: `/__ccus_segmentation_probe/${i}/`,
        language: 'zh',
        content: term,
        meta: { ccus_probe_term: term },
      });
      if (result.errors.length) throw new Error(result.errors.join('; '));
    }
    const result = await index.getFiles();
    if (result.errors.length) throw new Error(result.errors.join('; '));
    const found = new Map();
    for (const file of result.files.filter((f) =>
      f.path.endsWith('.pf_fragment')
    )) {
      let bytes = Buffer.from(file.content);
      if (bytes[0] === 0x1f && bytes[1] === 0x8b) bytes = gunzipSync(bytes);
      if (bytes.subarray(0, 12).toString() !== 'pagefind_dcd')
        throw new Error('Unexpected Pagefind fragment encoding.');
      const fragment = JSON.parse(bytes.subarray(12).toString('utf8'));
      const term = fragment.meta.ccus_probe_term;
      const tokens = fragment.content.split(/[\s\u200b]+/u).filter(Boolean);
      if (!terms.includes(term) || !tokens.length || tokens.join('') !== term)
        throw new Error('Native term segmentation changes the original term.');
      found.set(term, tokens);
    }
    if (found.size !== terms.length)
      throw new Error('Incomplete native term segmentation.');
    return Object.fromEntries(
      [...found].sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
    );
  } finally {
    await index.deleteIndex();
  }
}

function replaceOnce(source, before, after) {
  if (source.split(before).length !== 2)
    throw new Error(
      'Pagefind runtime shape changed; review the pinned compatibility profile.'
    );
  return source.replace(before, after);
}

export function patchSearchRuntime(source, segments, main) {
  if (source.includes(SEARCH_PROFILE))
    throw new Error('Runtime already prepared; rebuild the index first.');
  const helper =
    `/* ${SEARCH_PROFILE} */\nconst __ccusTerms=${JSON.stringify(segments)};\n` +
    `function __ccusWords(term,locale,segmenter){const parts=segmenter.segment(term);` +
    `if(!/^zh(?:-|$)/i.test(locale))return parts;return Array.from(parts).flatMap(part=>` +
    `(Object.hasOwn(__ccusTerms,part.segment)?__ccusTerms[part.segment]:[part.segment]).map(segment=>({segment})));}\n`;
  source = replaceOnce(
    source,
    'for(const{segment:word}of wordSegmenter.segment(term))',
    'for(const{segment:word}of __ccusWords(term,trueLanguage,wordSegmenter))'
  );
  if (main) {
    for (const options of ['initial_options', 'instanceOptions']) {
      const prefix = `new PagefindWrapper({...${options},basePath:deriveBasePath(${options}?.basePath),language:`;
      source = replaceOnce(
        source,
        prefix + 'detectLanguage()',
        prefix + `${options}?.language??detectLanguage()`
      );
    }
  }
  return helper + source;
}

export async function prepareSearchRuntime(directory, pagefind, terms) {
  const entryBytes = fs.readFileSync(
    path.join(directory, 'pagefind-entry.json')
  );
  if (JSON.parse(entryBytes).version !== PAGEFIND_VERSION)
    throw new Error(`Search runtime requires Pagefind ${PAGEFIND_VERSION}.`);
  const segments = await nativeTermSegments(pagefind, terms);
  // Validate every replacement before mutating any generated asset.
  const outputs = ['pagefind.js', 'pagefind-worker.js'].map((name) => ({
    name,
    content: patchSearchRuntime(
      fs.readFileSync(path.join(directory, name), 'utf8'),
      segments,
      name === 'pagefind.js'
    ),
  }));
  const profile = {
    profile: SEARCH_PROFILE,
    pagefind_version: PAGEFIND_VERSION,
    entry_sha256: searchHash(entryBytes),
    term_segments: segments,
    assets: Object.fromEntries(
      outputs.map(({ name, content }) => [name, searchHash(content)])
    ),
  };
  for (const { name, content } of outputs)
    fs.writeFileSync(path.join(directory, name), content);
  fs.writeFileSync(
    path.join(directory, 'ccus-runtime.json'),
    JSON.stringify(profile, null, 2) + '\n'
  );
  return profile;
}

export function verifySearchRuntime(directory) {
  const profile = JSON.parse(
    fs.readFileSync(path.join(directory, 'ccus-runtime.json'), 'utf8')
  );
  if (
    profile.profile !== SEARCH_PROFILE ||
    profile.pagefind_version !== PAGEFIND_VERSION
  )
    throw new Error('Unknown search runtime profile.');
  for (const [name, hash] of Object.entries({
    'pagefind-entry.json': profile.entry_sha256,
    ...profile.assets,
  })) {
    if (
      !['pagefind-entry.json', 'pagefind.js', 'pagefind-worker.js'].includes(
        name
      ) ||
      searchHash(fs.readFileSync(path.join(directory, name))) !== hash
    )
      throw new Error('Search runtime asset integrity mismatch.');
  }
  if (!profile.assets['pagefind.js'] || !profile.assets['pagefind-worker.js'])
    throw new Error('Incomplete search runtime assets.');
  return profile;
}
