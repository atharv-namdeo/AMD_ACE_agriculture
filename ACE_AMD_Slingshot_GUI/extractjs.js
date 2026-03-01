const fs = require('fs');
const html = fs.readFileSync('agri.html', 'utf8');
const sm = html.match(/<script>([\s\S]*?)<\/script>/);
// Write just the JS to a temp file for syntax checking
fs.writeFileSync('_temp_check.js', sm[1], 'utf8');
