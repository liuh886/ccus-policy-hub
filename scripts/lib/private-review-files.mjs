import fs from 'node:fs';
import path from 'node:path';

function futureRealPath(value) {
  let parent = path.resolve(value);
  const tail = [];
  while (!fs.existsSync(parent)) {
    tail.unshift(path.basename(parent));
    parent = path.dirname(parent);
  }
  return path.join(fs.realpathSync(parent), ...tail);
}

export function writePrivateReviewFiles(repository, output, files) {
  const allowed = path.join(
    fs.realpathSync(repository),
    '.codex/private-extraction'
  );
  const target = futureRealPath(output);
  if (target !== allowed && !target.startsWith(allowed + path.sep))
    throw new Error(
      'Private review output must stay under .codex/private-extraction, outside publication inputs.'
    );
  for (const name of files.keys())
    if (!/^[a-z0-9][a-z0-9.-]*\.(json|md)$/.test(name))
      throw new Error('Private review output must use fixed flat filenames.');
  fs.mkdirSync(target, { recursive: true });
  for (const name of ['.gitignore', ...files.keys()]) {
    const file = path.join(target, name);
    if (fs.existsSync(file) && fs.lstatSync(file).isSymbolicLink())
      throw new Error('Private output files must not be symbolic links.');
  }
  fs.writeFileSync(path.join(target, '.gitignore'), '*\n');
  for (const [name, value] of files)
    fs.writeFileSync(path.join(target, name), value);
  return target;
}
