const fs = require('fs');
const html = fs.readFileSync('agri.html', 'utf8');
const sm = html.match(/<script>([\s\S]*?)<\/script>/);
const js = sm[1];
const lines = js.split(/\r\n|\r|\n/);

// Check for unclosed template literals / strings up to the error line
// Simple state machine
let state = 'normal'; // normal, singleQ, doubleQ, template, lineComment
let templateDepth = 0;
let problemLine = -1;

for (let i = 0; i < 180; i++) {
    const line = lines[i];
    let j = 0;

    // Handle line comments: if state is normal and we hit //, skip rest of line
    while (j < line.length) {
        const ch = line[j];
        const next = line[j + 1];

        if (state === 'lineComment') {
            // Line comment ends at end of line
            j = line.length;
            state = 'normal';
            break;
        }

        if (state === 'normal') {
            if (ch === '/' && next === '/') { state = 'lineComment'; break; }
            if (ch === '`') { state = 'template'; templateDepth++; }
            else if (ch === '"') { state = 'doubleQ'; }
            else if (ch === "'") { state = 'singleQ'; }
        } else if (state === 'template') {
            if (ch === '\\') { j++; } // skip escaped char
            else if (ch === '`') { templateDepth--; state = 'normal'; }
        } else if (state === 'doubleQ') {
            if (ch === '\\') { j++; }
            else if (ch === '"') { state = 'normal'; }
        } else if (state === 'singleQ') {
            if (ch === '\\') { j++; }
            else if (ch === "'") { state = 'normal'; }
        }
        j++;
    }

    if (state !== 'normal' && state !== 'lineComment') {
        if (problemLine === -1) problemLine = i + 1;
        fs.appendFileSync('string_state.txt', 'JS' + (i + 1) + ': state=' + state + ' | ' + line.substring(0, 100) + '\n');
    }
}

fs.writeFileSync('string_state.txt', '');
// Re-run to get output
let f = '';
state = 'normal';
for (let i = 0; i < 180; i++) {
    const line = lines[i];
    let j = 0;
    while (j < line.length) {
        const ch = line[j];
        const next = line[j + 1];
        if (state === 'lineComment') { state = 'normal'; break; }
        if (state === 'normal') {
            if (ch === '/' && next === '/') { state = 'lineComment'; break; }
            if (ch === '`') { state = 'template'; }
            else if (ch === '"') { state = 'doubleQ'; }
            else if (ch === "'") { state = 'singleQ'; }
        } else if (state === 'template') {
            if (ch === '\\') { j++; }
            else if (ch === '`') { state = 'normal'; }
        } else if (state === 'doubleQ') {
            if (ch === '\\') { j++; }
            else if (ch === '"') { state = 'normal'; }
        } else if (state === 'singleQ') {
            if (ch === '\\') { j++; }
            else if (ch === "'") { state = 'normal'; }
        }
        j++;
    }
    if (state !== 'normal') {
        f += 'UNCLOSED at JS' + (i + 1) + ': state=' + state + ' | ' + line.substring(0, 120) + '\n';
    }
}
fs.writeFileSync('string_state.txt', f || 'All strings closed OK at line 180\n');
console.log(f || 'All strings closed OK at line 180');
