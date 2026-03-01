const fs = require('fs');
const html = fs.readFileSync('agri.html', 'utf8');
const sm = html.match(/<script>([\s\S]*?)<\/script>/);
const js = sm[1];
const lines = js.split(/\r\n|\r|\n/);

// Print first 15 lines with full content
for (let i = 0; i < 15; i++) {
    fs.appendFileSync('earlylines.txt', 'JS' + (i + 1) + '[' + lines[i].length + ']: ' + lines[i] + '\n---\n');
}

// Also find the HTML line of <script>
const scriptIdx = html.indexOf('<script>');
const before = html.substring(0, scriptIdx);
console.log('Script tag at HTML line:', before.split(/\r\n|\r|\n/).length);
console.log('JS line 1:', JSON.stringify(lines[0].substring(0, 200)));
console.log('JS line 2:', JSON.stringify(lines[1].substring(0, 200)));
console.log('JS line 3:', JSON.stringify(lines[2].substring(0, 200)));
