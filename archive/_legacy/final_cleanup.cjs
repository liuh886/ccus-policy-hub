const fs = require('fs');
const path = require('path');

const dir = './src/content/policies/zh';
const files = fs.readdirSync(dir);

files.forEach(file => {
  if (file.endsWith('.md')) {
    const filePath = path.join(dir, file);
    let content = fs.readFileSync(filePath, 'utf-8');
    
    // 移除文件名和标题中的占位符
    if (content.includes('(中文版)')) {
      content = content.replace(/\(中文版\)/g, '');
      fs.writeFileSync(filePath, content, 'utf-8');
      console.log(`Cleaned: ${file}`);
    }
  }
});

console.log('Final Cleanup Complete.');
