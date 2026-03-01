const fs = require('fs');
const html = fs.readFileSync('agri.html', 'utf8');
const sm = html.match(/<script>([\s\S]*?)<\/script>/);
const js = sm[1];
const lines = js.split(/\r\n|\r|\n/);

// Write lines 100-176 to file
const out = [];
for (let i = 99; i <= 180; i++) {
    if (lines[i] !== undefined) {
        out.push('JS' + (i + 1) + '|' + lines[i]);
    }
}

fs.writeFileSync('diag_out2.txt', out.join('\n'), 'utf8');

// Also check: what's at line 175 exactly (before the function)
console.log('JS at 173:', JSON.stringify(lines[172]));
console.log('JS at 174:', JSON.stringify(lines[173]));
console.log('JS at 175:', JSON.stringify(lines[174]));
console.log('JS at 176:', JSON.stringify(lines[175]));
