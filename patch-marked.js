import fs from 'fs';
let code = fs.readFileSync('scripts/build-articles.js', 'utf8');

const imgOverride = `
renderer.image = function ({ href, title, text }) {
  const titleAttr = title ? \` title="\${title}"\` : '';
  const altAttr = text ? \` alt="\${text}"\` : '';
  return \`<figure><img src="\${href}"\${titleAttr}\${altAttr} loading="lazy" decoding="async" class="article-image" />\${text ? \`<figcaption>\${text}</figcaption>\` : ''}</figure>\`;
};
`;

if (!code.includes('renderer.image =')) {
  code = code.replace('marked.use({ renderer });', imgOverride + '\nmarked.use({ renderer });');
  fs.writeFileSync('scripts/build-articles.js', code, 'utf8');
  console.log("Patched build-articles.js");
}
