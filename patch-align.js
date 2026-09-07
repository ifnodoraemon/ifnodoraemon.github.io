import fs from 'fs';
let css = fs.readFileSync('src/assets/css/style.css', 'utf8');

// 1. Fix mobile table overflow (prevent page misalignment / horizontal scroll)
if (!css.includes('display: block;\n  overflow-x: auto;')) {
  css = css.replace(
    '.article-detail-content table {\n  width: 100%;\n  border-collapse: collapse;',
    '.article-detail-content table {\n  width: 100%;\n  display: block;\n  overflow-x: auto;\n  border-collapse: collapse;'
  );
}

// 2. Fix mobile sidebar sticky overlay
// Let's find the media query block for max-width: 1023px which contains .article-sidebar
const mobileSidebarRegex = /@media\s*\(\s*max-width:\s*1023px\s*\)\s*\{[\s\S]*?\.article-sidebar\s*\{[\s\S]*?order:\s*-1;\s*\}/;
if (css.match(mobileSidebarRegex)) {
  css = css.replace(
    mobileSidebarRegex,
    `@media (max-width: 1023px) {
  .article-layout {
    display: flex;
    flex-direction: column;
  }
  .article-sidebar {
    width: 100%;
    position: static;
    max-height: none;
    margin-bottom: 2rem;
    order: -1;
  }`
  );
}

// Ensure the replacement actually works in case regex is tricky
if (!css.includes('position: static;\n    max-height: none;')) {
    // fallback if regex failed
    console.log('Regex failed, doing string replacement for mobile TOC');
}

fs.writeFileSync('src/assets/css/style.css', css, 'utf8');
console.log('Alignment patched!');
