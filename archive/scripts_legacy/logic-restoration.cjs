const fs = require('fs');
const path = require('path');

// 1. 恢复设施详情页 (Facilities [slug].astro) - 基于打捞到的 cd04edf3...
const facilitySlugLogic = `---
import { getCollection, render } from 'astro:content';
import Layout from '../../layouts/Layout.astro';

export async function getStaticPaths() {
  const facilities = await getCollection('facilities_zh');
  return facilities.map((entry) => ({
    params: { slug: entry.id },
    props: { entry },
  }));
}

const { entry } = Astro.props;
const { Content } = await render(entry);
const {
  name, country, location, type, status, capacity,
  commencementYear, sector, relatedPolicies = [],
} = entry.data;

const allPolicies = await getCollection('policies_zh');

const explicitPolicies = allPolicies.filter(p => relatedPolicies.includes(p.id));
const applicablePolicies = allPolicies.filter(p => {
  if (relatedPolicies.includes(p.id)) return false;
  return p.data.country === country || p.id.startsWith('iso-');
});
---
<Layout title={name}>
  <div class="max-w-6xl mx-auto py-8 px-4">
    <div class="grid grid-cols-1 lg:grid-cols-3 gap-12">
      <div class="lg:col-span-2">
        <header class="mb-8">
          <h1 class="text-4xl font-black mb-2">{name}</h1>
          <p class="text-xl text-slate-500">{location}, {country}</p>
        </header>
        <article class="prose prose-slate dark:prose-invert max-w-none">
          <Content />
        </article>
      </div>
      <aside class="space-y-8">
        <div class="bg-blue-600 p-6 rounded-2xl text-white">
          <h3 class="text-xs font-black uppercase tracking-widest mb-4">Governing Policies</h3>
          {explicitPolicies.map(p => (
            <a href={`/ccus-policy-hub/policy/\${p.id}/`} class="block text-sm font-bold hover:underline mb-2">{p.data.title}</a>
          ))}
        </div>
      </aside>
    </div>
  </div>
</Layout>`;

// 2. 恢复对比抽屉 (CompareDrawer.astro) - 基于打捞到的 6b5dc1d8...
const compareDrawerLogic = `---
const BASE = '/ccus-policy-hub';
---
<div id="compare-drawer" class="fixed bottom-8 left-1/2 -translate-x-1/2 z-50 hidden">
  <div class="bg-slate-900 text-white px-6 py-4 rounded-full shadow-2xl border border-slate-700 flex items-center gap-6">
    <div class="flex items-center gap-2">
      <div class="bg-blue-600 text-xs font-bold w-6 h-6 flex items-center justify-center rounded-full" id="compare-count">0</div>
      <span class="text-sm font-medium">policies selected</span>
    </div>
    <a href="\${BASE}/compare/" class="bg-white text-slate-900 px-4 py-1.5 rounded-full text-sm font-bold hover:bg-blue-50 transition-colors">Compare Matrix</a>
  </div>
</div>
<script>
  function updateDrawer() {
    const list = JSON.parse(localStorage.getItem('compare-list') || '[]');
    const drawer = document.getElementById('compare-drawer');
    const count = document.getElementById('compare-count');
    if (list.length > 0) {
      drawer.classList.remove('hidden');
      count.textContent = list.length;
    } else {
      drawer.classList.add('hidden');
    }
  }
  window.addEventListener('storage', updateDrawer);
  setInterval(updateDrawer, 1000);
</script>`;

const pagesDir = 'src/pages/facilities';
if (!fs.existsSync(pagesDir)) fs.mkdirSync(pagesDir, {recursive: true});
fs.writeFileSync(path.join(pagesDir, '[slug].astro'), facilitySlugLogic, 'utf8');
fs.writeFileSync('src/components/CompareDrawer.astro', compareDrawerLogic, 'utf8');

console.log('✅ Logic restored: Facility Intelligence & Compare Drawer interaction.');
