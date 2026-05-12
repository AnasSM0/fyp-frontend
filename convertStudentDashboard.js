const fs = require('fs');
const path = require('path');

const html = fs.readFileSync('.stitch/designs/dashboard-student.html', 'utf8');

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

// Fix self closing input tags
content = content.replace(/<input([^>]+[^\/])>/g, '<input$1 />');

// Fix style
content = content.replace(/style="font-variation-settings: 'FILL' 1;"/g, "style={{fontVariationSettings: \"'FILL' 1\"}}");

// Some SVG or other things might need fixes
content = content.replace(/stroke-width=/g, 'strokeWidth=');
content = content.replace(/stroke-linecap=/g, 'strokeLinecap=');
content = content.replace(/stroke-linejoin=/g, 'strokeLinejoin=');

// Also fix `viewBox`
content = content.replace(/viewbox=/g, 'viewBox=');

// Replace HTML comments
content = content.replace(/<!--(.*?)-->/gs, '{/* $1 */}');

const pageTsx = `
import Image from "next/image";

export default function StudentDashboard() {
  return (
    <>
      ${content}
    </>
  );
}
`;

fs.mkdirSync('src/app/dashboard/student', { recursive: true });
fs.writeFileSync('src/app/dashboard/student/page.tsx', pageTsx.trim());
console.log('src/app/dashboard/student/page.tsx updated successfully');
