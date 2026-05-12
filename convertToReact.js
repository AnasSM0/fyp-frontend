const fs = require('fs');

const html = fs.readFileSync('.stitch/designs/index.html', 'utf8');

// Extract everything inside <body> and </body>
const bodyMatch = html.match(/<body[^>]*>([\s\S]*?)<\/body>/);
if (!bodyMatch) {
  console.error("No body found");
  process.exit(1);
}

let content = bodyMatch[1];

// Convert class to className
content = content.replace(/class=/g, 'className=');

// Fix self closing img tags
content = content.replace(/<img([^>]+[^\/])>/g, '<img$1 />');

// Fix style
content = content.replace(/style="font-variation-settings: 'FILL' 1;"/g, "style={{fontVariationSettings: \"'FILL' 1\"}}");

// Some SVG or other things might need fixes, but standard generated HTML from Stitch is simple.
// We also need to fix `stroke-width` if it exists, etc. Let's do a simple replace:
content = content.replace(/stroke-width=/g, 'strokeWidth=');
content = content.replace(/stroke-linecap=/g, 'strokeLinecap=');
content = content.replace(/stroke-linejoin=/g, 'strokeLinejoin=');

const pageTsx = `
import Image from "next/image";

export default function Home() {
  return (
    <>
      ${content}
    </>
  );
}
`;

fs.writeFileSync('src/app/page.tsx', pageTsx.trim());
console.log('page.tsx updated successfully');
