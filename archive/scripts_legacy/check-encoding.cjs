const fs = require('fs');
const path = require('path');

const dirs = ['src/content', 'src/data'];

console.log('--- Encoding Security Check ---');

function walk(dir) {
  fs.readdirSync(dir).forEach(file => {
    const fullPath = path.join(dir, file);
    if (fs.lstatSync(fullPath).isDirectory()) {
      walk(fullPath);
    } else if (file.endsWith('.md') || file.endsWith('.json')) {
      const buffer = fs.readFileSync(fullPath);
      // 检查是否包含 UTF-16 BOM 或 null bytes (通常是 UTF-16)
      if (buffer[0] === 0xff && buffer[1] === 0xfe) {
        console.error(`❌ FATAL: UTF-16 LE detected in ${fullPath}`);
      } else if (buffer.includes(0x00)) {
        console.error(`❌ FATAL: Binary/Null bytes detected in ${fullPath}`);
      }
    }
  });
}

dirs.forEach(walk);
console.log('--- Encoding Check Done ---');
