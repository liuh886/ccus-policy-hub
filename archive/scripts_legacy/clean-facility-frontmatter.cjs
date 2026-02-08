const fs = require('fs');
const path = require('path');

function cleanFile(filePath) {
    let content = fs.readFileSync(filePath, 'utf-8');
    if (!content.startsWith('---')) return;
    
    let endFm = content.indexOf('---', 3);
    if (endFm === -1) return;
    
    let fm = content.substring(3, endFm);
    let body = content.substring(endFm + 3);
    
    let lines = fm.split(/\r?\n/);
    let seen = new Set();
    let newLines = [];
    
    for (let line of lines) {
        let keyMatch = line.match(/^([a-z0-9_]+):/i);
        if (keyMatch) {
            let key = keyMatch[1];
            if (seen.has(key)) continue;
            seen.add(key);
        }
        newLines.push(line);
    }
    
    let newContent = '---' + newLines.join('\n') + '---' + body;
    fs.writeFileSync(filePath, newContent, 'utf-8');
}

const dirs = ['src/content/facilities/zh', 'src/content/facilities/en'];
dirs.forEach(d => {
    if (!fs.existsSync(d)) return;
    fs.readdirSync(d).forEach(f => {
        if (f.endsWith('.md')) cleanFile(path.join(d, f));
    });
});
console.log('Cleanup Done.');