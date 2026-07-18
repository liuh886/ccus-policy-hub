import fs from 'fs';

const replaceOnce = (content, oldValue, newValue, path) => {
  if (!content.includes(oldValue)) {
    throw new Error(`Missing expected text in ${path}: ${oldValue.slice(0, 100)}`);
  }
  return content.replace(oldValue, newValue);
};

const pageSpecs = [
  {
    path: 'src/pages/compare/index.astro',
    headingOld: 'Governance Benchmarking',
    headingNew: 'Governance Capability Profile',
    titleOld: '国家治理体系对标',
    titleNew: '治理能力画像',
    subtitleOld: 'Multi-Country Aggregate Analysis (Peak Strength)',
    subtitleNew: 'Peak Policy Strength · 所选国家现行政策体系',
    matrixOld: '全球治理成熟度矩阵 Maturity Matrix',
    matrixNew: '治理—部署矩阵 Governance–Deployment Matrix',
    quadrants: [
      ['Top-Left: Policy First', '左上：制度先行 Policy-led'],
      ['Top-Right: Leaders', '右上：协同领先 Integrated leaders'],
      ['Bot-Left: Early Stage', '左下：基础培育 Foundation building'],
      ['Bot-Right: Project Led', '右下：工程先行 Deployment-led'],
    ],
    scope: `
            <div class="mb-7 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white/70 px-4 py-3 dark:border-slate-800 dark:bg-slate-950/30">
              <div>
                <div class="text-[10px] font-black uppercase tracking-widest text-slate-500">分析范围</div>
                <div class="mt-1 text-xs text-slate-500">默认比较所选政策所属国家的全部现行政策体系。</div>
              </div>
              <select id="analysis-scope" class="min-w-44 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200">
                <option value="system">国家现行政策体系</option>
                <option value="selected">仅所选政策</option>
              </select>
            </div>
`,
    benchmark: `
            <p class="mt-4 text-[10px] leading-relaxed text-slate-500 dark:text-slate-400">
              全球基准：治理能力指数中位数 <strong data-governance-benchmark>—</strong>；有已承诺项目国家的项目记录规模中位数 <strong data-deployment-benchmark>—</strong>。治理指数为五个峰值维度的平均值。
            </p>
`,
    script: `<script>
  import { initGovernanceComparison } from '../../lib/governanceComparisonClient.mjs';

  function initComparePage() {
    initGovernanceComparison('zh');
  }

  document.addEventListener('astro:page-load', initComparePage);
  if (document.readyState === 'complete') initComparePage();
  else window.addEventListener('load', initComparePage, { once: true });
</script>`,
  },
  {
    path: 'src/pages/en/compare/index.astro',
    headingOld: 'Governance Benchmarking',
    headingNew: 'Governance Capability Profile',
    titleOld: 'System Peak Strength',
    titleNew: 'Governance Capability Profile',
    subtitleOld: 'Multi-Country Aggregate Analysis (Peak Capability)',
    subtitleNew: 'Peak Policy Strength · Active national policy systems',
    matrixOld: 'Global Governance Maturity Matrix',
    matrixNew: 'Governance–Deployment Matrix',
    quadrants: [
      ['Top-Left: Policy First', 'Top-left: Policy-led'],
      ['Top-Right: Leaders', 'Top-right: Integrated leaders'],
      ['Bottom-Left: Early Stage', 'Bottom-left: Foundation building'],
      ['Bottom-Right: Project Led', 'Bottom-right: Deployment-led'],
    ],
    scope: `
            <div class="mb-7 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white/70 px-4 py-3 dark:border-slate-800 dark:bg-slate-950/30">
              <div>
                <div class="text-[10px] font-black uppercase tracking-widest text-slate-500">Analysis scope</div>
                <div class="mt-1 text-xs text-slate-500">The default view benchmarks the active national policy system behind the selected policies.</div>
              </div>
              <select id="analysis-scope" class="min-w-44 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200">
                <option value="system">Active national policy system</option>
                <option value="selected">Selected policies only</option>
              </select>
            </div>
`,
    benchmark: `
            <p class="mt-4 text-[10px] leading-relaxed text-slate-500 dark:text-slate-400">
              Global benchmark: median governance capability <strong data-governance-benchmark>—</strong>; median committed project-record scale among countries with committed projects <strong data-deployment-benchmark>—</strong>. The governance index is the mean of five peak dimensions.
            </p>
`,
    script: `<script>
  import { initGovernanceComparison } from '../../../lib/governanceComparisonClient.mjs';

  function initComparePage() {
    initGovernanceComparison('en');
  }

  document.addEventListener('astro:page-load', initComparePage);
  if (document.readyState === 'complete') initComparePage();
  else window.addEventListener('load', initComparePage, { once: true });
</script>`,
  },
];

for (const spec of pageSpecs) {
  let content = fs.readFileSync(spec.path, 'utf8');
  content = replaceOnce(content, spec.headingOld, spec.headingNew, spec.path);
  content = replaceOnce(content, spec.titleOld, spec.titleNew, spec.path);
  content = replaceOnce(content, spec.subtitleOld, spec.subtitleNew, spec.path);
  content = replaceOnce(content, spec.matrixOld, spec.matrixNew, spec.path);
  for (const [oldValue, newValue] of spec.quadrants) {
    content = replaceOnce(content, oldValue, newValue, spec.path);
  }
  content = replaceOnce(
    content,
    '          <div class="h-80 w-full mb-8">',
    `${spec.scope}\n          <div class="h-80 w-full mb-8">`,
    spec.path
  );
  content = replaceOnce(
    content,
    `            </div>\n          </div>\n\n          <!-- Facility Stats Comparison -->`,
    `            </div>\n${spec.benchmark}          </div>\n\n          <!-- Facility Stats Comparison -->`,
    spec.path
  );
  const scriptPattern = /<script>[\s\S]*?<\/script>\s*$/;
  if (!scriptPattern.test(content)) {
    throw new Error(`Missing terminal script in ${spec.path}`);
  }
  content = content.replace(scriptPattern, `${spec.script}\n`);
  fs.writeFileSync(spec.path, content);
}

