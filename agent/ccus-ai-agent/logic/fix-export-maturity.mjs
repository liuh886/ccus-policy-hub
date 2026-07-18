import fs from 'fs';

const managePath = 'agent/ccus-ai-agent/logic/manage.mjs';
const content = fs.readFileSync(managePath, 'utf8');

if (!content.includes('maturity: {')) {
  throw new Error(
    'Legacy maturity export is missing. Keep it temporarily until country exports migrate to governanceDeployment.'
  );
}

console.warn(
  'fix-export-maturity.mjs is deprecated. New code uses deployment_capacity_mtpa and governance_capability_index.'
);
