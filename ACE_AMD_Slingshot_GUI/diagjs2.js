const fs = require('fs');
const html = fs.readFileSync('agri.html', 'utf8');
const sm = html.match(/<script>([\s\S]*?)<\/script>/);
const js = sm[1];
const lines = js.split(/\r\n|\r|\n/);

// Write the context around JS line 176 to a separate file
const context = [];
for (let i = 165; i <= 200; i++) {
    if (lines[i]) {
        context.push('JS' + (i + 1) + '|' + lines[i]);
    }
}

fs.writeFileSync('diag_out.txt', context.join('\n'), 'utf8');
console.log('Written to diag_out.txt');
