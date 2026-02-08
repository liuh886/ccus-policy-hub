import fs from 'fs';
import path from 'path';

const directories = ['./src/data', './src/content', './src/pages', './src/components'];
const garbledPatterns = /[鈼鉁馃馃棏锔]/; // Common Mojibake characters

function walkDir(dir, callback) {
  fs.readdirSync(dir).forEach(f => {
    let dirPath = path.join(dir, f);
    let isDirectory = fs.statSync(dirPath).isDirectory();
    isDirectory ? walkDir(dirPath, callback) : callback(dirPath);
  });
}

console.log('--- GLOBAL ENCODING AUDIT ---');
let infectedFiles = [];

directories.forEach(dir => {
  if (!fs.existsSync(dir)) return;
  walkDir(dir, (filePath) => {
    if (filePath.endsWith('.json') || filePath.endsWith('.md') || filePath.endsWith('.astro')) {
      const content = fs.readFileSync(filePath, 'utf-8');
      if (garbledPatterns.test(content)) {
        infectedFiles.push(filePath);
      }
    }
  });
});

if (infectedFiles.length > 0) {
  console.log(`[!] Found ${infectedFiles.length} files with suspected encoding issues:`);
  infectedFiles.forEach(f => console.log(` - ${f}`));
} else {
  console.log('✅ No Mojibake patterns detected in key directories.');
}
