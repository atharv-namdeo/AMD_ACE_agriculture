const fs = require('fs');
const html = fs.readFileSync('agri.html', 'utf8');
const sm = html.match(/<script>([\s\S]*?)<\/script>/);
if (!sm) { console.log('NO SCRIPT TAG FOUND'); process.exit(1); }

const js = sm[1];
const lines = js.split(/\r\n|\r|\n/);
console.log('Total JS lines:', lines.length);

// Binary search for first syntax error
let lo = 1, hi = lines.length;
while (lo < hi) {
  const mid = Math.floor((lo + hi) / 2);
  try { new Function(lines.slice(0, mid).join('\n')); lo = mid + 1; }
  catch (e) { hi = mid; }
}

console.log('\n=== FIRST ERROR AT JS LINE:', lo, '===');
for (let i = Math.max(0, lo - 6); i <= Math.min(lines.length - 1, lo + 3); i++) {
  const marker = (i + 1 === lo) ? ' <--- ERROR' : '';
  process.stdout.write('JS' + (i + 1) + '[len=' + lines[i].length + ']:' + marker + '\n');
  process.stdout.write('  ' + lines[i].substring(0, 200) + '\n');
}

// Brace balance at error point
let o = 0, c = 0, inStr = false, strChar = '';
for (let i = 0; i < lo - 1; i++) {
  for (let j = 0; j < lines[i].length; j++) {
    const ch = lines[i][j];
    if (!inStr && (ch === '"' || ch === "'" || ch === '`')) { inStr = true; strChar = ch; }
    else if (inStr && ch === strChar && lines[i][j-1] !== '\\') { inStr = false; }
    else if (!inStr) {
      if (ch === '{') o++;
      if (ch === '}') c++;
    }
  }
}
console.log('\nBrace balance before error: { opened=' + o + ', } closed=' + c + ', unclosed=' + (o - c));

// Find HTML line number
const scriptStart = html.indexOf('<script>');
const htmlLinesBefore = html.substring(0, scriptStart).split(/\r\n|\r|\n/).length;
console.log('Approx HTML line:', htmlLinesBefore + lo);
