const fs = require('fs');

const html = fs.readFileSync('.stitch/designs/index.html', 'utf8');
const match = html.match(/tailwind\.config = ([\s\S]+?)<\/script>/);
let objStr = match[1].trim();

// Strip out the variable assignment to just get the object
if (objStr.endsWith(';')) objStr = objStr.slice(0, -1);

// We'll use a safer regex replacement to get the theme object since it has unquoted keys like darkMode, theme
// Actually, using new Function is fine if we wrap it properly.
const configObj = new Function('return ' + objStr)();

const extend = configObj.theme.extend;

let css = '\n@theme {\n';

if (extend.colors) {
  for (const [k, v] of Object.entries(extend.colors)) {
    css += `  --color-${k}: ${v};\n`;
  }
}

if (extend.spacing) {
  for (const [k, v] of Object.entries(extend.spacing)) {
    css += `  --spacing-${k}: ${v};\n`;
  }
}

if (extend.borderRadius) {
  for (const [k, v] of Object.entries(extend.borderRadius)) {
    css += `  --radius${k === 'DEFAULT' ? '' : '-' + k}: ${v};\n`;
  }
}

if (extend.fontFamily) {
  for (const [k, v] of Object.entries(extend.fontFamily)) {
    css += `  --font-${k}: ${v.map(f => '"' + f + '"').join(', ')};\n`;
  }
}

if (extend.fontSize) {
  for (const [k, v] of Object.entries(extend.fontSize)) {
    css += `  --text-${k}: ${v[0]};\n`;
    if (v[1]) {
      if (v[1].lineHeight) css += `  --text-${k}--line-height: ${v[1].lineHeight};\n`;
      if (v[1].letterSpacing) css += `  --text-${k}--letter-spacing: ${v[1].letterSpacing};\n`;
      if (v[1].fontWeight) css += `  --text-${k}--font-weight: ${v[1].fontWeight};\n`;
    }
  }
}

css += '}\n';

const globalsPath = 'src/app/globals.css';
let globals = fs.readFileSync(globalsPath, 'utf8');

// Replace or insert
if (globals.includes('@theme {')) {
    // Already has one, replace it
    globals = globals.replace(/@theme \{[\s\S]+?\}/, css);
} else {
    globals = globals.replace('@theme inline {', css + '\n@theme inline {');
}

fs.writeFileSync(globalsPath, globals);
console.log('CSS updated successfully.');
