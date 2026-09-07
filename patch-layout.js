import fs from 'fs';
let css = fs.readFileSync('src/assets/css/style.css', 'utf8');

// Fix scroll-margin-top for anchor links under fixed navbar
if (!css.includes('scroll-margin-top: 90px;')) {
  css += '\nh1, h2, h3, h4, h5, h6 { scroll-margin-top: 90px; }\n';
}

// Fix blockquote text visibility (faint is too dark)
css = css.replace(
  'color: var(--text-faint);',
  'color: var(--text-muted);'
);

// Add a glowing border to blockquote for the Oceanic theme
css = css.replace(
  'border-left: 3px solid var(--accent);',
  'border-left: 3px solid var(--accent);\n  box-shadow: -3px 0 15px var(--accent-glow);'
);

// Add better styling to figures (images)
css = css.replace(
  'border-radius: 8px;',
  'border-radius: 12px;\n  box-shadow: 0 10px 30px rgba(0,0,0,0.5);\n  border: 1px solid var(--border);'
);

// Beautify list markers
if (!css.includes('.article-detail-content li::marker')) {
  css += `
.article-detail-content li::marker {
  color: var(--accent);
}
`;
}

// Adjust sidebar TOC slightly so it aligns perfectly with text
css = css.replace(
  'top: 100px;',
  'top: 110px;'
);

fs.writeFileSync('src/assets/css/style.css', css, 'utf8');
console.log('Layout patched!');
