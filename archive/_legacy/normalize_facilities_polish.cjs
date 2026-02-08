const fs = require('fs');
const path = require('path');

const ZH_DIR = './src/content/facilities/zh';

const zhMap = {
  'Denmark': '丹麦',
  'New Zealand': '新西兰',
  'Papua New Guinea': '巴布亚新几内亚'
};

function normalize(dir, map) {
  if (!fs.existsSync(dir)) return;
  const files = fs.readdirSync(dir);
  files.forEach(file => {
    if (!file.endsWith('.md')) return;
    const filePath = path.join(dir, file);
    let content = fs.readFileSync(filePath, 'utf8');
    const lines = content.split('\n');
    let changed = false;
    const newLines = lines.map(line => {
      if (line.trim().startsWith('country:')) {
        const current = line.replace('country:', '').trim().replace(/['"]/g, '');
        if (map[current]) {
          changed = true;
          return `country: "${map[current]}"`;
        }
      }
      return line;
    });
    if (changed) {
      fs.writeFileSync(filePath, newLines.join('\n'), 'utf8');
    }
  });
}

normalize(ZH_DIR, zhMap);
console.log('Final Polish Complete.');