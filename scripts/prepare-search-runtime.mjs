#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import * as pagefind from 'pagefind';
import {
  prepareSearchRuntime,
  verifySearchRuntime,
} from './lib/search-runtime.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
try {
  const profile = await prepareSearchRuntime(
    path.join(root, 'dist/pagefind'),
    pagefind,
    JSON.parse(
      fs.readFileSync(path.join(root, 'scripts/data/search-terms.json'), 'utf8')
    )
  );
  verifySearchRuntime(path.join(root, 'dist/pagefind'));
  console.log(
    JSON.stringify({
      profile: profile.profile,
      terms: Object.keys(profile.term_segments),
    })
  );
} finally {
  await pagefind.close();
}
