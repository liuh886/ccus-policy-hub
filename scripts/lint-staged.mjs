import { execFileSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, '..');

function resolveBin(name) {
  if (name === 'prettier') {
    return path.join(
      ROOT_DIR,
      'node_modules',
      'prettier',
      'bin',
      'prettier.cjs'
    );
  }
  if (name === 'eslint') {
    return path.join(ROOT_DIR, 'node_modules', 'eslint', 'bin', 'eslint.js');
  }
  throw new Error(`Unsupported tool: ${name}`);
}

function getStagedFiles() {
  const output = execFileSync(
    'git',
    ['diff', '--cached', '--name-only', '--diff-filter=ACMR'],
    {
      encoding: 'utf8',
    }
  );

  return output
    .split(/\r?\n/)
    .map((file) => file.trim())
    .filter(Boolean);
}

function runCommand(tool, args, files) {
  if (files.length === 0) return;
  const binPath = resolveBin(tool);
  const finalArgs = [...args, ...files];

  execFileSync(process.execPath, [binPath, ...finalArgs], {
    stdio: 'inherit',
  });
}

const stagedFiles = getStagedFiles();

if (stagedFiles.length === 0) {
  process.exit(0);
}

const prettierFiles = stagedFiles.filter((file) =>
  /\.(astro|css|js|json|md|mjs|ts|tsx|yml|yaml)$/i.test(file)
);

const eslintFiles = stagedFiles.filter((file) =>
  /\.(astro|js|mjs|ts|tsx)$/i.test(file)
);

runCommand('prettier', ['--check'], prettierFiles);
runCommand('eslint', [], eslintFiles);
