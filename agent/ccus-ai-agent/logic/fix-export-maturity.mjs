import fs from 'fs';

const MANAGE_PATH = 'agent/ccus-ai-agent/logic/manage.mjs';
let content = fs.readFileSync(MANAGE_PATH, 'utf8');

// Use a more robust regex to insert maturity into the export template
const target = 'strategicTargets: {';
const replacement = `maturity: {
          x: c.maturity_x || 0,
          y: c.maturity_y || 0
        },
        strategicTargets: {`;

if (!content.includes('maturity: {')) {
  content = content.replace(target, replacement);
  fs.writeFileSync(MANAGE_PATH, content);
  console.log("Fixed manage.mjs export template.");
} else {
  console.log("Export template already contains maturity.");
}
