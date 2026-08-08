import { readdir, readFile, writeFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';

const distRoot = resolve('dist');
const token = process.env.PUBLIC_CLOUDFLARE_WEB_ANALYTICS_TOKEN?.trim() || '';
const beaconUrl = 'https://static.cloudflareinsights.com/beacon.min.js';

async function htmlFiles(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) files.push(...(await htmlFiles(path)));
    else if (entry.isFile() && entry.name.endsWith('.html')) files.push(path);
  }
  return files;
}

if (!token) {
  console.log('Cloudflare Web Analytics disabled: no build token configured.');
  process.exit(0);
}

const beacon = `<script type="module" src="${beaconUrl}" data-cf-beacon='${JSON.stringify({ token })}'></script>`;
const files = await htmlFiles(distRoot);
if (files.length === 0) throw new Error('No built HTML files found in dist.');

let injected = 0;
for (const file of files) {
  const html = await readFile(file, 'utf8');
  if (html.includes(beaconUrl)) continue;
  if (!html.includes('</head>'))
    throw new Error(`Built HTML has no </head>: ${file}`);
  await writeFile(file, html.replace('</head>', `${beacon}</head>`), 'utf8');
  injected += 1;
}

console.log(
  `Cloudflare Web Analytics injected into ${injected} of ${files.length} built HTML files.`
);
