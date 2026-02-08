const fs = require('fs');
const content = fs.readFileSync('scripts/reconstruct-all-content.cjs', 'utf16le'); // PowerShell 默认可能是 utf16
// 如果 utf16 读出来不对，尝试直接清理字节
fs.writeFileSync('scripts/reconstruct-all-content.cjs', content.replace(/^\uFEFF/, ''), 'utf8');
