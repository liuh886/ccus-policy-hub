import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const SUPPORTED_COMMANDS = [
  'db:init',
  'db:import:i18n',
  'db:standardize',
  'db:standardize:region-zh',
  'db:standardize:policy-source',
  'db:geocode:facilities',
  'db:govern:facility-coordinates',
  'db:seed:countries',
  'db:sync:country-profiles',
  'db:fix-relationships',
  'db:audit:deep',
  'db:dict:lint',
  'db:export:i18n',
  'db:export:md',
  'db:export:schema-enums',
  'db:compute:maturity',
  'db:stats',
  'db:peek',
  'db:peek:raw',
  'db:pipeline',
  'db:clean',
];

function printHelp() {
  console.log('CCUS Policy Hub maintenance commands:');
  for (const command of SUPPORTED_COMMANDS) {
    console.log(`  ${command}`);
  }
  console.log('');
  console.log('High-risk migration and recovery operations use explicit package scripts.');
}

const args = process.argv.slice(2);
const command = args[0];

if (!command || command === '--help' || command === 'help') {
  printHelp();
  process.exit(0);
}

if (!SUPPORTED_COMMANDS.includes(command)) {
  console.error(`Unknown or non-canonical maintenance command: ${command}`);
  console.error('Run `pnpm manage:help` to list supported commands.');
  process.exit(3);
}

const managePath = fileURLToPath(new URL('./manage.mjs', import.meta.url));
const result = spawnSync(process.execPath, [managePath, ...args], {
  stdio: 'inherit',
});

if (result.error) {
  console.error(result.error.message);
  process.exit(1);
}

process.exit(result.status ?? 1);
