import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const distDir = path.join(ROOT, 'dist');

function getHtmlFiles(dir) {
  let results = [];
  const list = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of list) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      results = results.concat(getHtmlFiles(fullPath));
    } else if (entry.name.endsWith('.html')) {
      results.push(fullPath);
    }
  }
  return results;
}

const htmlFiles = getHtmlFiles(distDir);
console.log(`Auditing ${htmlFiles.length} HTML files in dist/ for Markdown & KaTeX rendering defects...\n`);

const issues = [];

for (const file of htmlFiles) {
  const relPath = path.relative(ROOT, file);
  const content = fs.readFileSync(file, 'utf-8');

  // Strip scripts, styles, pre blocks, textarea blocks, button labels
  const clean = content
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<style[\s\S]*?<\/style>/gi, '')
    .replace(/<pre[\s\S]*?<\/pre>/gi, '')
    .replace(/<textarea[\s\S]*?<\/textarea>/gi, '')
    .replace(/<button[\s\S]*?<\/button>/gi, '');

  // 1. Check for raw code blocks (```)
  const codeFences = clean.match(/```/g);
  if (codeFences) {
    issues.push({ file: relPath, type: 'Raw Code Fence (```)', detail: `${codeFences.length} instances` });
  }

  // 2. Check for raw markdown headers in paragraph or text
  const rawHeaders = clean.match(/<p>\s*#{1,6}\s+[^<]+/g);
  if (rawHeaders) {
    issues.push({ file: relPath, type: 'Unparsed Markdown Header (##...)', detail: rawHeaders.slice(0, 3).join(', ') });
  }

  // 3. Check for raw markdown table separators
  const rawTables = clean.match(/\|\s*[-:]{3,}\s*\|\s*[-:]{3,}\s*\|/g);
  if (rawTables) {
    issues.push({ file: relPath, type: 'Unparsed Markdown Table', detail: rawTables.slice(0, 2).join(', ') });
  }

  // 4. Check for raw markdown links: [text](url) outside attributes
  const rawLinks = clean.match(/<p>[^<]*\[[^\]\n]+\]\((?:https?:\/\/|\/|#)[^\)\n]+\)[^<]*<\/p>/g);
  if (rawLinks) {
    issues.push({ file: relPath, type: 'Unparsed Markdown Link', detail: rawLinks.slice(0, 2).join(', ') });
  }

  // 5. Check for raw block math $$...$$
  const rawBlockMath = clean.match(/\$\$[\s\S]+?\$\$/g);
  if (rawBlockMath) {
    issues.push({ file: relPath, type: 'Unparsed Block Math ($$...$$)', detail: rawBlockMath.slice(0, 2).map(s => s.slice(0, 40)).join('; ') });
  }

  // 6. Check for unparsed inline math: $formula$ where formula looks like math and not currency
  // Match $x$ or $\text{...}$ or $\frac...$ or $\alpha$ or $E = mc^2$
  const rawInlineMath = clean.match(/\$([a-zA-Z\\][^\$\n\r<]{1,80}?)\$/g);
  if (rawInlineMath) {
    // Filter out apparent currency like $10, $500, etc.
    const trueMath = rawInlineMath.filter(m => {
      const inner = m.slice(1, -1);
      if (/^\d/.test(inner)) return false;
      if (inner.includes('class=')) return false;
      return true;
    });
    if (trueMath.length > 0) {
      issues.push({ file: relPath, type: 'Unparsed Inline Math ($...$)', detail: trueMath.slice(0, 5).join(', ') });
    }
  }

  // 7. Check for KaTeX errors
  const katexErrors = clean.match(/class="[^"]*katex-error[^"]*"/g);
  if (katexErrors) {
    issues.push({ file: relPath, type: 'KaTeX Render Error', detail: `${katexErrors.length} errors` });
  }

  // 8. Check for raw markdown blockquotes leaking (> text)
  const rawQuotes = clean.match(/<p>&gt;\s+[^<]+<\/p>/g);
  if (rawQuotes) {
    issues.push({ file: relPath, type: 'Unparsed Blockquote (> ...)', detail: rawQuotes.slice(0, 2).join(', ') });
  }

  // 9. Check for unclosed HTML tags or broken entity leaks like &amp;lt;
  const brokenEntities = clean.match(/&amp;(?:lt|gt|amp|quot);/g);
  if (brokenEntities) {
    issues.push({ file: relPath, type: 'Double-Escaped Entity', detail: `${brokenEntities.length} instances` });
  }

  // 10. Check for unparsed markdown strong (**text**) leaking into HTML
  const cleanWithoutCode = clean.replace(/<code[\s\S]*?<\/code>/gi, '');
  const rawBold = cleanWithoutCode.match(/([^\n<]{0,40}\*\*[^\n<]{1,60}\*\*[^\n<]{0,40})/g);
  if (rawBold) {
    issues.push({ file: relPath, type: 'Unparsed Markdown Bold (**...**)', detail: rawBold.slice(0, 3).map(s => s.trim()).join('; ') });
  }
}

console.log(`Audit complete. Found ${issues.length} potential issues:\n`);
for (const issue of issues) {
  console.log(`❌ [${issue.type}] in ${issue.file}`);
  console.log(`   Details: ${issue.detail}\n`);
}

if (issues.length > 0) {
  process.exit(1);
}
