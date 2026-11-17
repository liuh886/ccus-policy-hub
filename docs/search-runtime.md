# Static search runtime maintenance

Pagefind is pinned to **1.5.2**. The build retains the existing HTML crawl and UI,
then prepares a small, version-bound runtime compatibility profile. This fixes
the full-corpus English chunk-loading regression observed in RFC #112 and two
reproduced interoperability defects: explicit language options were overwritten
by automatic detection, and native CJK boundaries differed from `Intl.Segmenter`.
It does not add a search server, index private PDFs, publish discovery records or
approve source evidence.

## Authority and generated output

- `scripts/data/search-terms.json` owns complete domain terms, currently
  `二氧化碳` and `咸水层`. Do not hand-maintain split words.
- `prepare-search-runtime.mjs` asks the installed Pagefind binary to index those
  terms in a temporary in-memory probe. Fragment boundaries supply the query
  compatibility map; concatenating them must reproduce each original term.
- The two generated runtime files, `pagefind.js` and `pagefind-worker.js`, receive
  the same narrowly scoped segmentation adapter. Unlisted words retain upstream
  behavior; the published document text and excerpts are not rewritten.
- The main SDK additionally honors the documented `language` option in both the
  default instance and `createInstance`. Omitted options still use automatic
  browser detection.
- `dist/pagefind/ccus-runtime.json` records the profile, native term boundaries,
  entry hash and both runtime hashes. It is generated build metadata, not policy
  data or an independent evidence registry.

The adapter expands a matching `Intl.Segmenter` word directly into native tokens
before Pagefind's grapheme/punctuation handling. Merely inserting spaces into
the original query is insufficient: ICU can split `化碳` again. No translation,
legal inference, raw-source mutation or general Chinese segmentation is claimed.

## Verification and upgrades

```bash
pnpm build
pnpm search:verify
node --test scripts/search-runtime.test.mjs
```

The verifier reads the generated profile, then builds an **isolated** copy of the
full HTML corpus plus synthetic fixtures. Its real HTTP/Node consumer checks
English phrase recall, spaced/continuous/quoted Chinese queries, explicit
languages, HTML/custom-record filters, Pages base paths, target HTTP status,
draft/verified separation and asset tampering. Fixtures never enter `dist`.
The same verification runs after production build in CI.

The build checks the exact upstream version and all three expected SDK shapes
before writing either asset. An upstream change, missing worker or repeated patch
fails the build; rerun the ordinary build to obtain pristine Pagefind assets.
Do not weaken the shape guard to make an upgrade pass. Recheck the native term
map, matching SDK/index/WASM versions, browser Worker path and full-corpus recall.
The patch preserves the upstream code and attribution; only generated output is
adapted. Prefer removing it when equivalent upstream fixes pass these regressions.

## Independent Node consumption

Download the public static SDK and profile from the same trusted release, verify
the SDK against the profile hash, and import it as ESM. Use an explicit HTTP
`basePath` for index resources and one `baseUrl` for result URLs. Record URLs are
site-relative: never include the Pages base prefix twice. This is a static client,
not a REST search endpoint or an accepted citable-source contract.

```js
// localSDK is a verified local copy of pagefind.js, saved as ESM (.mjs).
const sdk = await import(`${localSDK.href}?locale=zh`);
await sdk.options({
  basePath: 'https://example.org/ccus-policy-hub/pagefind/',
  baseUrl: 'https://example.org/ccus-policy-hub/',
  language: 'zh',
  noWorker: true,
});
const candidates = await sdk.search('咸水层二氧化碳封存');
// Resolve result data only as needed; a hit is not a reviewed citation.
```

Use a separate ESM instance per locale in Node, as the upstream fallback WASM
state is shared within a module; the verifier does this without DOM emulation.
The browser's Worker path is checked separately. Cross-language aliases,
unsupported locales, unrestricted Chinese vocabulary, real discovery projections
and release-pinned citation receipts remain RFC work, not capabilities delivered
by this compatibility patch.