const schemaPath = 'agent/ccus-ai-agent/db/schema.sql';
let schema = fs.readFileSync(schemaPath, 'utf8');
schema = replaceOnce(
  schema,
  '  storage_2050 TEXT,\n',
  `  storage_2050 TEXT,\n  deployment_capacity_mtpa REAL NOT NULL DEFAULT 0,\n  governance_capability_index REAL NOT NULL DEFAULT 0,\n`,
  schemaPath
);
fs.writeFileSync(schemaPath, schema);

const managePath = 'agent/ccus-ai-agent/logic/manage.mjs';
let manage = fs.readFileSync(managePath, 'utf8');
manage = replaceOnce(
  manage,
  `      case 'db:compute:maturity':\n        await dbComputeMaturity(SQL);\n        break;\n`,
  `      case 'db:compute:governance-deployment':\n        await dbComputeGovernanceDeployment(SQL);\n        break;\n      case 'db:compute:maturity':\n        console.warn('db:compute:maturity is deprecated; use db:compute:governance-deployment.');\n        await dbComputeGovernanceDeployment(SQL);\n        break;\n`,
  managePath
);
manage = replaceOnce(
  manage,
  `        maturity: {\n          x: c.maturity_x || 0,\n          y: c.maturity_y || 0,\n        },\n`,
  `        governanceDeployment: {\n          deploymentCapacityMtpa:\n            c.deployment_capacity_mtpa || c.maturity_x || 0,\n          governanceCapabilityIndex:\n            c.governance_capability_index || (c.maturity_y || 0) / 5,\n        },\n`,
  managePath
);
manage = replaceOnce(
  manage,
  `async function dbComputeMaturity(SQL) {\n  const { execSync } = await import('child_process');\n  execSync('node agent/ccus-ai-agent/logic/maturity-algo.mjs', {\n    stdio: 'inherit',\n  });\n}\n`,
  `async function dbComputeGovernanceDeployment(SQL) {\n  void SQL;\n  const { computeGovernanceDeployment } = await import(\n    './governance-deployment-algo.mjs'\n  );\n  await computeGovernanceDeployment();\n}\n`,
  managePath
);
manage = replaceOnce(
  manage,
  `  await run('db:compute:maturity', () => dbComputeMaturity(SQL));`,
  `  await run('db:compute:governance-deployment', () =>\n    dbComputeGovernanceDeployment(SQL)\n  );`,
  managePath
);
fs.writeFileSync(managePath, manage);

fs.writeFileSync(
  'agent/ccus-ai-agent/logic/maturity-algo.mjs',
  `import { computeGovernanceDeployment } from './governance-deployment-algo.mjs';\n\nconsole.warn('maturity-algo.mjs is deprecated; computing explicit governance–deployment metrics.');\ncomputeGovernanceDeployment().catch((error) => {\n  console.error(error);\n  process.exitCode = 1;\n});\n`
);
fs.writeFileSync(
  'agent/ccus-ai-agent/logic/fix-export-maturity.mjs',
  `import fs from 'fs';\n\nconst path = 'agent/ccus-ai-agent/logic/manage.mjs';\nconst content = fs.readFileSync(path, 'utf8');\nif (!content.includes('governanceDeployment: {')) {\n  throw new Error('manage.mjs is missing the governanceDeployment export contract.');\n}\nconsole.warn('fix-export-maturity.mjs is deprecated; governanceDeployment is already explicit.');\n`
);

const configPath = 'src/content/config.ts';
let config = fs.readFileSync(configPath, 'utf8');
config = replaceOnce(
  config,
  `  provenance: provenanceSchema.optional(),\n});\n\nconst countries_zh`,
  `  governanceDeployment: z\n    .object({\n      deploymentCapacityMtpa: z.number().min(0).default(0),\n      governanceCapabilityIndex: z.number().min(0).max(100).default(0),\n    })\n    .optional(),\n  maturity: z\n    .object({\n      x: z.number().min(0).default(0),\n      y: z.number().min(0).max(500).default(0),\n    })\n    .optional(),\n  provenance: provenanceSchema.optional(),\n});\n\nconst countries_zh`,
  configPath
);
fs.writeFileSync(configPath, config);

const packagePath = 'package.json';
const packageJson = JSON.parse(fs.readFileSync(packagePath, 'utf8'));
packageJson.scripts['manage:db:compute:governance-deployment'] =
  'node agent/ccus-ai-agent/logic/manage.mjs db:compute:governance-deployment';
packageJson.scripts['manage:db:compute:maturity'] =
  'node agent/ccus-ai-agent/logic/manage.mjs db:compute:maturity';
fs.writeFileSync(packagePath, `${JSON.stringify(packageJson, null, 2)}\n`);

const publicSchemaPath = 'public/data/schemas/country.schema.json';
const publicSchema = JSON.parse(fs.readFileSync(publicSchemaPath, 'utf8'));
publicSchema.properties.deployment_capacity_mtpa = {
  type: 'number',
  minimum: 0,
  description:
    'Committed project-record capacity for operational and under-construction facilities (Mtpa)',
};
publicSchema.properties.governance_capability_index = {
  type: 'number',
  minimum: 0,
  maximum: 100,
  description: 'Mean of the five peak governance-dimension scores',
};
fs.writeFileSync(publicSchemaPath, `${JSON.stringify(publicSchema, null, 2)}\n`);

console.log('Governance methodology refactor applied.');
