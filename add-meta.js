import fs from 'fs';

const files = [
  'src/templates/article.html',
  'src/templates/pages/404.html',
  'src/templates/pages/about.html',
  'src/templates/pages/projects.html',
  'src/templates/pages/index.html',
  'src/templates/pages/models.html'
];

const metaTag = '  <meta name="google-site-verification" content="OOjVKBvpXj_qIa2QHCWvYdRPa5WnY7IY8rnls3Hc76Y" />\n';

for (const file of files) {
  let content = fs.readFileSync(file, 'utf-8');
  if (!content.includes('google-site-verification')) {
    content = content.replace('<head>\n', '<head>\n' + metaTag);
    fs.writeFileSync(file, content, 'utf-8');
    console.log(`Updated ${file}`);
  }
}
